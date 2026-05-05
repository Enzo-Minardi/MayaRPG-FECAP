require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// ───── Middlewares globais ─────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ───── Arquivos estáticos (frontend) ─────
app.use(express.static(path.join(__dirname, '../public')));

// ───── Rotas da API ─────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/dashboard',    require('./routes/dashboard'));
app.use('/api/clients',      require('./routes/clients'));
app.use('/api/fichas',       require('./routes/fichas'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/exercises',    require('./routes/exercises'));
app.use('/api/alerts',       require('./routes/alerts'));

// ───── Health check ─────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ───── Fallback: serve o index.html para o SPA ─────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ───── Error handler global ─────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

// ───── Start ─────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 RPG Admin rodando em http://localhost:${PORT}`);
  console.log(`📋 API disponível em http://localhost:${PORT}/api`);
  console.log(`💚 Health check: http://localhost:${PORT}/api/health\n`);
});
