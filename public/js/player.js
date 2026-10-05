// Player da Aula (core do TCC)
// Faz UMA única requisição à API e alterna entre os 4 módulos apenas via manipulação de DOM.

const token = localStorage.getItem('token');
if (!token) {
  window.location.href = 'login.html';
}

const params = new URLSearchParams(window.location.search);
const songId = params.get('songId');
const instrumentId = params.get('instrumentId');

// Estado da aula
let modulosDaAula = [];
let currentModuleIndex = -1;
let currentLessonIndex = -1;

// Referências de DOM
const videoPlayer = document.querySelector('#video-player');
const videoSkeleton = document.querySelector('#video-skeleton');
const levelTabs = document.querySelector('#level-tabs');
const levelBadge = document.querySelector('#level-badge');
const levelProgress = document.querySelector('#level-progress');
const levelDescription = document.querySelector('#level-description');
const playlistList = document.querySelector('#playlist-list');
const materialsList = document.querySelector('#materials-list');
const materialsCount = document.querySelector('#materials-count');
const materialsLevel = document.querySelector('#materials-level');

const TAB_BASE =
  'level-tab flex flex-col items-start gap-1 rounded-xl px-4 py-3 text-left ring-1 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400';
const TAB_INACTIVE = 'bg-zinc-900 text-zinc-400 ring-zinc-800 hover:bg-zinc-800 hover:text-zinc-100';

// ---------- Helpers ----------

function levelMeta(module) {
  return LEVELS[module.difficulty_level - 1] || LEVELS[0];
}

// Adiciona parâmetros de player do YouTube sem quebrar URLs que já tenham query string
function buildEmbedUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    url.searchParams.set('rel', '0');
    url.searchParams.set('modestbranding', '1');
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function fileName(path) {
  return String(path).split('/').pop();
}

// ---------- Renderização ----------

function renderHeader(lesson) {
  const { song, instrument } = lesson;
  document.querySelector('#lesson-title').textContent = `${song.title} — ${instrument.name}`;
  document.querySelector('#lesson-subtitle').textContent = song.artist;
  document.title = `${song.title} – ${instrument.name} | Harmonia`;

  // "Voltar" retorna ao Dashboard já com o instrumento selecionado
  document.querySelector('#back-btn').href = `index.html?instrumentId=${instrument.id}`;
}

function renderTabs() {
  levelTabs.innerHTML = modulosDaAula
    .map((module, index) => {
      const lvl = levelMeta(module);
      return `
        <button type="button" role="tab" id="level-tab-${index}" data-index="${index}"
                aria-selected="false" aria-controls="level-panel" class="${TAB_BASE} ${TAB_INACTIVE}">
          <span class="flex items-center gap-2 text-sm font-semibold">
            <span class="h-2 w-2 rounded-full ${lvl.dot}"></span>${lvl.label}
          </span>
          <span class="text-[11px] uppercase tracking-wider opacity-60">Nível ${module.difficulty_level}</span>
        </button>`;
    })
    .join('');
}

function updateTabs() {
  levelTabs.querySelectorAll('.level-tab').forEach((tab) => {
    const index = Number(tab.dataset.index);
    const isActive = index === currentModuleIndex;
    
    // Simplificar visual da aba para estética SaaS
    tab.className = `${TAB_BASE} ${isActive ? 'bg-zinc-100 text-zinc-900 ring-zinc-300' : TAB_INACTIVE}`;
    tab.setAttribute('aria-selected', String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });
}

function renderLevelPanel(module) {
  const lvl = levelMeta(module);

  levelBadge.className = `inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold ${lvl.text}`;
  levelBadge.innerHTML = `
    <span class="flex h-3 items-end gap-[2px]"><span class="eq-bar h-3"></span><span class="eq-bar h-3"></span><span class="eq-bar h-3"></span></span>
    Nível ${module.difficulty_level} · ${lvl.label}`;

  // Barra de progressão: segmentos preenchidos até o nível atual
  levelProgress.innerHTML = LEVELS.map(
    (l, i) =>
      `<span class="h-1.5 flex-1 rounded-full transition-colors duration-300 ${
        i < module.difficulty_level ? l.bar : 'bg-white/10'
      }"></span>`
  ).join('');

  levelDescription.textContent = module.description;
  restartAnimation(levelDescription);
}

function renderPlaylist(module) {
  const lessons = module.lessons || [];
  
  if (lessons.length === 0) {
    playlistList.innerHTML = `<li class="text-sm text-zinc-500 py-2">Nenhuma aula neste módulo.</li>`;
    return;
  }

  playlistList.innerHTML = lessons.map((lesson, idx) => {
    const isActive = idx === currentLessonIndex;
    return `
      <li>
        <button type="button" class="playlist-btn w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-zinc-100 text-zinc-900 font-semibold' : 'text-zinc-300 hover:bg-zinc-800'}" data-index="${idx}">
          ${idx + 1}. ${escapeHtml(lesson.title)}
        </button>
      </li>
    `;
  }).join('');
}

function renderMaterials(lesson) {
  const materials = lesson?.materials || [];

  materialsCount.textContent = `${materials.length}`;
  materialsLevel.innerHTML = `Arquivos desta aula`;

  if (materials.length === 0) {
    materialsList.innerHTML = `
      <li class="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
        Nenhum material disponível para esta aula.
      </li>`;
    return;
  }

  materialsList.innerHTML = materials
    .map(
      (material, i) => `
        <li class="animate-fade-up" style="animation-delay:${i * 70}ms">
          <a href="${escapeHtml(material.file_url)}" target="_blank" rel="noopener" download
             id="material-link-${material.id}"
             class="group flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-800">
            <span class="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-zinc-800 text-[10px] font-bold uppercase tracking-wide text-zinc-300 ring-1 ring-zinc-700">
              ${escapeHtml(material.type)}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold text-zinc-100 group-hover:text-white">${escapeHtml(material.title)}</span>
              <span class="block truncate text-xs text-zinc-500">${escapeHtml(fileName(material.file_url))}</span>
            </span>
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-zinc-500 transition group-hover:bg-zinc-100 group-hover:text-zinc-900">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path d="M12 4v12m0 0l-5-5m5 5l5-5M5 20h14"/></svg>
            </span>
          </a>
        </li>`
    )
    .join('');
}

function restartAnimation(el) {
  el.classList.remove('animate-fade-up');
  void el.offsetWidth;
  el.classList.add('animate-fade-up');
}

function showError(message) {
  document.querySelector('#lesson-content').classList.add('hidden');
  document.querySelector('#error-state').classList.remove('hidden');
  document.querySelector('#error-message').textContent = message;
  document.querySelector('#lesson-title').textContent = 'Aula não encontrada';
}

// ---------- Lógica principal ----------

function changeLesson(index) {
  const module = modulosDaAula[currentModuleIndex];
  if (!module) return;
  const lesson = module.lessons[index];
  if (!lesson) return;

  currentLessonIndex = index;
  
  videoSkeleton.classList.remove('hidden');
  videoPlayer.src = buildEmbedUrl(lesson.video_url);

  renderPlaylist(module);
  renderMaterials(lesson);
}

function changeModule(index) {
  const module = modulosDaAula[index];
  if (!module) return;

  currentModuleIndex = index;
  currentLessonIndex = 0; // Sempre inicia na primeira aula do módulo

  updateTabs();
  renderLevelPanel(module);
  changeLesson(0);
}

// Eventos: clique nas abas (delegação), atalhos 1–4 e setas
levelTabs.addEventListener('click', (event) => {
  const tab = event.target.closest('.level-tab');
  if (tab) changeModule(Number(tab.dataset.index));
});

playlistList.addEventListener('click', (event) => {
  const btn = event.target.closest('.playlist-btn');
  if (btn) changeLesson(Number(btn.dataset.index));
});

levelTabs.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
  const step = event.key === 'ArrowRight' ? 1 : -1;
  const next = (currentModuleIndex + step + modulosDaAula.length) % modulosDaAula.length;
  changeModule(next);
  document.querySelector(`#level-tab-${next}`).focus();
});

document.addEventListener('keydown', (event) => {
  if (event.target.closest('input, textarea') || event.ctrlKey || event.metaKey || event.altKey) return;
  const n = Number(event.key);
  if (n >= 1 && n <= modulosDaAula.length) changeModule(n - 1);
});

videoPlayer.addEventListener('load', () => videoSkeleton.classList.add('hidden'));

async function init() {
  if (!songId || !instrumentId) {
    showError('Parâmetros da aula ausentes na URL. Selecione uma música no Dashboard.');
    return;
  }

  try {
    const lesson = await fetchJSON(
      `/api/lessons/${encodeURIComponent(songId)}/${encodeURIComponent(instrumentId)}`
    );

    modulosDaAula = lesson.modules || [];
    renderHeader(lesson);

    if (modulosDaAula.length === 0) {
      showError('Esta aula ainda não possui módulos cadastrados.');
      return;
    }

    renderTabs();
    changeModule(0); // inicia no nível Fácil, Aula 1

  } catch (err) {
    showError(err.message);
  }
}

init();
