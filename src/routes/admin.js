const { Router } = require('express');
const prisma = require('../lib/prisma');

const router = Router();

// ==========================================
// ROTAS AUXILIARES PARA POPULAR OS SELECTS
// ==========================================

router.get('/instruments', async (req, res) => {
  const instruments = await prisma.instrument.findMany({ orderBy: { name: 'asc' } });
  res.json(instruments);
});

router.get('/song-instruments', async (req, res) => {
  const list = await prisma.songInstrument.findMany({
    include: { song: true, instrument: true },
    orderBy: { song: { title: 'asc' } },
  });
  res.json(list);
});

router.get('/modules', async (req, res) => {
  const modules = await prisma.module.findMany({
    include: {
      song_instrument: {
        include: { song: true, instrument: true }
      }
    },
    orderBy: [
      { song_instrument: { song: { title: 'asc' } } },
      { difficulty_level: 'asc' }
    ]
  });
  res.json(modules);
});

router.get('/lessons', async (req, res) => {
  const lessons = await prisma.lesson.findMany({
    include: {
      module: {
        include: {
          song_instrument: {
            include: { song: true, instrument: true }
          }
        }
      }
    },
    orderBy: [
      { module: { song_instrument: { song: { title: 'asc' } } } },
      { module: { difficulty_level: 'asc' } },
      { order_index: 'asc' }
    ]
  });
  res.json(lessons);
});

// ==========================================
// ROTAS POST (CRIAÇÃO DE DADOS)
// ==========================================

/**
 * POST /api/admin/songs
 * Cria uma música e já a vincula ao instrumento fornecido.
 */
router.post('/songs', async (req, res) => {
  const { title, artist, instrument_id } = req.body;
  if (!title || !artist || !instrument_id) {
    return res.status(400).json({ error: 'Título, artista e instrumento são obrigatórios.' });
  }

  try {
    const song = await prisma.song.create({
      data: {
        title,
        artist,
        instruments: {
          create: [{ instrument_id: Number(instrument_id) }]
        }
      },
      include: { instruments: true }
    });
    res.status(201).json(song);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar música.' });
  }
});

/**
 * POST /api/admin/modules
 * Adiciona um nível de dificuldade para uma música/instrumento.
 */
router.post('/modules', async (req, res) => {
  const { song_instrument_id, difficulty_level, description } = req.body;
  if (!song_instrument_id || !difficulty_level || !description) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    const module = await prisma.module.create({
      data: {
        song_instrument_id: Number(song_instrument_id),
        difficulty_level: Number(difficulty_level),
        description
      }
    });
    res.status(201).json(module);
  } catch (err) {
    console.error(err);
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Já existe este nível para esta música.' });
    }
    res.status(500).json({ error: 'Erro ao criar módulo.' });
  }
});

/**
 * POST /api/admin/lessons
 * Adiciona uma aula a um módulo.
 */
router.post('/lessons', async (req, res) => {
  const { module_id, title, video_url, order_index } = req.body;
  if (!module_id || !title || !video_url) {
    return res.status(400).json({ error: 'module_id, title e video_url são obrigatórios.' });
  }

  try {
    const lesson = await prisma.lesson.create({
      data: {
        module_id: Number(module_id),
        title,
        video_url,
        order_index: order_index ? Number(order_index) : 0
      }
    });
    res.status(201).json(lesson);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar aula.' });
  }
});

/**
 * POST /api/admin/materials
 * Anexa um PDF/link a uma aula.
 */
router.post('/materials', async (req, res) => {
  const { lesson_id, title, file_url, type } = req.body;
  if (!lesson_id || !title || !file_url || !type) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    const material = await prisma.material.create({
      data: {
        lesson_id: Number(lesson_id),
        title,
        file_url,
        type
      }
    });
    res.status(201).json(material);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar material.' });
  }
});

module.exports = router;
