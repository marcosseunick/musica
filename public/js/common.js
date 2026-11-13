// Utilitários compartilhados entre todas as páginas do Harmonia

// Metadados visuais de cada nível de dificuldade (índice = difficulty_level - 1)
// Escada Tonal (Accent Ladder) de uma única família cromática (Teal on Paper)
const LEVELS = [
  {
    level: 1,
    label: 'Fácil',
    slug: 'facil',
    dot: 'lvl-dot-1',
    text: 'text-[#06525c]',
    border: '',
    bar: 'lvl-bar-1',
    badge: 'lvl-badge-1',
    activeTab: 'lvl-tab-active-1',
  },
  {
    level: 2,
    label: 'Médio',
    slug: 'medio',
    dot: 'lvl-dot-2',
    text: 'text-[#06525c]',
    border: '',
    bar: 'lvl-bar-2',
    badge: 'lvl-badge-2',
    activeTab: 'lvl-tab-active-2',
  },
  {
    level: 3,
    label: 'Difícil',
    slug: 'dificil',
    dot: 'lvl-dot-3',
    text: 'text-[#06525c]',
    border: '',
    bar: 'lvl-bar-3',
    badge: 'lvl-badge-3',
    activeTab: 'lvl-tab-active-3',
  },
];

function getLevelMeta(level) {
  const n = Number(level);
  return LEVELS.find(l => l.level === n) || LEVELS[0];
}

// Ícones SVG dos instrumentos (suporta qualquer instrumento cadastrado pelo admin)
const INSTRUMENT_ICONS = {
  teclas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M7 5v9M12 5v9M17 5v9"/><path d="M7 14v5M12 14v5M17 14v5" stroke-opacity=".5"/></svg>',
  cordas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4"><path d="M20.5 3.5l-6.2 6.2"/><path d="M18.5 2.5l3 3"/><path d="M14.3 9.7a4 4 0 0 0-5.6-.2 3 3 0 0 1-2.3.9 3.5 3.5 0 0 0-2.6 6 3.5 3.5 0 0 0 6 2.6c.1-.9.4-1.7.9-2.3a4 4 0 0 0-.2-5.6"/><circle cx="9" cy="15" r="1.4"/></svg>',
  sopro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4"><path d="M4 16l12-10"/><path d="M14 4l6 6-4 2-4-4 2-4z"/><circle cx="8" cy="12.5" r="1"/><circle cx="11" cy="10" r="1"/></svg>',
  percussao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4"><ellipse cx="12" cy="10" rx="8" ry="3.5"/><path d="M4 10v6c0 1.9 3.6 3.5 8 3.5s8-1.6 8-3.5v-6"/><path d="M6 4l5 5M18 4l-5 5"/></svg>',
  voz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 17v4M8 21h8"/></svg>',
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
  if (/teclad|pian|orgao|acordeon|sanfon|sintetiz/.test(slug)) return INSTRUMENT_ICONS.teclas;
  if (/viola|violao|guitar|baixo|contrabaixo|ukulel|cavaquinh|violin|celo|harpa|bandol/.test(slug)) return INSTRUMENT_ICONS.cordas;
  if (/sax|flaut|trompet|rombon|clarin|obo|gaita|sopro/.test(slug)) return INSTRUMENT_ICONS.sopro;
  if (/bateri|percuss|cajon|pandeir|tambor|conga/.test(slug)) return INSTRUMENT_ICONS.percussao;
  if (/voz|cant|vocal|coral/.test(slug)) return INSTRUMENT_ICONS.voz;
  return INSTRUMENT_ICONS.default;
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
