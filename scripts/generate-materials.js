// Gera PDFs fictícios (válidos) em /public para cada Material cadastrado no banco,
// evitando links quebrados (404) no Player enquanto os arquivos oficiais não existem.
// Uso: npm run materials
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const LEVEL_LABELS = ['Fácil', 'Médio', 'Difícil', 'Avançado'];

// Escapa caracteres especiais de strings PDF
const pdfText = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

// Quebra texto longo em linhas de até `max` caracteres
function wrap(text, max = 80) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    if ((line + ' ' + word).trim().length > max) {
      lines.push(line);
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Monta um PDF 1.4 mínimo de uma página (Helvetica, WinAnsi para acentos)
function buildPdf(lines) {
  const content = lines
    .map(({ text, size, y }) => `BT /F1 ${size} Tf 72 ${y} Td (${pdfText(text)}) Tj ET`)
    .join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}

async function main() {
  const materials = await prisma.material.findMany({
    include: {
      lesson: {
        include: { module: { include: { song_instrument: { include: { song: true, instrument: true } } } } },
      },
    },
  });

  for (const material of materials) {
    const { lesson } = material;
    const { module } = lesson;
    const { song, instrument } = module.song_instrument;

    const rows = [
      { text: material.title, size: 22 },
      { text: `${song.title} - ${song.artist}`, size: 14 },
      { text: `Instrumento: ${instrument.name}`, size: 12 },
      { text: `Nível ${module.difficulty_level}: ${LEVEL_LABELS[module.difficulty_level - 1]}`, size: 12 },
      { text: lesson.title, size: 12 },
      { text: '', size: 12 },
      ...wrap(module.description).map((text) => ({ text, size: 11 })),
      { text: '', size: 12 },
      { text: 'Material fictício para demonstração do MVP (TCC).', size: 10 },
    ];

    let y = 720;
    const lines = rows.map((row) => {
      const line = { ...row, y };
      y -= row.size + 12;
      return line;
    });

    const target = path.join(PUBLIC_DIR, material.file_url);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buildPdf(lines));
    console.log(`  ✔ ${material.file_url}`);
  }

  console.log(`${materials.length} PDFs gerados em public/.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
