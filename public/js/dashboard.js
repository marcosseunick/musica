// Dashboard: lista instrumentos e as músicas vinculadas ao instrumento selecionado.

const token = localStorage.getItem('token');
if (!token) {
  window.location.href = 'login.html';
}

const userStr = localStorage.getItem('user');
let currentUser = null;
if (userStr) {
  try { currentUser = JSON.parse(userStr); } catch (e) {}
}
const instrumentList = document.querySelector('#instrument-list');
const songGrid = document.querySelector('#song-grid');
const songsCount = document.querySelector('#songs-count');
const songsFeedback = document.querySelector('#songs-feedback');

let instruments = [];
let activeInstrumentId = null;

const BTN_BASE =
  'instrument-btn group inline-flex items-center gap-2.5 rounded-xl px-5 py-3 text-sm font-semibold ring-1 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400';
const BTN_ACTIVE = 'bg-zinc-100 text-zinc-900 ring-zinc-300';
const BTN_INACTIVE = 'bg-zinc-900 text-zinc-300 ring-zinc-800 hover:bg-zinc-800 hover:text-white';

// ---------- Renderização ----------

function renderInstruments() {
  instrumentList.innerHTML = instruments
    .map(
      (inst) => `
        <button type="button" role="tab" id="instrument-btn-${inst.id}" data-id="${inst.id}"
                aria-selected="false" class="${BTN_BASE} ${BTN_INACTIVE}">
          ${instrumentIcon(inst.name)}
          <span>${escapeHtml(inst.name)}</span>
        </button>`
    )
    .join('');
}

function updateActiveButton() {
  instrumentList.querySelectorAll('.instrument-btn').forEach((btn) => {
    const isActive = Number(btn.dataset.id) === activeInstrumentId;
    btn.className = `${BTN_BASE} ${isActive ? BTN_ACTIVE : BTN_INACTIVE}`;
    btn.setAttribute('aria-selected', String(isActive));
  });
}

function renderSongSkeletons() {
  hideFeedback();
  songsCount.textContent = '';
  songGrid.innerHTML = Array.from({ length: 4 })
    .map(
      () => `
        <div class="overflow-hidden rounded-2xl border border-white/5 bg-ink-900">
          <div class="skeleton aspect-[16/10]"></div>
          <div class="space-y-2 p-4">
            <div class="skeleton h-4 w-2/3 rounded"></div>
            <div class="skeleton h-3 w-1/3 rounded"></div>
          </div>
        </div>`
    )
    .join('');
}

function renderSongs(songs, instrument) {
  songsCount.textContent = `${songs.length} ${songs.length === 1 ? 'música' : 'músicas'} para ${instrument.name}`;

  if (songs.length === 0) {
    songGrid.innerHTML = '';
    showFeedback(`Ainda não há músicas cadastradas para <strong class="text-zinc-200">${escapeHtml(instrument.name)}</strong>.`);
    return;
  }

  hideFeedback();
  songGrid.innerHTML = songs
    .map(
      (song, i) => `
        <a href="player.html?songId=${song.id}&instrumentId=${instrument.id}"
           id="song-card-${song.id}"
           style="animation-delay:${i * 60}ms"
           class="animate-fade-up group relative overflow-hidden rounded-2xl border border-white/5 bg-ink-900 transition-all duration-300 hover:-translate-y-1 hover:border-ember-400/30 hover:shadow-[0_20px_50px_-20px_rgba(245,158,11,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400">
          <div class="relative aspect-[16/10] overflow-hidden">
            <img src="assets/hero.jpg" alt="" class="h-full w-full object-cover object-right transition-transform duration-700 group-hover:scale-110" />
            <div class="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/30 to-transparent"></div>

            <span class="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-ink-950/70 px-2.5 py-1 text-[11px] font-medium text-zinc-200 backdrop-blur">
              ${instrumentIcon(instrument.name).replace('h-5 w-5', 'h-3.5 w-3.5')}
              ${escapeHtml(instrument.name)}
            </span>

            <span class="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span class="grid h-14 w-14 place-items-center rounded-full bg-ember-400 text-ink-950 shadow-glow transition-transform duration-300 group-hover:scale-100 scale-75">
                <svg viewBox="0 0 24 24" fill="currentColor" class="ml-0.5 h-6 w-6"><path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z"/></svg>
              </span>
            </span>
          </div>

          <div class="p-4">
            <h3 class="font-display text-lg font-semibold text-white group-hover:text-ember-300 transition-colors">${escapeHtml(song.title)}</h3>
            <p class="text-sm text-zinc-500">${escapeHtml(song.artist)}</p>

            <div class="mt-4 flex items-center gap-1.5" aria-label="4 níveis de dificuldade">
              ${LEVELS.map((lvl) => `<span class="h-1.5 flex-1 rounded-full ${lvl.bar} opacity-70" title="${lvl.label}"></span>`).join('')}
            </div>
            <p class="mt-2 text-[11px] uppercase tracking-wider text-zinc-600">Fácil → Avançado</p>
          </div>
        </a>`
    )
    .join('');
}

function showFeedback(html) {
  songsFeedback.innerHTML = html;
  songsFeedback.classList.remove('hidden');
}

function hideFeedback() {
  songsFeedback.classList.add('hidden');
}

// ---------- Lógica ----------

async function selectInstrument(id) {
  const instrument = instruments.find((inst) => inst.id === id);
  if (!instrument) return;

  activeInstrumentId = id;
  updateActiveButton();
  renderSongSkeletons();

  // Mantém o instrumento na URL para o botão "Voltar" do player retornar ao mesmo estado
  history.replaceState(null, '', `?instrumentId=${id}`);

  try {
    const songs = await fetchJSON(`/api/instruments/${id}/songs`);
    // Ignora respostas antigas caso o usuário troque de instrumento rapidamente
    if (activeInstrumentId !== id) return;
    renderSongs(songs, instrument);
  } catch (err) {
    if (activeInstrumentId !== id) return;
    songGrid.innerHTML = '';
    showFeedback(`Não foi possível carregar as músicas. <span class="text-rose-300">${escapeHtml(err.message)}</span>`);
  }
}

instrumentList.addEventListener('click', (event) => {
  const btn = event.target.closest('.instrument-btn');
  if (btn) selectInstrument(Number(btn.dataset.id));
});

async function init() {
  try {
    instruments = await fetchJSON('/api/instruments');
  } catch (err) {
    instrumentList.innerHTML = '';
    showFeedback(`Não foi possível carregar os instrumentos. <span class="text-rose-300">${escapeHtml(err.message)}</span>`);
    return;
  }

  if (instruments.length === 0) {
    instrumentList.innerHTML = '';
    showFeedback('Nenhum instrumento cadastrado. Rode <code class="text-ember-300">npx prisma db seed</code>.');
    return;
  }

  renderInstruments();

  // Seleciona o instrumento da URL (vindo do player) ou o preferido do usuário ou o primeiro
  const fromUrl = Number(new URLSearchParams(window.location.search).get('instrumentId'));
  
  let initial = instruments[0].id;
  if (instruments.some((inst) => inst.id === fromUrl)) {
    initial = fromUrl;
  } else if (currentUser && currentUser.preferred_instrument_id && instruments.some(inst => inst.id === currentUser.preferred_instrument_id)) {
    initial = currentUser.preferred_instrument_id;
  }

  selectInstrument(initial);
}

document.addEventListener('DOMContentLoaded', () => {
  if (currentUser && currentUser.name) {
    const greeting = document.getElementById('user-greeting');
    if (greeting) greeting.textContent = `Olá, ${currentUser.name.split(' ')[0]}`;
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'index.html';
    });
  }
});

init();
