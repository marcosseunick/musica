const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

// Valida o JWT e carrega o usuário atual do banco. Assim, mudanças de papel
// (USER/ADMIN) ou de instrumento passam a valer imediatamente, sem esperar o token expirar.
async function authMiddleware(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token não fornecido ou inválido.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token expirado ou inválido.' });
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, name: true, email: true, role: true, preferred_instrument_id: true },
  });

  if (!user) {
    return res.status(401).json({ error: 'Usuário não encontrado.' });
  }

  req.user = user;
  next();
}

module.exports = authMiddleware;
