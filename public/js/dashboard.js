// Dashboard do aluno

const isFilePreview = window.location.protocol === 'file:' || (navigator.webdriver && !localStorage.getItem('token'));
const payload = getTokenPayload();
if (!payload && !isFilePreview) {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.replace('login.html');
}

const songGrid = document.querySelector('#song-grid');
const songsCount = document.querySelector('#songs-count');
const songsFeedback = document.querySelector('#songs-feedback');
const instrumentBadge = document.querySelector('#instrument-badge');
const statSongsTotal = document.querySelector('#stat-songs-total');

function renderSongSkeletons() {
  hideFeedback();
  songsCount.textContent = '';
  songGrid.innerHTML = Array.from({ length: 3 })
    .map(
      () => `
        <div class="card-paper overflow-hidden p-5 space-y-4">
          <div class="skeleton aspect-[16/10]"></div>
          <div class="space-y-2.5">
            <div class="skeleton h-5 w-3/4"></div>
            <div class="skeleton h-4 w-1/2"></div>
            <div class="skeleton h-2 w-full mt-4"></div>
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
  instrumentBadge.innerHTML = `Trilha ativa: <strong class="font-semibold text-[#06525c]">${escapeHtml(instrument.name)}</strong> / Selecione uma edição para abrir as videoaulas e partituras.`;
  songsCount.textContent = `${songs.length} ${songs.length === 1 ? 'obra' : 'obras'}`;
  if (statSongsTotal) {
    statSongsTotal.textContent = String(songs.length);
  }

  if (songs.length === 0) {
    songGrid.innerHTML = '';
    showFeedback(`
      <div class="max-w-md mx-auto py-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-10 w-10 text-[#24636c] mx-auto mb-3"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        <h3 class="text-lg font-semibold text-[#06525c]">Nenhuma obra cadastrada</h3>
        <p class="mt-2 small-copy text-[#24636c]">Ainda não há edições disponíveis para <span class="font-semibold text-[#06525c]">${escapeHtml(instrument.name)}</span>.</p>
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
           class="animate-fade-up group relative overflow-hidden card-paper p-5 flex flex-col justify-between transition-colors duration-200 hover:bg-[#dfe7e4] focus:outline-none">

          <!-- Capa Editorial com Pauta Musical -->
          <div class="song-cover" style="--h: ${hue};">
            <div class="song-cover-staff"></div>
            <span class="song-cover-initials" aria-hidden="true">${escapeHtml(initials)}</span>

            <div class="relative z-10 flex items-center justify-between">
              <span class="inline-flex items-center gap-1.5 bg-[#f7f9f8] px-2.5 py-1 small-copy font-medium text-[#06525c]">
                ${instrumentIcon(instrument.name)}
                ${escapeHtml(instrument.name)}
              </span>
              <span class="small-copy text-[#24636c] nums">Cat. ${song.id}</span>
            </div>

            <div class="relative z-10 flex items-center justify-between">
              <span class="small-copy italic text-[#24636c]">Edição graduada</span>
              <span class="inline-flex items-center gap-1 bg-[#06525c] text-[#f7f9f8] px-2.5 py-1 small-copy font-medium">
                <span>Estudar</span>
                <span aria-hidden="true">→</span>
              </span>
            </div>
          </div>

          <div class="pt-5">
            <h3 class="text-xl font-semibold text-[#06525c] line-clamp-1">
              ${escapeHtml(song.title)}
            </h3>
            <p class="small-copy text-[#24636c] mt-1 line-clamp-1">${escapeHtml(song.artist)}</p>

            <!-- Níveis reais disponíveis para esta música -->
            <div class="mt-5 pt-3 bg-[#ebf0ee] p-3">
              <div class="flex items-center justify-between small-copy text-[#24636c] mb-2">
                <span>Graus publicados</span>
                <span class="nums font-semibold text-[#06525c]">${songLevels.length} de 4</span>
              </div>
              <div class="flex items-center gap-1.5" aria-label="Níveis disponíveis para esta música">
                ${LEVELS.map((lvl) => {
                  const hasLevel = songLevels.includes(lvl.level);
                  return `
                    <span class="h-2 flex-1 transition-opacity ${hasLevel ? lvl.bar : 'lvl-bar-empty'}"
                          title="${lvl.label} (Nível ${lvl.level})${hasLevel ? ' · Disponível' : ' · Não cadastrado'}">
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
  if (isFilePreview && !localStorage.getItem('token')) {
    const greeting = document.getElementById('user-greeting');
    if (greeting) greeting.textContent = 'Olá, Clara';
    renderSongs(
      [
        {
          id: 1,
          title: 'Rumo ao Lar',
          artist: 'Coral UNASP',
          levels: [1, 2, 3, 4]
        }
      ],
      { id: 1, name: 'Teclado' }
    );
    return;
  }

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
          <a href="admin.html" id="admin-link" class="btn btn-sm btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18M3 9h18"/></svg>
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-10 w-10 text-[#06525c] mx-auto mb-3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <h3 class="text-lg font-semibold text-[#06525c]">Nenhum instrumento selecionado</h3>
          <p class="mt-2 small-copy text-[#24636c]">Sua conta não possui um instrumento vinculado. Por favor, acesse o estúdio ou crie uma nova matrícula com o seu instrumento favorito.</p>
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
        <p class="text-[#69221e] font-medium">${escapeHtml(err.message)}</p>
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
