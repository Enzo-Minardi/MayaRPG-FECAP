const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db      = require('../db');
const auth    = require('../auth.middleware');

router.use(auth);

// ───── GET /api/alerts ─────
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM alerts ORDER BY created_at DESC LIMIT 50'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar alertas.' });
  }
});

// ───── POST /api/alerts ─────
router.post('/', async (req, res) => {
  const { type, client_name, region, message } = req.body;
  try {
    const id  = uuidv4();
    const now = new Date();
    const timeStr = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')} - ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    await db.query(
      'INSERT INTO alerts (id, type, client_name, region, message, alert_time) VALUES (?,?,?,?,?,?)',
      [id, type || 'info', client_name, region || '—', message, timeStr]
    );
    const [rows] = await db.query('SELECT * FROM alerts WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar alerta.' });
  }
});

// ───── PATCH /api/alerts/:id/read ─────
router.patch('/:id/read', async (req, res) => {
  try {
    await db.query('UPDATE alerts SET is_read = TRUE WHERE id = ?', [req.params.id]);
    res.json({ message: 'Alerta marcado como lido.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao marcar alerta.' });
  }
});

// ───── PATCH /api/alerts/read-all ─────
router.patch('/read-all', async (req, res) => {
  try {
    await db.query('UPDATE alerts SET is_read = TRUE');
    res.json({ message: 'Todos os alertas marcados como lidos.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao marcar alertas.' });
  }
});

// ───── DELETE /api/alerts/:id ─────
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM alerts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Alerta removido.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover alerta.' });
  }
});

module.exports = router;
