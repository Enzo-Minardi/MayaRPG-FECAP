const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db      = require('../db');

// ───── POST /api/auth/register ─────
router.post('/register', async (req, res) => {
  const { name, email, password, phone, age } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });

  if (password.length < 6)
    return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres.' });

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0)
      return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });

    const id = uuidv4();

    await db.query(
      'INSERT INTO users (id, name, email, password, phone, age) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, email, password, phone || null, age || null]
    );

    const token = jwt.sign(
      { id, name, email },
      process.env.JWT_SECRET || 'rpg_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({ token, user: { id, name, email, phone, age } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno ao registrar usuário.' });
  }
});

// ───── POST /api/auth/login ─────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });

  try {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ? AND password = ?',
      [email, password]
    );
    if (rows.length === 0)
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });

    const user = rows[0];

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      process.env.JWT_SECRET || 'rpg_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, age: user.age }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno ao fazer login.' });
  }
});

module.exports = router;
