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
  database:           process.env.DB_NAME     || 'db_notifications',
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

// ═══════════════════════════════════════════════════════════
//   ROUTES
// ═══════════════════════════════════════════════════════════

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'notification', timestamp: new Date().toISOString() });
});

// Envoyer une notification ciblée (appelé par les autres services en interne)
app.post('/notifications', async (req, res) => {
  const { user_id, message } = req.body;
  if (!user_id || !message)
    return res.status(400).json({ error: 'user_id et message sont requis' });
  try {
    const [result] = await pool.execute(
      'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
      [user_id, message.trim()]
    );
    res.status(201).json({ message: 'Notification envoyée', id: result.insertId });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Diffuser une notification à tous les utilisateurs (appelé par incident service)
app.post('/notifications/broadcast', async (req, res) => {
  const { message, reported_by } = req.body;
  if (!message) return res.status(400).json({ error: 'message est requis' });

  try {
    // Récupérer tous les utilisateurs depuis le service auth
    let users = [];
    try {
      const { data } = await axios.get(`${AUTH_URL}/users`, {
        headers: { authorization: 'Bearer internal' },
        timeout: 3000,
      });
      users = data;
    } catch {
      // Si pas de liste, envoyer seulement à l'auteur
      if (reported_by) users = [{ id: reported_by }];
    }

    const insertions = users.map(u =>
      pool.execute('INSERT INTO notifications (user_id, message) VALUES (?, ?)', [u.id, message])
    );
    await Promise.allSettled(insertions);

    res.status(201).json({ message: 'Notifications diffusées', count: users.length });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Mes notifications
app.get('/notifications', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Notifications non lues
app.get('/notifications/unread', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM notifications WHERE user_id = ? AND is_read = FALSE ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Nombre de notifications non lues
app.get('/notifications/count', verifyToken, async (req, res) => {
  try {
    const [[{ total }]]  = await pool.execute('SELECT COUNT(*) as total FROM notifications WHERE user_id = ?', [req.user.id]);
    const [[{ unread }]] = await pool.execute('SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = FALSE', [req.user.id]);
    res.json({ total, unread });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Marquer une notification comme lue
app.patch('/notifications/:id/read', verifyToken, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Notification introuvable' });
    res.json({ message: 'Notification marquée comme lue' });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Marquer toutes mes notifications comme lues
app.patch('/notifications/read-all', verifyToken, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ message: 'Toutes les notifications marquées comme lues', count: result.affectedRows });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Supprimer une notification
app.delete('/notifications/:id', verifyToken, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Notification introuvable' });
    res.json({ message: 'Notification supprimée' });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`🔔 Notification Service: http://localhost:${PORT}`));
