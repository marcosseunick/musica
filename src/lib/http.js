// Utilitários HTTP compartilhados: erros com status, validação de entrada
// e tratamento centralizado de erros (inclui códigos do Prisma).

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const badRequest = (message) => new HttpError(400, message);
const notFound = (message = 'Registro não encontrado.') => new HttpError(404, message);
const forbidden = (message = 'Acesso negado.') => new HttpError(403, message);

// Converte valor em inteiro positivo; retorna null se inválido
function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function requireId(value, field = 'id') {
  const id = parseId(value);
  if (!id) throw badRequest(`${field} deve ser um inteiro positivo.`);
  return id;
}

function requireText(value, field, { max = 200 } = {}) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw badRequest(`${field} é obrigatório.`);
  if (text.length > max) throw badRequest(`${field} deve ter no máximo ${max} caracteres.`);
  return text;
}

function requireOneOf(value, allowed, field) {
  if (!allowed.includes(value)) {
    throw badRequest(`${field} inválido. Valores aceitos: ${allowed.join(', ')}.`);
  }
  return value;
}

// Aceita apenas http(s) ou caminhos relativos ao site ("/materials/..."),
// bloqueando esquemas perigosos como javascript: e data:.
function requireSafeUrl(value, field) {
  const raw = requireText(value, field, { max: 2000 });
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  try {
    const url = new URL(raw);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString();
  } catch {
    /* cai no erro abaixo */
  }
  throw badRequest(`${field} deve ser uma URL http(s) ou um caminho iniciando com "/".`);
}

// "90", "90s", "1m30s", "1h2m3s" -> segundos
function parseStartSeconds(value) {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value);
  const match = String(value).match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match) return 0;
  const [, h = 0, m = 0, s = 0] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

// Converte links comuns do YouTube (watch, youtu.be, shorts, live) para o formato embed,
// preservando o tempo inicial. URLs de outros provedores são devolvidas sem alteração.
function toYouTubeEmbed(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  const host = url.hostname.replace(/^(www|m)\./, '');
  let id = null;
  if (host === 'youtu.be') {
    id = url.pathname.slice(1).split('/')[0];
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else id = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/)?.[1] ?? null;
  }
  if (!id || !/^[\w-]{6,20}$/.test(id)) return rawUrl;

  const embed = new URL(`https://www.youtube.com/embed/${id}`);
  const start = parseStartSeconds(url.searchParams.get('start') || url.searchParams.get('t'));
  if (start) embed.searchParams.set('start', String(start));
  return embed.toString();
}

// Executa a operação e traduz violação de unicidade (P2002) numa mensagem amigável
async function uniqueOr(promise, message) {
  try {
    return await promise;
  } catch (err) {
    if (err.code === 'P2002') throw new HttpError(409, message);
    throw err;
  }
}

// Handler global (Express 5 encaminha erros de handlers async automaticamente)
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido no corpo da requisição.' });
  if (err.code === 'P2002') return res.status(409).json({ error: 'Já existe um registro com esses dados.' });
  if (err.code === 'P2003') return res.status(400).json({ error: 'Referência inválida: o item relacionado não existe.' });
  if (err.code === 'P2025') return res.status(404).json({ error: 'Registro não encontrado.' });

  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
}

module.exports = {
  HttpError,
  badRequest,
  notFound,
  forbidden,
  parseId,
  requireId,
  requireText,
  requireOneOf,
  requireSafeUrl,
  toYouTubeEmbed,
  uniqueOr,
  errorHandler,
};
