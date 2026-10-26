const path = require('path');
const express = require('express');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const authMiddleware = require('./middlewares/authMiddleware');
const adminMiddleware = require('./middlewares/adminMiddleware');
const { errorHandler } = require('./lib/http');

// Falha cedo: sem segredo não há como assinar/validar tokens
if (!process.env.JWT_SECRET) {
  console.error('ERRO: a variável JWT_SECRET não está definida. Copie .env.example para .env e configure-a.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Frontend e API são servidos na mesma origem, por isso CORS não é necessário.
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
// No Express 5, req.body fica undefined quando não há corpo JSON; padroniza como objeto vazio
app.use((req, res, next) => {
  req.body ??= {};
  next();
});

// Frontend estático a partir de /public (path absoluto independe do diretório de execução)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Rotas da API
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/admin', authMiddleware, adminMiddleware, adminRoutes);
app.use('/api', apiRoutes);

// 404 para rotas de API inexistentes
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Rota ${req.method} ${req.originalUrl} não encontrada.` });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
