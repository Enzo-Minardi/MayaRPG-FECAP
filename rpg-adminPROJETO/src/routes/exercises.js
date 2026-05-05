const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db      = require('../db');
const auth    = require('../auth.middleware');

router.use(auth);

// ───── GET /api/exercises?region=lombar ─────
router.get('/', async (req, res) => {
  try {
    let query  = 'SELECT * FROM exercises WHERE 1=1';
    const params = [];
    if (req.query.region && req.query.region !== 'all') {
      query += ' AND region = ?';
      params.push(req.query.region);
    }
    if (req.query.q) {
      query += ' AND name LIKE ?';
      params.push(`%${req.query.q}%`);
    }
    query += ' ORDER BY region, name';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar exercícios.' });
  }
});

// ───── GET /api/exercises/:id ─────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM exercises WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Exercício não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar exercício.' });
  }
});

// ───── POST /api/exercises ─────
router.post('/', async (req, res) => {
  const { name, region, icon, description } = req.body;
  if (!name || !region)
    return res.status(400).json({ error: 'Nome e região são obrigatórios.' });

  try {
    const [result] = await db.query(
      'INSERT INTO exercises (name, region, icon, description) VALUES (?, ?, ?, ?)',
      [name, region, icon || '🏋️', description || '']
    );
    const [rows] = await db.query('SELECT * FROM exercises WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar exercício.' });
  }
});

// ───── PUT /api/exercises/:id ─────
router.put('/:id', async (req, res) => {
  const { name, region, icon, description } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE exercises SET name=?, region=?, icon=?, description=? WHERE id=?',
      [name, region, icon || '🏋️', description || '', req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Exercício não encontrado.' });
    const [rows] = await db.query('SELECT * FROM exercises WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar exercício.' });
  }
});

// ───── DELETE /api/exercises/:id ─────
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM exercises WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Exercício não encontrado.' });
    res.json({ message: 'Exercício removido.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover exercício.' });
  }
});

// ============================================================
//  PLANOS DE EXERCÍCIOS
// ============================================================

// ───── GET /api/exercises/plans/client/:clientId ─────
router.get('/plans/client/:clientId', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, e.name as exercise_name, e.icon, e.region, e.description
       FROM plans p
       JOIN exercises e ON p.exercise_id = e.id
       WHERE p.client_id = ?
       ORDER BY p.created_at DESC`,
      [req.params.clientId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar plano.' });
  }
});

// ───── POST /api/exercises/plans ─────
// Body: { client_id, ficha_id, exercises: [{exercise_id, series, reps}] }
router.post('/plans', async (req, res) => {
  const { client_id, ficha_id, exercises } = req.body;
  if (!client_id || !exercises || exercises.length === 0)
    return res.status(400).json({ error: 'client_id e lista de exercícios são obrigatórios.' });

  try {
    const created = [];
    for (const ex of exercises) {
      const id = uuidv4();
      await db.query(
        'INSERT INTO plans (id, client_id, ficha_id, exercise_id, series, reps) VALUES (?,?,?,?,?,?)',
        [id, client_id, ficha_id || null, ex.exercise_id, ex.series || 3, ex.reps || 10]
      );
      created.push({ id, ...ex });
    }
    res.status(201).json({ message: 'Plano designado com sucesso.', plans: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao designar plano.' });
  }
});

// ───── DELETE /api/exercises/plans/:id ─────
router.delete('/plans/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM plans WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Plano não encontrado.' });
    res.json({ message: 'Exercício do plano removido.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover plano.' });
  }
});

module.exports = router;
