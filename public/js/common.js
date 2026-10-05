// Utilitários compartilhados entre Dashboard e Player.

// Metadados visuais de cada nível de dificuldade (índice = difficulty_level - 1).
// As classes ficam escritas por extenso para o Tailwind CDN detectá-las.
const LEVELS = [
  {
    label: 'Fácil',
    dot: 'bg-emerald-400',
    text: 'text-emerald-300',
    bar: 'bg-emerald-400',
    active: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/60 shadow-[0_0_30px_-8px_rgba(52,211,153,0.6)]',
  },
  {
    label: 'Médio',
    dot: 'bg-sky-400',
    text: 'text-sky-300',
    bar: 'bg-sky-400',
    active: 'bg-sky-500/15 text-sky-200 ring-sky-400/60 shadow-[0_0_30px_-8px_rgba(56,189,248,0.6)]',
  },
  {
    label: 'Difícil',
    dot: 'bg-amber-400',
    text: 'text-amber-300',
    bar: 'bg-amber-400',
    active: 'bg-amber-500/15 text-amber-200 ring-amber-400/60 shadow-[0_0_30px_-8px_rgba(251,191,36,0.6)]',
  },
  {
    label: 'Avançado',
    dot: 'bg-rose-400',
    text: 'text-rose-300',
    bar: 'bg-rose-400',
    active: 'bg-rose-500/15 text-rose-200 ring-rose-400/60 shadow-[0_0_30px_-8px_rgba(251,113,133,0.6)]',
  },
];

// Ícones SVG por instrumento (fallback: nota musical)
const INSTRUMENT_ICONS = {
  teclado:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="h-5 w-5"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M7 5v9M12 5v9M17 5v9" /><path d="M7 14v5M12 14v5M17 14v5" stroke-opacity=".5"/></svg>',
  'violão':
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="h-5 w-5"><path d="M20.5 3.5l-6.2 6.2"/><path d="M18.5 2.5l3 3"/><path d="M14.3 9.7a4 4 0 0 0-5.6-.2 3 3 0 0 1-2.3.9 3.5 3.5 0 0 0-2.6 6 3.5 3.5 0 0 0 6 2.6c.1-.9.4-1.7.9-2.3a4 4 0 0 0-.2-5.6"/><circle cx="9" cy="15" r="1.4"/></svg>',
  default:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="h-5 w-5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
};

function instrumentIcon(name) {
  return INSTRUMENT_ICONS[String(name).toLowerCase()] || INSTRUMENT_ICONS.default;
}

// Evita injeção de HTML ao interpolar dados da API em template strings
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// fetch + JSON com mensagem de erro amigável vinda da API
async function fetchJSON(url) {
  const token = localStorage.getItem('token');
  const headers = {};
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  
  const res = await fetch(url, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
      return;
    }
    throw new Error(data.error || `Falha na requisição (HTTP ${res.status}).`);
  }
  return data;
}
