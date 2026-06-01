require('dotenv').config();
const express = require('express');
const mysql   = require('mysql2/promise');
const axios   = require('axios');

const app = express();
app.use(express.json());

// ── CORS ──────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── Logging ───────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── MySQL Pool ────────────────────────────────────────────────
const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'db_traffic',
  waitForConnections: true,
  connectionLimit:    10,
});

const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

// ── Middleware Auth ───────────────────────────────────────────
async function verifyToken(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'Token manquant' });
  try {
    const { data } = await axios.get(`${AUTH_URL}/verify`, {
      headers: { authorization: auth },
      timeout: 3000,
    });
    req.user = data.user;
    next();
  } catch { res.status(401).json({ error: 'Token invalide ou expiré' }); }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN')
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  next();
}

// ── Calcul du niveau de densité ───────────────────────────────
function getLevel(density) {
  if (density < 20)  return 'Faible';
  if (density < 50)  return 'Moyen';
  return 'Eleve';
}

// ═══════════════════════════════════════════════════════════
//   ROUTES
// ═══════════════════════════════════════════════════════════

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'traffic', timestamp: new Date().toISOString() });
});

// Statistiques globales du trafic
app.get('/stats', verifyToken, async (req, res) => {
  try {
    const [[{ total_zones }]]    = await pool.execute('SELECT COUNT(*) as total_zones FROM zones');
    const [[{ total_measures }]] = await pool.execute('SELECT COUNT(*) as total_measures FROM traffic_measures');
    const [[{ congested }]]      = await pool.execute(`
      SELECT COUNT(DISTINCT zone_id) as congested
      FROM traffic_measures
      WHERE level = 'Eleve'
      AND measured_at >= NOW() - INTERVAL 1 HOUR
    `);
    const [by_level] = await pool.execute(`
      SELECT level, COUNT(*) as count
      FROM traffic_measures
      WHERE measured_at >= NOW() - INTERVAL 24 HOUR
      GROUP BY level
    `);
    res.json({ total_zones, total_measures, congested, by_level });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Créer une zone
app.post('/zones', verifyToken, async (req, res) => {
  const { name, lat_min, lat_max, lng_min, lng_max } = req.body;
  if (!name || lat_min == null || lat_max == null || lng_min == null || lng_max == null)
    return res.status(400).json({ error: 'Tous les champs sont requis : name, lat_min, lat_max, lng_min, lng_max' });
  if (lat_min >= lat_max)
    return res.status(400).json({ error: 'lat_min doit être inférieur à lat_max' });
  if (lng_min >= lng_max)
    return res.status(400).json({ error: 'lng_min doit être inférieur à lng_max' });
  try {
    const [result] = await pool.execute(
      'INSERT INTO zones (name, lat_min, lat_max, lng_min, lng_max) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), lat_min, lat_max, lng_min, lng_max]
    );
    res.status(201).json({ message: 'Zone créée avec succès', id: result.insertId });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Liste des zones
app.get('/zones', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM zones ORDER BY name ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Supprimer une zone (ADMIN uniquement)
app.delete('/zones/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM zones WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Zone introuvable' });
    res.json({ message: 'Zone supprimée avec succès' });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Mesurer la densité d'une zone
app.post('/zones/:id/measure', verifyToken, async (req, res) => {
  const { density } = req.body;
  if (density == null) return res.status(400).json({ error: 'density est requis' });
  const d = parseInt(density);
  if (isNaN(d) || d < 0)
    return res.status(400).json({ error: 'density doit être un entier positif' });
  if (d > 9999)
    return res.status(400).json({ error: 'density ne peut pas dépasser 9999' });
  try {
    const [z] = await pool.execute('SELECT id, name FROM zones WHERE id = ?', [req.params.id]);
    if (z.length === 0) return res.status(404).json({ error: 'Zone introuvable' });
    const level = getLevel(d);
    const [result] = await pool.execute(
      'INSERT INTO traffic_measures (zone_id, density, level) VALUES (?, ?, ?)',
      [req.params.id, d, level]
    );
    res.status(201).json({
      message: 'Mesure enregistrée',
      zone: z[0].name,
      density: d,
      level,
      id: result.insertId,
    });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Zones congestionnées (dernière mesure Eleve)
app.get('/zones/congested', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT z.id as zone_id, z.name, tm.density, tm.level, tm.measured_at
      FROM zones z
      JOIN traffic_measures tm ON tm.zone_id = z.id
      WHERE tm.level = 'Eleve'
      AND tm.measured_at = (
        SELECT MAX(t2.measured_at) FROM traffic_measures t2 WHERE t2.zone_id = z.id
      )
      ORDER BY tm.density DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Historique des mesures d'une zone
app.get('/zones/:id/measures', verifyToken, async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit) || 30);
    const [rows] = await pool.execute(
      'SELECT * FROM traffic_measures WHERE zone_id = ? ORDER BY measured_at DESC LIMIT ?',
      [req.params.id, limit]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Résumé zones avec dernière mesure
app.get('/zones/summary', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT z.id, z.name, z.lat_min, z.lat_max, z.lng_min, z.lng_max,
             tm.density, tm.level, tm.measured_at
      FROM zones z
      LEFT JOIN traffic_measures tm ON tm.zone_id = z.id
        AND tm.measured_at = (
          SELECT MAX(t2.measured_at) FROM traffic_measures t2 WHERE t2.zone_id = z.id
        )
      ORDER BY z.name ASC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`🚦 Traffic Service: http://localhost:${PORT}`));
