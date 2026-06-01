require('dotenv').config();
const express = require('express');
const mysql   = require('mysql2/promise');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

const app = express();
app.use(express.json());

// ── CORS ─────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── Logging ───────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Rate Limiting (brute-force protection sur /login) ─────────
const loginAttempts = new Map();
function rateLimiter(max, windowMs) {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const entry = loginAttempts.get(key) || { count: 0, reset: now + windowMs };
    if (now > entry.reset) { entry.count = 0; entry.reset = now + windowMs; }
    entry.count++;
    loginAttempts.set(key, entry);
    if (entry.count > max) {
      const waitSec = Math.ceil((entry.reset - now) / 1000);
      return res.status(429).json({
        error: `Trop de tentatives. Réessayez dans ${waitSec} secondes.`
      });
    }
    next();
  };
}

// ── MySQL Pool ────────────────────────────────────────────────
const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'db_auth',
  waitForConnections: true,
  connectionLimit:    10,
});

const JWT_SECRET = process.env.JWT_SECRET || 'traffic_jwt_secret_2024';

// ── Helpers ───────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function verifyToken(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'Token manquant' });
  const token = auth.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
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
  res.json({ status: 'OK', service: 'auth', timestamp: new Date().toISOString() });
});

// Inscription
app.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: 'name, email et password sont requis' });
  if (!EMAIL_REGEX.test(email))
    return res.status(400).json({ error: 'Format email invalide' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
  if (role && !['ADMIN', 'OPERATOR'].includes(role))
    return res.status(400).json({ error: 'Rôle invalide. Valeurs : ADMIN, OPERATOR' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name.trim(), email.toLowerCase().trim(), hash, role || 'OPERATOR']
    );
    res.status(201).json({ message: 'Utilisateur créé avec succès', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Connexion (avec rate limiting)
app.post('/login', rateLimiter(20, 15 * 60 * 1000), async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email et mot de passe requis' });

  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (rows.length === 0)
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mon profil
app.get('/me', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Vérifier un token (appelé par les autres services)
app.get('/verify', verifyToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Liste des utilisateurs (ADMIN uniquement)
app.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Utilisateur par ID (pour usage interne)
app.get('/users/:id', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Supprimer un utilisateur (ADMIN uniquement)
app.delete('/users/:id', verifyToken, requireAdmin, async (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  try {
    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🔐 Auth Service: http://localhost:${PORT}`));
