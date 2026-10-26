// Dashboard do aluno

const payload = getTokenPayload();
if (!payload) {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.replace('login.html');
}

const songGrid = document.querySelector('#song-grid');
const songsCount = document.querySelector('#songs-count');
const songsFeedback = document.querySelector('#songs-feedback');
const instrumentBadge = document.querySelector('#instrument-badge');

function renderSongSkeletons() {
  hideFeedback();
  songsCount.textContent = '';
  songGrid.innerHTML = Array.from({ length: 4 })
    .map(
      () => `
        <div class="card overflow-hidden">
          <div class="skeleton aspect-[16/10]"></div>
          <div class="p-5 space-y-3">
            <div class="skeleton h-5 w-3/4 rounded"></div>
            <div class="skeleton h-4 w-1/2 rounded"></div>
            <div class="skeleton h-2 w-full rounded mt-4"></div>
          </div>
        </div>`
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

function renderSongs(songs, instrument) {
  instrumentBadge.innerHTML = `Trilha atual: <strong class="text-white">${escapeHtml(instrument.name)}</strong>`;
  songsCount.textContent = `${songs.length} ${songs.length === 1 ? 'música' : 'músicas'}`;

  if (songs.length === 0) {
    songGrid.innerHTML = '';
    showFeedback(`
      <div class="max-w-md mx-auto py-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-12 w-12 text-zinc-500 mx-auto mb-3"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        <h3 class="text-lg font-semibold text-white">Nenhuma música cadastrada</h3>
        <p class="mt-2 text-sm text-zinc-400">Ainda não há músicas disponíveis para <span class="text-amber-400 font-medium">${escapeHtml(instrument.name)}</span>.</p>
      </div>
    `);
    return;
  }

  hideFeedback();
  songGrid.innerHTML = songs
    .map((song, i) => {
      const hue = getSongCoverHue(song.id, song.title);
      const initials = getInitials(song.title);
      const songLevels = Array.isArray(song.levels) && song.levels.length > 0 ? song.levels : [1, 2, 3, 4];

      return `
        <a href="player.html?songId=${song.id}&instrumentId=${instrument.id}"
           id="song-card-${song.id}"
           style="animation-delay:${i * 50}ms"
           class="animate-fade-up group relative overflow-hidden card transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/40 hover:shadow-[0_20px_50px_-20px_rgba(245,158,11,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">

          <!-- Capa Dinâmica com Gradiente Harmônico e Pauta Musical -->
          <div class="song-cover" style="--h: ${hue};">
            <div class="song-cover-staff"></div>
            <span class="song-cover-initials" aria-hidden="true">${escapeHtml(initials)}</span>

            <span class="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-ink-950/80 px-2.5 py-1 text-xs font-medium text-zinc-200 backdrop-blur ring-1 ring-white/10">
              ${instrumentIcon(instrument.name)}
              ${escapeHtml(instrument.name)}
            </span>

            <!-- Botão de Play flutuante no hover -->
            <span class="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-ink-950/30 backdrop-blur-[2px]">
              <span class="grid h-12 w-12 place-items-center rounded-full bg-amber-400 text-ink-950 shadow-glow transition-transform duration-300 group-hover:scale-100 scale-75">
                <svg viewBox="0 0 24 24" fill="currentColor" class="ml-0.5 h-5 w-5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </span>
            </span>
          </div>

          <div class="p-5">
            <h3 class="font-display text-lg font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
              ${escapeHtml(song.title)}
            </h3>
            <p class="text-sm text-zinc-400 mt-1 line-clamp-1">${escapeHtml(song.artist)}</p>

            <!-- Níveis reais disponíveis para esta música -->
            <div class="mt-5 pt-4 border-t border-zinc-800/80">
              <div class="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                <span>Níveis disponíveis</span>
                <span class="text-zinc-400">${songLevels.length} de 4</span>
              </div>
              <div class="flex items-center gap-1.5" aria-label="Níveis disponíveis para esta música">
                ${LEVELS.map((lvl) => {
                  const hasLevel = songLevels.includes(lvl.level);
                  return `
                    <span class="h-2 flex-1 rounded-full transition-opacity ${hasLevel ? lvl.bar : 'bg-zinc-800 opacity-40'}"
                          title="${lvl.label} (Nível ${lvl.level})${hasLevel ? ' - Disponível' : ' - Não cadastrado'}">
                    </span>`;
                }).join('')}
              </div>
            </div>
          </div>
        </a>`;
    })
    .join('');
}

async function loadTrack() {
  try {
    // 1. Obtém os dados mais atualizados do usuário autenticado
    const me = await fetchJSON('/api/auth/me');

    const greeting = document.getElementById('user-greeting');
    if (greeting && me.name) {
      greeting.textContent = `Olá, ${me.name.split(' ')[0]}`;
    }

    // Injeta o atalho para o Estúdio se o usuário for ADMIN
    if (me.role === 'ADMIN') {
      const adminSlot = document.getElementById('admin-slot');
      if (adminSlot && !document.getElementById('admin-link')) {
        adminSlot.innerHTML = `
          <a href="admin.html" id="admin-link" class="btn btn-sm btn-secondary border-amber-500/30 text-amber-300 hover:text-amber-200 hover:border-amber-500/50">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5 text-amber-400"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18M3 9h18"/></svg>
            <span>Estúdio (Admin)</span>
          </a>`;
      }
    }

    let instrumentId = me.preferred_instrument_id;

    // Se for administrador sem instrumento definido, busca o primeiro instrumento disponível para permitir navegação
    if (!instrumentId && me.role === 'ADMIN') {
      const allInstruments = await fetchJSON('/api/instruments');
      if (allInstruments.length > 0) {
        instrumentId = allInstruments[0].id;
      }
    }

    if (!instrumentId) {
      instrumentBadge.textContent = 'Sem trilha selecionada';
      showFeedback(`
        <div class="max-w-md mx-auto py-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-12 w-12 text-amber-400 mx-auto mb-3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <h3 class="text-lg font-semibold text-white">Nenhum instrumento selecionado</h3>
          <p class="mt-2 text-sm text-zinc-400">Sua conta não possui um instrumento vinculado. Por favor, acesse o painel ou crie uma nova conta com o seu instrumento favorito.</p>
        </div>
      `);
      return;
    }

    renderSongSkeletons();
    const data = await fetchJSON(`/api/instruments/${instrumentId}/songs`);
    renderSongs(data.songs, data.instrument);

  } catch (err) {
    songGrid.innerHTML = '';
    instrumentBadge.textContent = 'Erro ao carregar';
    showFeedback(`
      <div class="max-w-md mx-auto py-4 text-center">
        <p class="text-rose-400 font-medium">${escapeHtml(err.message)}</p>
        <button onclick="loadTrack()" class="btn btn-secondary btn-sm mt-4">Tentar novamente</button>
      </div>
    `);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'index.html';
    });
  }

  loadTrack();
});
