// Seed - Fase 2: usuários (admin + aluno) e trilha "Rumo ao Lar" com
// 4 níveis x 3 aulas por instrumento, cada aula com seus materiais.
// Idempotente: limpa as tabelas e reinicia os IDs a cada execução.
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Vídeo provisório (os oficiais serão gravados depois). O parâmetro `start`
// faz cada aula abrir num ponto diferente, para a troca de aula ficar visível.
const PLACEHOLDER_VIDEO_ID = 'dQw4w9WgXcQ';
const videoUrl = (startSeconds) =>
  `https://www.youtube.com/embed/${PLACEHOLDER_VIDEO_ID}?start=${startSeconds}`;

const LEVELS = [
  { level: 1, slug: 'facil', label: 'Fácil' },
  { level: 2, slug: 'medio', label: 'Médio' },
  { level: 3, slug: 'dificil', label: 'Difícil' },
  { level: 4, slug: 'avancado', label: 'Avançado' },
];

// Descrição do nível (Module) por instrumento
const DESCRIPTIONS = {
  Teclado: {
    1: 'Melodia principal com a mão direita e acordes em bloco (tríades) na mão esquerda, apenas nos tempos fortes.',
    2: 'Acordes com inversões para suavizar as transições e baixo simples na mão esquerda acompanhando a harmonia.',
    3: 'Arranjo a duas mãos com arpejos na mão esquerda, dinâmica (piano/forte) e uso do pedal de sustentação.',
    4: 'Arranjo completo de acompanhamento coral: rearmonização, notas de passagem, introdução e interlúdios.',
  },
  'Violão': {
    1: 'Acordes abertos básicos com batida simples para baixo, acompanhando a melodia do coral.',
    2: 'Introdução de pestanas e batida com variação (baixo-cima), respeitando as dinâmicas da música.',
    3: 'Dedilhado (fingerstyle) com padrão polegar-indicador-médio e baixos alternados.',
    4: 'Arranjo solo com melodia e harmonia simultâneas, acordes com tensões e condução de vozes.',
  },
};

// Títulos das 3 aulas de cada nível (progressão dentro do nível)
const LESSON_TITLES = {
  1: ['Conhecendo a música e os acordes', 'Estrofe passo a passo', 'Refrão e música completa'],
  2: ['Revisão e novas posições', 'Transições suaves entre acordes', 'Tocando junto com o coral'],
  3: ['Técnica do arranjo', 'Construindo a estrofe e o refrão', 'Dinâmica e interpretação'],
  4: ['Análise harmônica do arranjo', 'Introdução e interlúdios', 'Performance completa'],
};

// Aula 1 traz partitura + cifra do nível; as demais trazem a partitura daquela aula
function buildMaterials(instrumentSlug, levelSlug, levelLabel, lessonNumber) {
  const base = `/materials/${instrumentSlug}/${levelSlug}`;
  const materials = [
    {
      title: `Partitura - ${levelLabel}, Aula ${lessonNumber}`,
      file_url: `${base}/aula${lessonNumber}_partitura.pdf`,
      type: 'pdf',
    },
  ];
  if (lessonNumber === 1) {
    materials.push({
      title: `Cifra completa - Nível ${levelLabel}`,
      file_url: `${base}/cifra_completa.pdf`,
      type: 'pdf',
    });
  }
  return materials;
}

async function main() {
  console.log('Limpando tabelas...');
  // Ordem respeita as FKs (filhos antes dos pais)
  await prisma.material.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.module.deleteMany();
  await prisma.songInstrument.deleteMany();
  await prisma.song.deleteMany();
  await prisma.user.deleteMany();
  await prisma.instrument.deleteMany();
  // Reinicia os contadores de autoincremento do SQLite (IDs previsíveis a cada execução)
  await prisma.$executeRawUnsafe('DELETE FROM sqlite_sequence');

  console.log('Inserindo dados...');

  const teclado = await prisma.instrument.create({ data: { name: 'Teclado' } });
  const violao = await prisma.instrument.create({ data: { name: 'Violão' } });

  // Usuários de teste (senhas com hash bcrypt)
  const users = [
    { name: 'Administrador', email: 'admin@harmonia.com', password: 'admin123', role: 'ADMIN', preferred_instrument_id: null },
    { name: 'Aluno Teste', email: 'aluno@harmonia.com', password: 'aluno123', role: 'USER', preferred_instrument_id: teclado.id },
  ];
  for (const u of users) {
    await prisma.user.create({ data: { ...u, password: await bcrypt.hash(u.password, 10) } });
    console.log(`  ✔ Usuário ${u.role.padEnd(5)} ${u.email} / ${u.password}`);
  }

  const song = await prisma.song.create({
    data: { title: 'Rumo ao Lar', artist: 'Coral UNASP' },
  });

  const instruments = [
    { record: teclado, slug: 'teclado' },
    { record: violao, slug: 'violao' },
  ];

  for (const { record, slug } of instruments) {
    // Nested write: trilha -> 4 módulos -> 3 aulas cada -> materiais
    const trail = await prisma.songInstrument.create({
      data: {
        song_id: song.id,
        instrument_id: record.id,
        modules: {
          create: LEVELS.map(({ level, slug: levelSlug, label }) => ({
            difficulty_level: level,
            description: DESCRIPTIONS[record.name][level],
            lessons: {
              create: LESSON_TITLES[level].map((title, i) => ({
                title: `Aula ${i + 1} - ${title}`,
                video_url: videoUrl(i * 30),
                order_index: i + 1,
                materials: { create: buildMaterials(slug, levelSlug, label, i + 1) },
              })),
            },
          })),
        },
      },
      include: { modules: { include: { lessons: { include: { materials: true } } } } },
    });

    const lessons = trail.modules.flatMap((m) => m.lessons);
    const materials = lessons.flatMap((l) => l.materials);
    console.log(
      `  ✔ "${song.title}" + ${record.name} (songId=${song.id}, instrumentId=${record.id}): ` +
        `${trail.modules.length} módulos, ${lessons.length} aulas, ${materials.length} materiais`
    );
  }

  console.log('Seed concluído com sucesso!');
}

main()
  .catch((err) => {
    console.error('Erro no seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
