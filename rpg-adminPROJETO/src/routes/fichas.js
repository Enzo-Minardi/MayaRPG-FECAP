const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db      = require('../db');
const auth    = require('../auth.middleware');

router.use(auth);

// ───── GET /api/fichas?client_id=xxx ─────
router.get('/', async (req, res) => {
  try {
    let query = `
      SELECT f.*, c.name as client_name
      FROM fichas f
      JOIN clients c ON f.client_id = c.id
    `;
    const params = [];
    if (req.query.client_id) {
      query += ' WHERE f.client_id = ?';
      params.push(req.query.client_id);
    }
    query += ' ORDER BY f.date DESC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar fichas.' });
  }
});

// ───── GET /api/fichas/:id ─────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT f.*, c.name as client_name
       FROM fichas f JOIN clients c ON f.client_id = c.id
       WHERE f.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Ficha não encontrada.' });

    // Busca plano de exercícios associado
    const [plans] = await db.query(
      `SELECT p.*, e.name as exercise_name, e.icon, e.region
       FROM plans p JOIN exercises e ON p.exercise_id = e.id
       WHERE p.ficha_id = ?`,
      [req.params.id]
    );
    res.json({ ...rows[0], plans });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar ficha.' });
  }
});

// ───── POST /api/fichas ─────
router.post('/', async (req, res) => {
  const { client_id, date, complaint, region, pain, notes, plan } = req.body;
  if (!client_id || !complaint || !region)
    return res.status(400).json({ error: 'client_id, queixa e região são obrigatórios.' });

  try {
    const id = uuidv4();
    await db.query(
      'INSERT INTO fichas (id, client_id, date, complaint, region, pain, notes, plan) VALUES (?,?,?,?,?,?,?,?)',
      [id, client_id, date || new Date().toISOString().split('T')[0], complaint, region, pain || 0, notes || '', plan || '']
    );

    // Cria alerta automático se dor >= 7
    if (parseInt(pain) >= 7) {
      const [client] = await db.query('SELECT name FROM clients WHERE id = ?', [client_id]);
      const clientName = client[0]?.name || 'Paciente';
      const alertId = uuidv4();
      const now = new Date();
      const timeStr = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')} - ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      await db.query(
        'INSERT INTO alerts (id, type, client_name, region, message, alert_time) VALUES (?,?,?,?,?,?)',
        [alertId, 'pain', clientName, region, `Dor intensa (${pain}/10) registrada em consulta`, timeStr]
      );
    }

    const [rows] = await db.query('SELECT * FROM fichas WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar ficha.' });
  }
});

// ───── PUT /api/fichas/:id ─────
router.put('/:id', async (req, res) => {
  const { date, complaint, region, pain, notes, plan } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE fichas SET date=?, complaint=?, region=?, pain=?, notes=?, plan=? WHERE id=?',
      [date, complaint, region, pain || 0, notes || '', plan || '', req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Ficha não encontrada.' });
    const [rows] = await db.query('SELECT * FROM fichas WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar ficha.' });
  }
});

// ───── DELETE /api/fichas/:id ─────
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM fichas WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Ficha não encontrada.' });
    res.json({ message: 'Ficha removida.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover ficha.' });
  }
});

module.exports = router;
