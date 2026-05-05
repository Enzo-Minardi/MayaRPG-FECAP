const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db      = require('../db');
const auth    = require('../auth.middleware');

router.use(auth);

// ───── GET /api/appointments?date=2026-03-25&client_id=xxx ─────
router.get('/', async (req, res) => {
  try {
    let query = `
      SELECT a.id, a.client_id,
             DATE_FORMAT(a.date, '%Y-%m-%d') as date,
             TIME_FORMAT(a.time, '%H:%i') as time,
             TIME_FORMAT(a.end_time, '%H:%i') as end_time,
             a.type, a.status, a.created_at,
             c.name as client_name
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (req.query.date) {
      query += ' AND a.date = ?';
      params.push(req.query.date);
    }
    if (req.query.client_id) {
      query += ' AND a.client_id = ?';
      params.push(req.query.client_id);
    }
    if (req.query.status) {
      query += ' AND a.status = ?';
      params.push(req.query.status);
    }
    query += ' ORDER BY a.date, a.time';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar agendamentos.' });
  }
});

// ───── GET /api/appointments/today ─────
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [rows] = await db.query(
      `SELECT a.id, a.client_id,
              DATE_FORMAT(a.date, '%Y-%m-%d') as date,
              TIME_FORMAT(a.time, '%H:%i') as time,
              TIME_FORMAT(a.end_time, '%H:%i') as end_time,
              a.type, a.status, a.created_at,
              c.name as client_name
       FROM appointments a JOIN clients c ON a.client_id = c.id
       WHERE a.date = ? ORDER BY a.time`,
      [today]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar consultas de hoje.' });
  }
});

// ───── GET /api/appointments/:id ─────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.id, a.client_id,
              DATE_FORMAT(a.date, '%Y-%m-%d') as date,
              TIME_FORMAT(a.time, '%H:%i') as time,
              TIME_FORMAT(a.end_time, '%H:%i') as end_time,
              a.type, a.status, a.created_at,
              c.name as client_name
       FROM appointments a JOIN clients c ON a.client_id = c.id
       WHERE a.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar agendamento.' });
  }
});

// ───── POST /api/appointments ─────
router.post('/', async (req, res) => {
  const { client_id, date, time, end_time, type, status } = req.body;
  if (!client_id || !date || !time)
    return res.status(400).json({ error: 'client_id, data e hora são obrigatórios.' });

  try {
    const id = uuidv4();
    await db.query(
      'INSERT INTO appointments (id, client_id, date, time, end_time, type, status) VALUES (?,?,?,?,?,?,?)',
      [id, client_id, date, time, end_time || null, type || 'RPG', status || 'pendente']
    );
    const [rows] = await db.query(
      `SELECT a.id, a.client_id,
              DATE_FORMAT(a.date, '%Y-%m-%d') as date,
              TIME_FORMAT(a.time, '%H:%i') as time,
              TIME_FORMAT(a.end_time, '%H:%i') as end_time,
              a.type, a.status, a.created_at,
              c.name as client_name
       FROM appointments a JOIN clients c ON a.client_id = c.id WHERE a.id = ?`,
      [id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar agendamento.' });
  }
});

// ───── PUT /api/appointments/:id ─────
router.put('/:id', async (req, res) => {
  const { client_id, date, time, end_time, type, status } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE appointments SET client_id=?, date=?, time=?, end_time=?, type=?, status=? WHERE id=?',
      [client_id, date, time, end_time || null, type || 'RPG', status || 'pendente', req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Agendamento não encontrado.' });
    const [rows] = await db.query(
      `SELECT a.id, a.client_id,
              DATE_FORMAT(a.date, '%Y-%m-%d') as date,
              TIME_FORMAT(a.time, '%H:%i') as time,
              TIME_FORMAT(a.end_time, '%H:%i') as end_time,
              a.type, a.status, a.created_at,
              c.name as client_name
       FROM appointments a JOIN clients c ON a.client_id = c.id WHERE a.id = ?`,
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar agendamento.' });
  }
});

// ───── PATCH /api/appointments/:id/status ─────
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const allowed = ['pendente', 'confirmado', 'concluido', 'cancelado'];
  if (!allowed.includes(status))
    return res.status(400).json({ error: 'Status inválido.' });

  try {
    await db.query('UPDATE appointments SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ message: 'Status atualizado.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar status.' });
  }
});

// ───── DELETE /api/appointments/:id ─────
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM appointments WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Agendamento não encontrado.' });
    res.json({ message: 'Agendamento removido.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover agendamento.' });
  }
});

module.exports = router;