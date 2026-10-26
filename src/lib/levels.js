// Fonte única dos níveis de dificuldade no backend (seed, scripts e validação).
// O frontend mantém a versão visual equivalente em public/js/common.js.
const LEVELS = [
  { level: 1, slug: 'facil', label: 'Fácil' },
  { level: 2, slug: 'medio', label: 'Médio' },
  { level: 3, slug: 'dificil', label: 'Difícil' },
  { level: 4, slug: 'avancado', label: 'Avançado' },
];

const isValidLevel = (n) => LEVELS.some((l) => l.level === n);
const levelLabel = (n) => LEVELS.find((l) => l.level === n)?.label ?? `Nível ${n}`;

module.exports = { LEVELS, isValidLevel, levelLabel };
