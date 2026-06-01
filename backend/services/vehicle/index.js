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
  database:           process.env.DB_NAME     || 'db_vehicles',
  waitForConnections: true,
  connectionLimit:    10,
});

const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

const VALID_TYPES = ['Voiture', 'Camion', 'Bus', 'Moto', 'Vélo', 'Utilitaire'];

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
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN')
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  next();
}

// ═══════════════════════════════════════════════════════════
//   ROUTES
// ═══════════════════════════════════════════════════════════

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'vehicle', timestamp: new Date().toISOString() });
});

// Statistiques (total véhicules, total positions GPS)
app.get('/stats', verifyToken, async (req, res) => {
  try {
    const [[{ total_vehicles }]] = await pool.execute('SELECT COUNT(*) as total_vehicles FROM vehicles');
    const [[{ total_positions }]] = await pool.execute('SELECT COUNT(*) as total_positions FROM gps_positions');
    const [[{ active_today }]] = await pool.execute(
      'SELECT COUNT(DISTINCT vehicle_id) as active_today FROM gps_positions WHERE DATE(recorded_at) = CURDATE()'
    );
    res.json({ total_vehicles, total_positions, active_today });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Ajouter un véhicule
app.post('/vehicles', verifyToken, async (req, res) => {
  const { plate, type, owner } = req.body;
  if (!plate || !type || !owner)
    return res.status(400).json({ error: 'plate, type et owner sont requis' });
  if (plate.trim().length < 3)
    return res.status(400).json({ error: 'La plaque doit contenir au moins 3 caractères' });
  try {
    const [result] = await pool.execute(
      'INSERT INTO vehicles (plate, type, owner) VALUES (?, ?, ?)',
      [plate.trim().toUpperCase(), type.trim(), owner.trim()]
    );
    res.status(201).json({ message: 'Véhicule ajouté avec succès', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Cette plaque d\'immatriculation existe déjà' });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Liste des véhicules (avec pagination optionnelle)
app.get('/vehicles', verifyToken, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const offset = (page - 1) * limit;
    const [[{ total }]] = await pool.execute('SELECT COUNT(*) as total FROM vehicles');
    const [rows] = await pool.execute(
      'SELECT * FROM vehicles ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    res.json({ data: rows, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Détail d'un véhicule
app.get('/vehicles/:id', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Véhicule introuvable' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Modifier un véhicule
app.put('/vehicles/:id', verifyToken, async (req, res) => {
  const { plate, type, owner } = req.body;
  if (!plate && !type && !owner)
    return res.status(400).json({ error: 'Au moins un champ à modifier est requis' });
  try {
    const [current] = await pool.execute('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
    if (current.length === 0) return res.status(404).json({ error: 'Véhicule introuvable' });
    const v = current[0];
    const [result] = await pool.execute(
      'UPDATE vehicles SET plate = ?, type = ?, owner = ? WHERE id = ?',
      [
        plate  ? plate.trim().toUpperCase() : v.plate,
        type   ? type.trim()  : v.type,
        owner  ? owner.trim() : v.owner,
        req.params.id,
      ]
    );
    res.json({ message: 'Véhicule mis à jour' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Cette plaque existe déjà' });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un véhicule (ADMIN uniquement)
app.delete('/vehicles/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM vehicles WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Véhicule introuvable' });
    res.json({ message: 'Véhicule supprimé avec succès' });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Enregistrer une position GPS
app.post('/vehicles/:id/position', verifyToken, async (req, res) => {
  const { latitude, longitude, speed } = req.body;
  if (latitude == null || longitude == null)
    return res.status(400).json({ error: 'latitude et longitude sont requis' });
  if (latitude < -90 || latitude > 90)
    return res.status(400).json({ error: 'latitude invalide (entre -90 et 90)' });
  if (longitude < -180 || longitude > 180)
    return res.status(400).json({ error: 'longitude invalide (entre -180 et 180)' });
  if (speed != null && speed < 0)
    return res.status(400).json({ error: 'La vitesse ne peut pas être négative' });
  try {
    const [v] = await pool.execute('SELECT id FROM vehicles WHERE id = ?', [req.params.id]);
    if (v.length === 0) return res.status(404).json({ error: 'Véhicule introuvable' });
    const [result] = await pool.execute(
      'INSERT INTO gps_positions (vehicle_id, latitude, longitude, speed) VALUES (?, ?, ?, ?)',
      [req.params.id, latitude, longitude, speed || 0]
    );
    res.status(201).json({ message: 'Position GPS enregistrée', id: result.insertId });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Historique GPS d'un véhicule
app.get('/vehicles/:id/history', verifyToken, async (req, res) => {
  try {
    const limit = Math.min(200, parseInt(req.query.limit) || 50);
    const [rows] = await pool.execute(
      'SELECT * FROM gps_positions WHERE vehicle_id = ? ORDER BY recorded_at DESC LIMIT ?',
      [req.params.id, limit]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Dernière position d'un véhicule
app.get('/vehicles/:id/last-position', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM gps_positions WHERE vehicle_id = ? ORDER BY recorded_at DESC LIMIT 1',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Aucune position enregistrée' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`🚗 Vehicle Service: http://localhost:${PORT}`));
