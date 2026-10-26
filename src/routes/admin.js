// Rotas do Estúdio (admin). Montadas em /api/admin, já protegidas por authMiddleware + adminMiddleware.
// Erros de validação/Prisma são tratados pelo errorHandler global (src/lib/http.js).
const { Router } = require('express');
const prisma = require('../lib/prisma');
const { isValidLevel, LEVELS } = require('../lib/levels');
const {
  badRequest,
  notFound,
  requireId,
  requireText,
  requireOneOf,
  requireSafeUrl,
  toYouTubeEmbed,
  uniqueOr,
} = require('../lib/http');

const router = Router();

const ROLES = ['USER', 'ADMIN'];
const MATERIAL_TYPES = ['pdf', 'cifra', 'gp', 'link'];
const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  created_at: true,
  preferred_instrument: { select: { id: true, name: true } },
};

function requireLevel(value) {
  const level = Number(value);
  if (!isValidLevel(level)) {
    throw badRequest(`Nível de dificuldade inválido. Use ${LEVELS.map((l) => l.level).join(', ')}.`);
  }
  return level;
}

function parseOrderIndex(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw badRequest('A ordem deve ser um número inteiro maior ou igual a 0.');
  return n;
}

// Monta os campos validados de cada entidade (reutilizado no POST e no PATCH)
const songData = (body) => ({
  title: requireText(body.title, 'Título', { max: 150 }),
  artist: requireText(body.artist, 'Artista', { max: 150 }),
});
const moduleData = (body) => ({
  difficulty_level: requireLevel(body.difficulty_level),
  description: requireText(body.description, 'Descrição', { max: 1000 }),
});
const lessonData = (body) => ({
  title: requireText(body.title, 'Título', { max: 200 }),
  video_url: toYouTubeEmbed(requireSafeUrl(body.video_url, 'URL do vídeo')),
});
const materialData = (body) => ({
  title: requireText(body.title, 'Título', { max: 200 }),
  file_url: requireSafeUrl(body.file_url, 'URL do arquivo'),
  type: requireOneOf(body.type, MATERIAL_TYPES, 'Tipo de arquivo'),
});

const DUPLICATE_LEVEL = 'Este nível já existe nesta trilha.';
const DUPLICATE_TRACK = 'Esta música já possui uma trilha para este instrumento.';
const DUPLICATE_INSTRUMENT = 'Este instrumento já está cadastrado.';

// ==========================================
// USUÁRIOS
// ==========================================

router.get('/users', async (req, res) => {
  const users = await prisma.user.findMany({ select: USER_SELECT, orderBy: { id: 'desc' } });
  res.json(users);
});

router.patch('/users/:id', async (req, res) => {
  const id = requireId(req.params.id);
  const role = requireOneOf(req.body.role, ROLES, 'Função');
  if (id === req.user.id && role !== 'ADMIN') {
    throw badRequest('Você não pode remover sua própria permissão de administrador.');
  }
  const user = await prisma.user.update({ where: { id }, data: { role }, select: USER_SELECT });
  res.json(user);
});

// ==========================================
// INSTRUMENTOS (listagem usa a rota pública GET /api/instruments)
// ==========================================

router.post('/instruments', async (req, res) => {
  const name = requireText(req.body.name, 'Nome', { max: 50 });
  const instrument = await uniqueOr(prisma.instrument.create({ data: { name } }), DUPLICATE_INSTRUMENT);
  res.status(201).json(instrument);
});

router.patch('/instruments/:id', async (req, res) => {
  const id = requireId(req.params.id);
  const name = requireText(req.body.name, 'Nome', { max: 50 });
  const instrument = await uniqueOr(prisma.instrument.update({ where: { id }, data: { name } }), DUPLICATE_INSTRUMENT);
  res.json(instrument);
});

router.delete('/instruments/:id', async (req, res) => {
  await prisma.instrument.delete({ where: { id: requireId(req.params.id) } });
  res.status(204).end();
});

// ==========================================
// MÚSICAS
// ==========================================

// Listagem leve para a grade (sem aulas/materiais)
router.get('/songs', async (req, res) => {
  const songs = await prisma.song.findMany({
    orderBy: { title: 'asc' },
    include: {
      instruments: {
        orderBy: { instrument: { name: 'asc' } },
        include: { instrument: true, _count: { select: { modules: true } } },
      },
    },
  });

  res.json(
    songs.map((song) => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      tracks: song.instruments.map((t) => ({ id: t.id, instrument: t.instrument, modules: t._count.modules })),
    }))
  );
});

// Árvore completa de uma música para a tela de edição
router.get('/songs/:id', async (req, res) => {
  const song = await prisma.song.findUnique({
    where: { id: requireId(req.params.id) },
    include: {
      instruments: {
        orderBy: { instrument: { name: 'asc' } },
        include: {
          instrument: true,
          modules: {
            orderBy: { difficulty_level: 'asc' },
            include: {
              lessons: {
                orderBy: [{ order_index: 'asc' }, { id: 'asc' }],
                include: { materials: { orderBy: { id: 'asc' } } },
              },
            },
          },
        },
      },
    },
  });
  if (!song) throw notFound('Música não encontrada.');
  res.json(song);
});

/**
 * POST /api/admin/songs
 * Cria uma música e, opcionalmente, já a vincula a um instrumento (primeira trilha).
 */
router.post('/songs', async (req, res) => {
  const data = songData(req.body);
  const instrumentId = req.body.instrument_id ? requireId(req.body.instrument_id, 'Instrumento') : null;

  const song = await prisma.song.create({
    data: {
      ...data,
      ...(instrumentId && { instruments: { create: [{ instrument_id: instrumentId }] } }),
    },
  });
  res.status(201).json(song);
});

router.patch('/songs/:id', async (req, res) => {
  const song = await prisma.song.update({ where: { id: requireId(req.params.id) }, data: songData(req.body) });
  res.json(song);
});

router.delete('/songs/:id', async (req, res) => {
  await prisma.song.delete({ where: { id: requireId(req.params.id) } });
  res.status(204).end();
});

// ==========================================
// TRILHAS (Música + Instrumento)
// ==========================================

router.post('/songs/:id/tracks', async (req, res) => {
  const songId = requireId(req.params.id);
  const instrumentId = requireId(req.body.instrument_id, 'Instrumento');
  const track = await uniqueOr(
    prisma.songInstrument.create({
      data: { song_id: songId, instrument_id: instrumentId },
      include: { instrument: true },
    }),
    DUPLICATE_TRACK
  );
  res.status(201).json(track);
});

router.delete('/tracks/:id', async (req, res) => {
  await prisma.songInstrument.delete({ where: { id: requireId(req.params.id) } });
  res.status(204).end();
});

// ==========================================
// MÓDULOS (níveis)
// ==========================================

router.post('/modules', async (req, res) => {
  const songInstrumentId = requireId(req.body.song_instrument_id, 'Trilha');
  const module = await uniqueOr(
    prisma.module.create({ data: { song_instrument_id: songInstrumentId, ...moduleData(req.body) } }),
    DUPLICATE_LEVEL
  );
  res.status(201).json(module);
});

router.patch('/modules/:id', async (req, res) => {
  const module = await uniqueOr(
    prisma.module.update({ where: { id: requireId(req.params.id) }, data: moduleData(req.body) }),
    DUPLICATE_LEVEL
  );
  res.json(module);
});

router.delete('/modules/:id', async (req, res) => {
  await prisma.module.delete({ where: { id: requireId(req.params.id) } });
  res.status(204).end();
});

// ==========================================
// AULAS
// ==========================================

/**
 * POST /api/admin/lessons
 * Sem order_index, a aula entra automaticamente no fim do módulo.
 */
router.post('/lessons', async (req, res) => {
  const moduleId = requireId(req.body.module_id, 'Módulo');
  let orderIndex = parseOrderIndex(req.body.order_index);
  if (orderIndex === null) {
    const last = await prisma.lesson.aggregate({ where: { module_id: moduleId }, _max: { order_index: true } });
    orderIndex = (last._max.order_index ?? 0) + 1;
  }

  const lesson = await prisma.lesson.create({
    data: { module_id: moduleId, order_index: orderIndex, ...lessonData(req.body) },
  });
  res.status(201).json(lesson);
});

router.patch('/lessons/:id', async (req, res) => {
  const orderIndex = parseOrderIndex(req.body.order_index);
  const lesson = await prisma.lesson.update({
    where: { id: requireId(req.params.id) },
    data: { ...lessonData(req.body), ...(orderIndex !== null && { order_index: orderIndex }) },
  });
  res.json(lesson);
});

router.delete('/lessons/:id', async (req, res) => {
  await prisma.lesson.delete({ where: { id: requireId(req.params.id) } });
  res.status(204).end();
});

// ==========================================
// MATERIAIS
// ==========================================

router.post('/materials', async (req, res) => {
  const lessonId = requireId(req.body.lesson_id, 'Aula');
  const material = await prisma.material.create({ data: { lesson_id: lessonId, ...materialData(req.body) } });
  res.status(201).json(material);
});

router.patch('/materials/:id', async (req, res) => {
  const material = await prisma.material.update({
    where: { id: requireId(req.params.id) },
    data: materialData(req.body),
  });
  res.json(material);
});

router.delete('/materials/:id', async (req, res) => {
  await prisma.material.delete({ where: { id: requireId(req.params.id) } });
  res.status(204).end();
});

module.exports = router;
