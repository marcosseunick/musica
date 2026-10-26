const { Router } = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireId, notFound, forbidden } = require('../lib/http');

const router = Router();

// Trava de trilha: o aluno só acessa o instrumento escolhido no cadastro; ADMIN acessa todos.
function assertTrackAccess(user, instrumentId) {
  if (user.role !== 'ADMIN' && user.preferred_instrument_id !== instrumentId) {
    throw forbidden('Você só tem acesso às aulas do instrumento escolhido no cadastro.');
  }
}

/**
 * GET /api/instruments
 * Lista pública dos instrumentos (usada no cadastro, no Dashboard e no Estúdio).
 */
router.get('/instruments', async (req, res) => {
  const instruments = await prisma.instrument.findMany({ orderBy: { name: 'asc' } });
  res.json(instruments);
});

/**
 * GET /api/instruments/:instrumentId/songs
 * Instrumento + músicas da trilha, com os níveis disponíveis de cada uma (Dashboard).
 */
router.get('/instruments/:instrumentId/songs', authMiddleware, async (req, res) => {
  const instrumentId = requireId(req.params.instrumentId, 'instrumentId');
  assertTrackAccess(req.user, instrumentId);

  const instrument = await prisma.instrument.findUnique({
    where: { id: instrumentId },
    include: {
      songs: {
        include: {
          song: true,
          modules: { select: { difficulty_level: true }, orderBy: { difficulty_level: 'asc' } },
        },
        orderBy: { song: { title: 'asc' } },
      },
    },
  });

  if (!instrument) throw notFound('Instrumento não encontrado.');

  res.json({
    instrument: { id: instrument.id, name: instrument.name },
    songs: instrument.songs.map((si) => ({
      ...si.song,
      levels: si.modules.map((m) => m.difficulty_level),
    })),
  });
});

/**
 * GET /api/lessons/:songId/:instrumentId
 * Rota principal do Player: retorna a aula completa em um único request
 * (música, instrumento, módulos ordenados por dificuldade, aulas e materiais).
 */
router.get('/lessons/:songId/:instrumentId', authMiddleware, async (req, res) => {
  const songId = requireId(req.params.songId, 'songId');
  const instrumentId = requireId(req.params.instrumentId, 'instrumentId');
  assertTrackAccess(req.user, instrumentId);

  // findUnique possível graças ao @@unique([song_id, instrument_id]) no schema
  const lesson = await prisma.songInstrument.findUnique({
    where: { song_id_instrument_id: { song_id: songId, instrument_id: instrumentId } },
    include: {
      song: true,
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
  });

  if (!lesson) throw notFound('Aula não encontrada para esta combinação de música e instrumento.');

  res.json(lesson);
});

module.exports = router;
