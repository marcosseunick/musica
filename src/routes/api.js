const { Router } = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middlewares/authMiddleware');

const router = Router();

// Converte parâmetro de rota em inteiro positivo; retorna null se inválido
function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * GET /api/instruments
 * Lista os instrumentos para o Dashboard.
 */
router.get('/instruments', async (req, res) => {
  const instruments = await prisma.instrument.findMany({ orderBy: { name: 'asc' } });
  res.json(instruments);
});

/**
 * GET /api/instruments/:instrumentId/songs
 * Lista as músicas vinculadas a um instrumento (Dashboard).
 */
router.get('/instruments/:instrumentId/songs', authMiddleware, async (req, res) => {
  const instrumentId = parseId(req.params.instrumentId);
  if (!instrumentId) {
    return res.status(400).json({ error: 'instrumentId deve ser um inteiro positivo.' });
  }

  const instrument = await prisma.instrument.findUnique({
    where: { id: instrumentId },
    include: {
      songs: {
        include: { song: true },
        orderBy: { song: { title: 'asc' } },
      },
    },
  });

  if (!instrument) {
    return res.status(404).json({ error: 'Instrumento não encontrado.' });
  }

  res.json(instrument.songs.map((si) => si.song));
});

/**
 * GET /api/lessons/:songId/:instrumentId
 * Rota principal do Player: retorna a aula completa em um único request
 * (música, instrumento, 4 módulos ordenados por dificuldade e seus materiais).
 */
router.get('/lessons/:songId/:instrumentId', authMiddleware, async (req, res) => {
  const songId = parseId(req.params.songId);
  const instrumentId = parseId(req.params.instrumentId);

  if (!songId || !instrumentId) {
    return res.status(400).json({ error: 'songId e instrumentId devem ser inteiros positivos.' });
  }

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
            orderBy: { order_index: 'asc' },
            include: { materials: { orderBy: { id: 'asc' } } },
          },
        },
      },
    },
  });

  if (!lesson) {
    return res.status(404).json({
      error: 'Aula não encontrada para esta combinação de música e instrumento.',
    });
  }

  res.json(lesson);
});

module.exports = router;
