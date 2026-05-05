const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db      = require('../db');
const auth    = require('../auth.middleware');

// Todas as rotas exigem autenticação
router.use(auth);

// ───── GET /api/clients ─────
router.get('/', async (req, res) => {
  try {
    const search = req.query.q ? `%${req.query.q}%` : '%';
    const [rows] = await db.query(
      'SELECT * FROM clients WHERE name LIKE ? OR email LIKE ? ORDER BY created_at DESC',
      [search, search]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar clientes.' });
  }
});

// ───── GET /api/clients/:id ─────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar cliente.' });
  }
});

// ───── POST /api/clients ─────
router.post('/', async (req, res) => {
  const { name, email, phone, age, status } = req.body;
  if (!name || !email || !phone)
    return res.status(400).json({ error: 'Nome, e-mail e telefone são obrigatórios.' });

  try {
    const id = uuidv4();
    await db.query(
      'INSERT INTO clients (id, name, email, phone, age, status) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, email, phone, age || null, status || 'ativo']
    );
    const [rows] = await db.query('SELECT * FROM clients WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar cliente.' });
  }
});

// ───── PUT /api/clients/:id ─────
router.put('/:id', async (req, res) => {
  const { name, email, phone, age, status } = req.body;
  if (!name || !email || !phone)
    return res.status(400).json({ error: 'Nome, e-mail e telefone são obrigatórios.' });

  try {
    const [result] = await db.query(
      'UPDATE clients SET name=?, email=?, phone=?, age=?, status=? WHERE id=?',
      [name, email, phone, age || null, status || 'ativo', req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Cliente não encontrado.' });
    const [rows] = await db.query('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar cliente.' });
  }
});

// ───── DELETE /api/clients/:id ─────
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM clients WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Cliente não encontrado.' });
    res.json({ message: 'Cliente removido com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover cliente.' });
  }
});

// ───── GET /api/clients/:id/stats ─────
// Estatísticas de um cliente específico
router.get('/:id/stats', async (req, res) => {
  try {
    const [fichas]  = await db.query('SELECT * FROM fichas WHERE client_id = ? ORDER BY date DESC', [req.params.id]);
    const [appts]   = await db.query('SELECT * FROM appointments WHERE client_id = ?', [req.params.id]);
    const [plans]   = await db.query(
      `SELECT p.*, e.name as exercise_name, e.icon, e.region
       FROM plans p JOIN exercises e ON p.exercise_id = e.id
       WHERE p.client_id = ? ORDER BY p.created_at DESC`,
      [req.params.id]
    );
    const avgPain = fichas.length
      ? (fichas.reduce((s, f) => s + f.pain, 0) / fichas.length).toFixed(1)
      : 0;

    res.json({ fichas, appointments: appts, plans, avgPain, totalFichas: fichas.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar estatísticas.' });
  }
});

module.exports = router;
