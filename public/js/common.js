// Utilitários compartilhados entre todas as páginas do Harmonia

// Metadados visuais de cada nível de dificuldade (índice = difficulty_level - 1)
const LEVELS = [
  {
    level: 1,
    label: 'Fácil',
    slug: 'facil',
    dot: 'bg-emerald-400',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    bar: 'bg-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
    activeTab: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/50 shadow-[0_0_24px_-6px_rgba(52,211,153,0.4)]',
  },
  {
    level: 2,
    label: 'Médio',
    slug: 'medio',
    dot: 'bg-sky-400',
    text: 'text-sky-400',
    border: 'border-sky-500/30',
    bar: 'bg-sky-400',
    badge: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30',
    activeTab: 'bg-sky-500/15 text-sky-200 border-sky-500/50 shadow-[0_0_24px_-6px_rgba(56,189,248,0.4)]',
  },
  {
    level: 3,
    label: 'Difícil',
    slug: 'dificil',
    dot: 'bg-amber-400',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    bar: 'bg-amber-400',
    badge: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
    activeTab: 'bg-amber-500/15 text-amber-200 border-amber-500/50 shadow-[0_0_24px_-6px_rgba(245,158,11,0.4)]',
  },
  {
    level: 4,
    label: 'Avançado',
    slug: 'avancado',
    dot: 'bg-rose-400',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    bar: 'bg-rose-400',
    badge: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30',
    activeTab: 'bg-rose-500/15 text-rose-200 border-rose-500/50 shadow-[0_0_24px_-6px_rgba(244,63,94,0.4)]',
  },
];

function getLevelMeta(level) {
  const n = Number(level);
  return LEVELS.find(l => l.level === n) || LEVELS[0];
}

// Ícones SVG dos instrumentos
const INSTRUMENT_ICONS = {
  teclado: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M7 5v9M12 5v9M17 5v9"/><path d="M7 14v5M12 14v5M17 14v5" stroke-opacity=".5"/></svg>',
  violao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4"><path d="M20.5 3.5l-6.2 6.2"/><path d="M18.5 2.5l3 3"/><path d="M14.3 9.7a4 4 0 0 0-5.6-.2 3 3 0 0 1-2.3.9 3.5 3.5 0 0 0-2.6 6 3.5 3.5 0 0 0 6 2.6c.1-.9.4-1.7.9-2.3a4 4 0 0 0-.2-5.6"/><circle cx="9" cy="15" r="1.4"/></svg>',
  default: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
};

function normalizeSlug(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function instrumentIcon(name) {
  const slug = normalizeSlug(name);
  return INSTRUMENT_ICONS[slug] || INSTRUMENT_ICONS.default;
}

// Gera matiz harmônico e consistente para a capa gerada de cada música (0 a 360)
function getSongCoverHue(songId, title) {
  const str = `${songId || 1}-${title || 'harmonia'}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

// Iniciais da música para a capa gerada
function getInitials(title) {
  return String(title || '')
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0] || '')
    .join('')
    .toUpperCase() || 'HM';
}

// Decodifica o payload do JWT com validação básica de expiração
function getTokenPayload() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    const payload = JSON.parse(json);
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }
    return payload;
  } catch (e) {
    return null;
  }
}

// Sanitização contra XSS
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Wrapper unificado de fetch para chamadas à API
async function fetchJSON(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está em execução.');
  }

  // 204 No Content
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('register.html') && !window.location.pathname.endsWith('index.html')) {
      window.location.href = 'login.html';
    }
    throw new Error(data.error || 'Sessão expirada. Faça login novamente.');
  }

  if (res.status === 403) {
    throw new Error(data.error || 'Acesso negado.');
  }

  if (!res.ok) {
    throw new Error(data.error || `Falha na requisição (HTTP ${res.status}).`);
  }

  return data;
}

// Toasts centralizados
let toastContainer = null;
function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.getElementById('toast-stack');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-stack';
      toastContainer.className = 'toast-stack';
      document.body.appendChild(toastContainer);
    }
  }
  return toastContainer;
}

function showToast(message, isError = false) {
  const container = getToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'toast-error' : 'toast-success'}`;

  const icon = isError
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>';

  toast.innerHTML = `${icon}<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

// Controle de modais acessíveis (fecham com ESC e clique no backdrop)
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('hidden');
  const firstInput = modal.querySelector('input:not([type="hidden"]), select, textarea');
  if (firstInput) setTimeout(() => firstInput.focus(), 50);
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('hidden');
  const form = modal.querySelector('form');
  if (form) form.reset();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal:not(.hidden)').forEach(m => {
      closeModal(m.id);
    });
  }
});

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    closeModal(e.target.id);
  }
});
