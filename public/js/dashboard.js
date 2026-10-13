// Dashboard: exibe apenas a trilha (instrumento) escolhida pelo aluno no cadastro.

const token = localStorage.getItem('token');
const payload = token ? getTokenPayload() : null;
if (!token || !payload) {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.replace('login.html');
}

const songGrid = document.querySelector('#song-grid');
const songsCount = document.querySelector('#songs-count');
const songsFeedback = document.querySelector('#songs-feedback');

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

async function loadTrack() {
  const instrumentId = payload && Number(payload.preferred_instrument_id);
  if (!instrumentId) {
    showFeedback('Sua conta não possui um instrumento definido, portanto não há trilha disponível.');
    return;
  }

  renderSongSkeletons();
  try {
    const [instruments, songs] = await Promise.all([
      fetchJSON('/api/instruments'),
      fetchJSON(`/api/instruments/${instrumentId}/songs`),
    ]);
    const instrument = instruments.find((inst) => inst.id === instrumentId) || { id: instrumentId, name: 'seu instrumento' };
    renderSongs(songs, instrument);
  } catch (err) {
    songGrid.innerHTML = '';
    showFeedback(`Não foi possível carregar as músicas. <span class="text-rose-300">${escapeHtml(err.message)}</span>`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (payload) {
    const greeting = document.getElementById('user-greeting');
    if (greeting && payload.name) greeting.textContent = `Olá, ${payload.name.split(' ')[0]}`;

    // Injeta o link do painel admin ao lado do botão "Sair" (apenas ADMIN)
    if (payload.role === 'ADMIN') {
      const logoutBtn = document.getElementById('logout-btn');
      const adminLink = document.createElement('a');
      adminLink.href = '/admin.html';
      adminLink.id = 'admin-link';
      adminLink.textContent = 'Painel Admin';
      adminLink.className = 'rounded-md bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-500 ring-1 ring-inset ring-amber-500/20 hover:bg-amber-500/20 transition-colors';
      logoutBtn.parentNode.insertBefore(adminLink, logoutBtn);
    }
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

if (payload) loadTrack();
