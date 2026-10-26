// Player da Aula — Harmonia

const token = localStorage.getItem('token');
if (!token) {
  window.location.replace('login.html');
}

const params = new URLSearchParams(window.location.search);
const songId = params.get('songId');
const instrumentId = params.get('instrumentId');

// Trava de trilha no cliente (ADMIN tem acesso livre a todas as combinações)
const userPayload = getTokenPayload();
if (token && userPayload && userPayload.role !== 'ADMIN') {
  if (userPayload.preferred_instrument_id && Number(instrumentId) !== Number(userPayload.preferred_instrument_id)) {
    window.location.replace('dashboard.html');
  }
}

// Estado da aula
let modulosDaAula = [];
let currentModuleIndex = -1;
let currentLessonIndex = -1;

// Referências de DOM
const videoPlayer = document.querySelector('#video-player');
const videoSkeleton = document.querySelector('#video-skeleton');
const videoEmptyState = document.querySelector('#video-empty-state');
const levelTabs = document.querySelector('#level-tabs');
const levelBadge = document.querySelector('#level-badge');
const levelProgress = document.querySelector('#level-progress');
const levelDescription = document.querySelector('#level-description');
const playlistList = document.querySelector('#playlist-list');
const playlistCount = document.querySelector('#playlist-count');
const materialsList = document.querySelector('#materials-list');
const materialsCount = document.querySelector('#materials-count');
const materialsLevel = document.querySelector('#materials-level');
const prevLessonBtn = document.querySelector('#prev-lesson-btn');
const nextLessonBtn = document.querySelector('#next-lesson-btn');
const currentLessonIndicator = document.querySelector('#current-lesson-indicator');

// Base das abas
const TAB_BASE =
  'level-tab flex flex-col items-start gap-1 rounded-xl p-3.5 text-left border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer';
const TAB_INACTIVE =
  'bg-ink-900/60 text-zinc-400 border-zinc-800/80 hover:bg-ink-800 hover:text-white hover:border-zinc-700';

function fileName(path) {
  return String(path || '').split('/').pop() || 'arquivo';
}

function renderHeader(lesson) {
  const { song, instrument } = lesson;
  document.querySelector('#lesson-title').textContent = `${song.title} — ${instrument.name}`;
  document.querySelector('#lesson-subtitle').textContent = song.artist;
  document.title = `${song.title} (${instrument.name}) | Harmonia`;
}

// Renderiza os botões das abas de níveis disponíveis
function renderTabs() {
  levelTabs.innerHTML = modulosDaAula
    .map((module, index) => {
      const lvl = getLevelMeta(module.difficulty_level);
      return `
        <button type="button" role="tab" id="level-tab-${index}" data-index="${index}"
                aria-selected="false" aria-controls="level-panel" class="${TAB_BASE} ${TAB_INACTIVE}">
          <span class="flex items-center gap-2 text-sm font-bold">
            <span class="h-2 w-2 rounded-full ${lvl.dot}"></span>${lvl.label}
          </span>
          <span class="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Nível ${module.difficulty_level}</span>
        </button>`;
    })
    .join('');
}

// Atualiza o estado visual das abas com a cor do nível ativo
function updateTabs() {
  const currentModule = modulosDaAula[currentModuleIndex];
  if (!currentModule) return;
  const activeMeta = getLevelMeta(currentModule.difficulty_level);

  levelTabs.querySelectorAll('.level-tab').forEach((tab) => {
    const index = Number(tab.dataset.index);
    const isActive = index === currentModuleIndex;

    if (isActive) {
      tab.className = `${TAB_BASE} ${activeMeta.activeTab}`;
      tab.setAttribute('aria-selected', 'true');
      tab.tabIndex = 0;
    } else {
      tab.className = `${TAB_BASE} ${TAB_INACTIVE}`;
      tab.setAttribute('aria-selected', 'false');
      tab.tabIndex = -1;
    }
  });
}

// Renderiza o painel explicativo do nível ativo
function renderLevelPanel(module) {
  const lvl = getLevelMeta(module.difficulty_level);

  levelBadge.className = `inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${lvl.badge}`;
  levelBadge.innerHTML = `
    <span class="flex h-3 items-end gap-[2px]">
      <span class="eq-bar h-3"></span><span class="eq-bar h-3"></span><span class="eq-bar h-3"></span>
    </span>
    Nível ${module.difficulty_level} &middot; ${lvl.label}`;

  // Barra de progressão preenchida até o nível atual
  levelProgress.innerHTML = LEVELS.map(
    (l) =>
      `<span class="h-1.5 flex-1 rounded-full transition-colors duration-300 ${
        l.level <= module.difficulty_level ? l.bar : 'bg-zinc-800'
      }" title="${l.label}"></span>`
  ).join('');

  levelDescription.textContent = module.description;
}

// Renderiza a lista de aulas (playlist) do nível
function renderPlaylist(module) {
  const lessons = module.lessons || [];
  playlistCount.textContent = `${lessons.length} ${lessons.length === 1 ? 'aula' : 'aulas'}`;

  if (lessons.length === 0) {
    playlistList.innerHTML = `<li class="text-xs text-zinc-500 py-3 text-center italic">Nenhuma aula neste nível.</li>`;
    return;
  }

  playlistList.innerHTML = lessons
    .map((lesson, idx) => {
      const isActive = idx === currentLessonIndex;
      return `
        <li>
          <button type="button"
                  class="playlist-btn w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between gap-2 ${
                    isActive
                      ? 'bg-amber-400 text-ink-950 font-bold shadow-sm'
                      : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
                  }"
                  data-index="${idx}">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-4 text-center shrink-0 ${isActive ? 'text-ink-950' : 'text-zinc-500'} font-bold">${idx + 1}.</span>
              <span class="truncate">${escapeHtml(lesson.title)}</span>
            </div>
            ${isActive ? '<span class="text-[10px] uppercase font-bold tracking-wider shrink-0">Tocando</span>' : ''}
          </button>
        </li>`;
    })
    .join('');
}

// Renderiza a lista de materiais em PDF/cifra
function renderMaterials(lesson) {
  const materials = lesson?.materials || [];

  materialsCount.textContent = `${materials.length}`;
  materialsLevel.textContent = lesson ? `Anexos da ${lesson.title}` : 'Sem materiais';

  if (materials.length === 0) {
    materialsList.innerHTML = `
      <li class="rounded-xl border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-500">
        Nenhum material complementar cadastrado para esta aula.
      </li>`;
    return;
  }

  materialsList.innerHTML = materials
    .map((mat, i) => {
      const isExternal = /^https?:\/\//i.test(mat.file_url);
      const safeUrl = escapeHtml(mat.file_url);

      return `
        <li class="animate-fade-up" style="animation-delay:${i * 50}ms">
          <a href="${safeUrl}"
             target="_blank"
             rel="noopener noreferrer"
             ${!isExternal ? 'download' : ''}
             class="group flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-ink-900/60 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/40 hover:bg-zinc-800/60">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-zinc-800 text-[10px] font-bold uppercase tracking-wider text-amber-400 ring-1 ring-zinc-700">
              ${escapeHtml(mat.type)}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-xs font-semibold text-zinc-100 group-hover:text-amber-300 transition-colors">
                ${escapeHtml(mat.title)}
              </span>
              <span class="block truncate text-[11px] text-zinc-500">
                ${escapeHtml(fileName(mat.file_url))}
              </span>
            </span>
            <span class="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-zinc-500 transition group-hover:bg-amber-400 group-hover:text-ink-950">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5"><path d="M12 4v12m0 0l-5-5m5 5l5-5M5 20h14"/></svg>
            </span>
          </a>
        </li>`;
    })
    .join('');
}

function updateNavigationControls(lessonsCount) {
  if (lessonsCount <= 0) {
    prevLessonBtn.disabled = true;
    nextLessonBtn.disabled = true;
    currentLessonIndicator.textContent = 'Sem aulas disponíveis';
    return;
  }

  prevLessonBtn.disabled = currentLessonIndex <= 0;
  nextLessonBtn.disabled = currentLessonIndex >= lessonsCount - 1;
  currentLessonIndicator.textContent = `Aula ${currentLessonIndex + 1} de ${lessonsCount}`;
}

// Troca de aula dentro do módulo
function changeLesson(index) {
  const module = modulosDaAula[currentModuleIndex];
  if (!module) return;

  const lessons = module.lessons || [];

  // Correção do Bug B1: se o módulo não tiver nenhuma aula
  if (lessons.length === 0) {
    currentLessonIndex = -1;
    videoPlayer.src = 'about:blank';
    videoSkeleton.classList.add('hidden');
    videoEmptyState.classList.remove('hidden');
    renderPlaylist(module);
    renderMaterials(null);
    updateNavigationControls(0);
    return;
  }

  const safeIndex = Math.max(0, Math.min(index, lessons.length - 1));
  const lesson = lessons[safeIndex];
  if (!lesson) return;

  currentLessonIndex = safeIndex;

  videoEmptyState.classList.add('hidden');
  videoSkeleton.classList.remove('hidden');
  videoPlayer.src = lesson.video_url;

  renderPlaylist(module);
  renderMaterials(lesson);
  updateNavigationControls(lessons.length);
}

// Troca de módulo/nível de dificuldade
function changeModule(index) {
  const module = modulosDaAula[index];
  if (!module) return;

  currentModuleIndex = index;
  updateTabs();
  renderLevelPanel(module);
  changeLesson(0);
}

// Troca por número de nível real (1 a 4) — resolve B9
function changeByLevelNumber(levelNum) {
  const targetIndex = modulosDaAula.findIndex(m => m.difficulty_level === levelNum);
  if (targetIndex !== -1) {
    changeModule(targetIndex);
    const tabEl = document.querySelector(`#level-tab-${targetIndex}`);
    if (tabEl) tabEl.focus();
  }
}

// Event Listeners
levelTabs.addEventListener('click', (event) => {
  const tab = event.target.closest('.level-tab');
  if (tab) changeModule(Number(tab.dataset.index));
});

playlistList.addEventListener('click', (event) => {
  const btn = event.target.closest('.playlist-btn');
  if (btn) changeLesson(Number(btn.dataset.index));
});

prevLessonBtn.addEventListener('click', () => {
  if (currentLessonIndex > 0) changeLesson(currentLessonIndex - 1);
});

nextLessonBtn.addEventListener('click', () => {
  const module = modulosDaAula[currentModuleIndex];
  if (module && currentLessonIndex < (module.lessons?.length || 0) - 1) {
    changeLesson(currentLessonIndex + 1);
  }
});

// Atalhos do Teclado: teclas 1 a 4 para níveis
document.addEventListener('keydown', (event) => {
  // Ignora se o usuário estiver focado em campos editáveis
  if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  const num = Number(event.key);
  if (num >= 1 && num <= 4) {
    changeByLevelNumber(num);
  }
});

// Seta Esquerda/Direita nas abas de nível quando em foco
levelTabs.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
  const step = event.key === 'ArrowRight' ? 1 : -1;
  const next = (currentModuleIndex + step + modulosDaAula.length) % modulosDaAula.length;
  changeModule(next);
  const tabEl = document.querySelector(`#level-tab-${next}`);
  if (tabEl) tabEl.focus();
});

videoPlayer.addEventListener('load', () => {
  videoSkeleton.classList.add('hidden');
});

function showError(message) {
  document.querySelector('#lesson-content').classList.add('hidden');
  document.querySelector('#error-state').classList.remove('hidden');
  document.querySelector('#error-message').textContent = message;
  document.querySelector('#lesson-title').textContent = 'Aula Indisponível';
}

async function init() {
  if (!songId || !instrumentId) {
    showError('Parâmetros da aula ausentes na URL. Por favor, volte ao Dashboard e selecione uma música.');
    return;
  }

  try {
    const lesson = await fetchJSON(
      `/api/lessons/${encodeURIComponent(songId)}/${encodeURIComponent(instrumentId)}`
    );

    modulosDaAula = lesson.modules || [];
    renderHeader(lesson);

    if (modulosDaAula.length === 0) {
      showError('Esta música ainda não possui níveis de arranjo cadastrados para este instrumento.');
      return;
    }

    renderTabs();
    changeModule(0); // Inicia no primeiro nível cadastrado (Fácil)

  } catch (err) {
    showError(err.message);
  }
}

init();
