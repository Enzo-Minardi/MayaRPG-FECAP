const express = require('express');
const router  = express.Router();
const db      = require('../db');
const auth    = require('../auth.middleware');

router.use(auth);

// ───── GET /api/dashboard ─────
// Retorna todos os dados necessários para o dashboard em uma única chamada
router.get('/', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    const firstDay = firstDayOfMonth.toISOString().split('T')[0];

    // Novos clientes este mês
    const [[{ newClients }]] = await db.query(
      'SELECT COUNT(*) as newClients FROM clients WHERE created_at >= ?',
      [firstDay]
    );

    // Consultas de hoje
    const [[{ todayAppts }]] = await db.query(
      'SELECT COUNT(*) as todayAppts FROM appointments WHERE date = ?',
      [today]
    );

    // Total de clientes
    const [[{ totalClients }]] = await db.query(
      'SELECT COUNT(*) as totalClients FROM clients'
    );

    // Clientes por status
    const [statusRows] = await db.query(
      'SELECT status, COUNT(*) as count FROM clients GROUP BY status'
    );

    // Alertas não lidos
    const [[{ unreadAlerts }]] = await db.query(
      'SELECT COUNT(*) as unreadAlerts FROM alerts WHERE is_read = FALSE'
    );

    // Agenda de hoje
    const [todaySchedule] = await db.query(
      `SELECT a.*, c.name as client_name
       FROM appointments a JOIN clients c ON a.client_id = c.id
       WHERE a.date = ? ORDER BY a.time`,
      [today]
    );

    // Últimos 3 alertas
    const [recentAlerts] = await db.query(
      'SELECT * FROM alerts ORDER BY created_at DESC LIMIT 3'
    );

    // Consultas por mês (últimos 8 meses)
    const [monthlyData] = await db.query(
      `SELECT DATE_FORMAT(date, '%Y-%m') as month, COUNT(*) as count
       FROM appointments
       WHERE date >= DATE_SUB(CURDATE(), INTERVAL 8 MONTH)
       GROUP BY month ORDER BY month`
    );

    // Regiões mais tratadas
    const [regionData] = await db.query(
      'SELECT region, COUNT(*) as count FROM fichas GROUP BY region ORDER BY count DESC LIMIT 6'
    );

    res.json({
      stats: { newClients, todayAppts, totalClients, unreadAlerts },
      clientsByStatus: statusRows,
      todaySchedule,
      recentAlerts,
      monthlyData,
      regionData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao carregar dashboard.' });
  }
});

module.exports = router;
