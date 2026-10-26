const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middlewares/authMiddleware');
const rateLimit = require('../middlewares/rateLimit');
const { HttpError, badRequest, parseId, requireText, uniqueOr } = require('../lib/http');

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72; // limite do bcrypt

// Até 10 tentativas de login e 5 cadastros a cada 15 min por IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
});
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Muitos cadastros a partir deste dispositivo. Tente novamente mais tarde.',
});

const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

// Dados do usuário que podem ser expostos ao frontend
function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    preferred_instrument_id: user.preferred_instrument_id,
  };
}

// O payload carrega dados de exibição; a autorização real sempre consulta o banco (authMiddleware)
function generateToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, role: user.role, preferred_instrument_id: user.preferred_instrument_id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * POST /api/auth/register
 * Registra um novo usuário
 */
router.post('/register', registerLimiter, async (req, res) => {
  const name = requireText(req.body.name, 'Nome', { max: 100 });
  const email = normalizeEmail(req.body.email);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!EMAIL_RE.test(email)) throw badRequest('Informe um e-mail válido.');
  if (password.length < PASSWORD_MIN) throw badRequest(`A senha deve ter pelo menos ${PASSWORD_MIN} caracteres.`);
  if (password.length > PASSWORD_MAX) throw badRequest(`A senha deve ter no máximo ${PASSWORD_MAX} caracteres.`);

  const instrumentId = parseId(req.body.preferred_instrument_id);
  if (!instrumentId) throw badRequest('A escolha de um instrumento é obrigatória.');

  const instrument = await prisma.instrument.findUnique({ where: { id: instrumentId } });
  if (!instrument) throw badRequest('O instrumento selecionado não existe.');

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new HttpError(409, 'Este e-mail já está em uso.');

  const user = await uniqueOr(
    prisma.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 10),
        preferred_instrument_id: instrumentId,
      },
    }),
    'Este e-mail já está em uso.'
  );

  res.status(201).json({ token: generateToken(user), user: publicUser(user) });
});

/**
 * POST /api/auth/login
 * Autentica o usuário e retorna o token JWT
 */
router.post('/login', loginLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!email || !password) throw badRequest('E-mail e senha são obrigatórios.');

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordMatch = user ? await bcrypt.compare(password, user.password) : false;

  if (!passwordMatch) throw new HttpError(401, 'E-mail ou senha incorretos.');

  res.json({ token: generateToken(user), user: publicUser(user) });
});

/**
 * GET /api/auth/me
 * Dados atualizados do usuário logado (papel e instrumento vêm do banco, não do token)
 */
router.get('/me', authMiddleware, async (req, res) => {
  const instrument = req.user.preferred_instrument_id
    ? await prisma.instrument.findUnique({ where: { id: req.user.preferred_instrument_id } })
    : null;

  res.json({ ...publicUser(req.user), preferred_instrument: instrument });
});

module.exports = router;
