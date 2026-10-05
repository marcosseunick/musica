function adminMiddleware(req, res, next) {
  // Este middleware deve ser chamado *depois* do authMiddleware
  if (!req.user) {
    return res.status(401).json({ error: 'Usuário não autenticado.' });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso negado. Permissão de administrador necessária.' });
  }

  next();
}

module.exports = adminMiddleware;
