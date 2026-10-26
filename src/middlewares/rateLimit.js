// Limitador de requisições em memória (por IP), sem dependências externas.
// Suficiente para uma instância única; em produção com várias instâncias, usar um store compartilhado.
function rateLimit({ windowMs, max, message }) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();

    // Limpeza preguiçosa para o Map não crescer indefinidamente
    if (hits.size > 5000) {
      for (const [key, entry] of hits) if (entry.reset <= now) hits.delete(key);
    }

    let entry = hits.get(req.ip);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(req.ip, entry);
    }

    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

module.exports = rateLimit;
