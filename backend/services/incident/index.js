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
  database:           process.env.DB_NAME     || 'db_incidents',
  waitForConnections: true,
  connectionLimit:    10,
});

const AUTH_URL  = process.env.AUTH_SERVICE_URL  || 'http://localhost:3001';
const NOTIF_URL = process.env.NOTIF_SERVICE_URL || 'http://localhost:3005';

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

const VALID_TYPES   = ['Accident', 'Travaux', 'Route fermee', 'Embouteillage'];
const VALID_STATUTS = ['Signale', 'En cours', 'Resolu'];

// ═══════════════════════════════════════════════════════════
//   ROUTES
// ═══════════════════════════════════════════════════════════

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'incident', timestamp: new Date().toISOString() });
});

// Statistiques des incidents
app.get('/incidents/stats', verifyToken, async (req, res) => {
  try {
    const [by_type] = await pool.execute(`
      SELECT type, COUNT(*) as count FROM incidents GROUP BY type ORDER BY count DESC
    `);
    const [by_status] = await pool.execute(`
      SELECT status, COUNT(*) as count FROM incidents GROUP BY status
    `);
    const [[{ total }]] = await pool.execute('SELECT COUNT(*) as total FROM incidents');
    const [[{ today }]] = await pool.execute(
      'SELECT COUNT(*) as today FROM incidents WHERE DATE(created_at) = CURDATE()'
    );
    res.json({ total, today, by_type, by_status });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Déclarer un incident
app.post('/incidents', verifyToken, async (req, res) => {
  const { type, description, latitude, longitude } = req.body;
  if (!type)
    return res.status(400).json({ error: 'type est requis' });
  if (!VALID_TYPES.includes(type))
    return res.status(400).json({ error: `Type invalide. Valeurs acceptées : ${VALID_TYPES.join(', ')}` });
  if (latitude != null && (latitude < -90 || latitude > 90))
    return res.status(400).json({ error: 'latitude invalide (entre -90 et 90)' });
  if (longitude != null && (longitude < -180 || longitude > 180))
    return res.status(400).json({ error: 'longitude invalide (entre -180 et 180)' });

  try {
    const [result] = await pool.execute(
      'INSERT INTO incidents (type, description, latitude, longitude, reported_by) VALUES (?, ?, ?, ?, ?)',
      [type, description?.trim() || '', latitude || null, longitude || null, req.user.id]
    );

    // Notifier tous les utilisateurs (best-effort)
    try {
      await axios.post(`${NOTIF_URL}/notifications/broadcast`, {
        message: `🚨 Nouvel incident [${type}] : ${description || 'Aucune description'}`,
        reported_by: req.user.id,
      }, { timeout: 3000 });
    } catch { /* le service de notification est optionnel */ }

    res.status(201).json({
      message: 'Incident déclaré avec succès',
      id: result.insertId,
      type,
      status: 'Signale',
    });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Consulter les incidents (avec filtres)
app.get('/incidents', verifyToken, async (req, res) => {
  try {
    const { type, status, from, to } = req.query;
    let query = 'SELECT * FROM incidents WHERE 1=1';
    const params = [];

    if (type   && VALID_TYPES.includes(type))   { query += ' AND type = ?';   params.push(type); }
    if (status && VALID_STATUTS.includes(status)) { query += ' AND status = ?'; params.push(status); }
    if (from)  { query += ' AND created_at >= ?'; params.push(from); }
    if (to)    { query += ' AND created_at <= ?'; params.push(to); }

    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Détail d'un incident
app.get('/incidents/:id', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM incidents WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Incident introuvable' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Modifier le statut d'un incident
app.patch('/incidents/:id/status', verifyToken, async (req, res) => {
  const { status } = req.body;
  if (!status)
    return res.status(400).json({ error: 'status est requis' });
  if (!VALID_STATUTS.includes(status))
    return res.status(400).json({ error: `Statut invalide. Valeurs : ${VALID_STATUTS.join(', ')}` });
  try {
    const [result] = await pool.execute(
      'UPDATE incidents SET status = ? WHERE id = ?',
      [status, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Incident introuvable' });
    res.json({ message: 'Statut mis à jour', status });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Supprimer un incident (ADMIN uniquement)
app.delete('/incidents/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM incidents WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Incident introuvable' });
    res.json({ message: 'Incident supprimé avec succès' });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`🚨 Incident Service: http://localhost:${PORT}`));
