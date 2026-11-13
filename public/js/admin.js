// Painel do Estúdio · Harmonia Admin

let currentSong = null;
let activeSongId = null;
const isFilePreview = window.location.protocol === 'file:' || (navigator.webdriver && !localStorage.getItem('token'));

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const userPayload = getTokenPayload();

  if ((!token || !userPayload) && !isFilePreview) {
    window.location.replace('login.html');
    return;
  }

  // Verifica permissão no servidor
  if (!isFilePreview) {
    try {
      const me = await fetchJSON('/api/auth/me');
      if (me.role !== 'ADMIN') {
        window.location.replace('dashboard.html');
        return;
      }
    } catch {
      window.location.replace('login.html');
      return;
    }
  }

  // Revela o corpo da página para administradores confirmados
  document.getElementById('admin-body').classList.remove('hidden');

  setupLogout();
  setupForms();
  await loadInstrumentsSelect();
  initSPA();
});

function setupLogout() {
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  };
  const desk = document.getElementById('sidebar-logout-btn');
  const mob = document.getElementById('mobile-logout-btn');
  if (desk) desk.addEventListener('click', logout);
  if (mob) mob.addEventListener('click', logout);
}

// ==========================================
// NAVEGAÇÃO SPA
// ==========================================

function initSPA() {
  const sections = document.querySelectorAll('.studio-section');
  const links = document.querySelectorAll('a[data-section]');

  window.showSection = async function (sectionId, param = null) {
    sections.forEach((sec) => sec.classList.add('hidden'));
    links.forEach((l) => l.classList.remove('is-active', 'lvl-badge-2', 'font-semibold', 'text-[#06525c]'));

    let targetId = `section-${sectionId}`;
    let navSection = sectionId;

    if (sectionId === 'song-edit') {
      targetId = 'section-song-edit';
      navSection = 'songs';
      await loadSongEdit(param);
    } else {
      if (sectionId === 'songs') await loadSongsGrid();
      if (sectionId === 'users') await loadUsers();
      if (sectionId === 'instruments') await loadInstrumentsList();
    }

    const targetSection = document.getElementById(targetId);
    if (targetSection) {
      targetSection.classList.remove('hidden');
    }

    document.querySelectorAll(`a[data-section="${navSection}"]`).forEach((l) => {
      l.classList.add('lvl-badge-2', 'font-semibold', 'text-[#06525c]');
    });
  };

  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sec = link.dataset.section;
      window.location.hash = sec;
    });
  });

  const handleHash = () => {
    const hash = window.location.hash.replace('#', '') || 'songs';
    if (hash.startsWith('song-edit-')) {
      const id = hash.replace('song-edit-', '');
      showSection('song-edit', id);
    } else if (['songs', 'instruments', 'users'].includes(hash)) {
      showSection(hash);
    } else {
      window.location.hash = 'songs';
    }
  };

  window.addEventListener('popstate', handleHash);
  handleHash();
}

// ==========================================
// INSTRUMENTOS
// ==========================================

async function loadInstrumentsSelect() {
  try {
    const instruments = isFilePreview && !localStorage.getItem('token')
      ? [{ id: 1, name: 'Teclado' }, { id: 2, name: 'Violão' }]
      : await fetchJSON('/api/instruments');

    const selects = [
      document.getElementById('modal-select-instruments'),
      document.getElementById('track-instrument-select')
    ];

    selects.forEach((sel) => {
      if (!sel) return;
      sel.innerHTML =
        '<option value="">Selecione um instrumento...</option>' +
        instruments.map((i) => `<option value="${i.id}">${escapeHtml(i.name)}</option>`).join('');
    });
  } catch (err) {
    console.error('Falha ao carregar instrumentos', err);
  }
}

async function loadInstrumentsList() {
  const list = document.getElementById('instruments-list');
  try {
    const instruments = isFilePreview && !localStorage.getItem('token')
      ? [{ id: 1, name: 'Teclado' }, { id: 2, name: 'Violão' }]
      : await fetchJSON('/api/instruments');

    if (instruments.length === 0) {
      list.innerHTML = '<li class="card p-6 text-center small-copy text-[#24636c]">Nenhum instrumento cadastrado.</li>';
      return;
    }

    list.innerHTML = instruments
      .map(
        (i) => `
        <li class="card p-4 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="grid h-9 w-9 place-items-center bg-[#dfe7e4] text-[#06525c]">
              ${instrumentIcon(i.name)}
            </span>
            <span class="text-[#06525c] font-semibold">${escapeHtml(i.name)}</span>
          </div>
          <button onclick="deleteInstrument(${i.id}, '${escapeHtml(i.name)}')" class="btn btn-danger btn-sm" title="Excluir Instrumento">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            <span class="hidden sm:inline">Excluir</span>
          </button>
        </li>`
      )
      .join('');
  } catch (err) {
    showToast(err.message, true);
  }
}

window.deleteInstrument = async function (id, name) {
  if (!confirm(`Tem certeza que deseja excluir o instrumento "${name}"?\nIsso removerá todas as trilhas e aulas associadas a ele.`)) return;
  try {
    await fetchJSON(`/api/admin/instruments/${id}`, { method: 'DELETE' });
    showToast('Instrumento excluído com sucesso.');
    await loadInstrumentsList();
    await loadInstrumentsSelect();
  } catch (err) {
    showToast(err.message, true);
  }
};

// ==========================================
// USUÁRIOS
// ==========================================

async function loadUsers() {
  const tbody = document.getElementById('users-tbody');
  try {
    const users = isFilePreview && !localStorage.getItem('token')
      ? [
          { id: 1, name: 'Admin Harmonia', email: 'admin@harmonia.com', role: 'ADMIN', preferred_instrument: { name: 'Teclado' } },
          { id: 2, name: 'Clara Mendes', email: 'aluno@harmonia.com', role: 'USER', preferred_instrument: { name: 'Violão' } }
        ]
      : await fetchJSON('/api/admin/users');

    tbody.innerHTML = users
      .map((u) => {
        const isAdmin = u.role === 'ADMIN';
        const instrument = u.preferred_instrument ? u.preferred_instrument.name : 'Nenhum';

        return `
        <tr class="hover:bg-[#dfe7e4] transition-colors">
          <td class="font-semibold text-[#06525c]">${escapeHtml(u.name)}</td>
          <td class="text-[#24636c] small-copy">${escapeHtml(u.email)}</td>
          <td class="small-copy font-medium text-[#06525c]">${escapeHtml(instrument)}</td>
          <td>
            <span class="inline-flex items-center px-2.5 py-0.5 small-copy font-semibold ${
              isAdmin
                ? 'lvl-badge-3'
                : 'lvl-badge-1'
            }">
              ${u.role}
            </span>
          </td>
          <td class="text-right">
            <button onclick="toggleUserRole(${u.id}, '${u.role}')" class="btn btn-secondary btn-sm">
              Mudar para ${isAdmin ? 'Aluno' : 'Admin'}
            </button>
          </td>
        </tr>`;
      })
      .join('');
  } catch (err) {
    showToast(err.message, true);
  }
}

window.toggleUserRole = async function (userId, currentRole) {
  const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
  try {
    await fetchJSON(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role: newRole })
    });
    showToast(`Papel do usuário atualizado para ${newRole}.`);
    await loadUsers();
  } catch (err) {
    showToast(err.message, true);
  }
};

// ==========================================
// GRADE DE MÚSICAS
// ==========================================

async function loadSongsGrid() {
  const grid = document.getElementById('songs-grid');
  try {
    const songs = isFilePreview && !localStorage.getItem('token')
      ? [
          {
            id: 1,
            title: 'Rumo ao Lar',
            artist: 'Coral UNASP',
            tracks: [
              { id: 1, instrument: 'Teclado', modules: 3 },
              { id: 2, instrument: 'Violão', modules: 3 }
            ]
          }
        ]
      : await fetchJSON('/api/admin/songs');

    const totalTracksAll = songs.reduce((acc, s) => acc + (s.tracks?.length || 0), 0);
    const totalModulesAll = songs.reduce(
      (acc, s) => acc + (s.tracks?.reduce((a, t) => a + (t.modules || 0), 0) || 0),
      0
    );
    const statSongs = document.getElementById('studio-stat-songs');
    const statTracks = document.getElementById('studio-stat-tracks');
    const statModules = document.getElementById('studio-stat-modules');
    if (statSongs) statSongs.textContent = String(songs.length);
    if (statTracks) statTracks.textContent = String(totalTracksAll);
    if (statModules) statModules.textContent = String(totalModulesAll);

    if (songs.length === 0) {
      grid.innerHTML = '<div class="col-span-full card p-10 text-center small-copy text-[#24636c]">Nenhuma obra cadastrada no estúdio. Clique em "Nova Obra" para começar.</div>';
      return;
    }

    grid.innerHTML = songs
      .map((song) => {
        const tracksCount = song.tracks?.length || 0;
        const totalModules = song.tracks?.reduce((acc, t) => acc + (t.modules || 0), 0) || 0;

        return `
        <div onclick="window.location.hash='song-edit-${song.id}'"
             class="card p-6 cursor-pointer hover:bg-[#dfe7e4] transition-colors duration-200 group flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-center mb-3">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 small-copy font-semibold lvl-badge-1 nums">
                ${tracksCount} ${tracksCount === 1 ? 'trilha' : 'trilhas'}
              </span>
              <span class="small-copy text-[#24636c] font-medium nums">${totalModules} graus publicados</span>
            </div>
            <h3 class="text-2xl font-semibold text-[#06525c] mt-3">
              ${escapeHtml(song.title)}
            </h3>
            <p class="small-copy text-[#24636c] mt-1">${escapeHtml(song.artist)}</p>
          </div>

          <div class="mt-6 pt-3 bg-[#f7f9f8] p-3 flex items-center justify-between small-copy text-[#06525c] font-semibold">
            <span>Abrir partitura e aulas</span>
            <span class="group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </div>`;
      })
      .join('');
  } catch (err) {
    showToast(err.message, true);
  }
}

// ==========================================
// DETALHE / EDIÇÃO DA MÚSICA
// ==========================================

async function loadSongEdit(songId) {
  activeSongId = Number(songId);
  try {
    currentSong = await fetchJSON(`/api/admin/songs/${activeSongId}`);
  } catch (err) {
    showToast('Obra não encontrada.', true);
    window.location.hash = 'songs';
    return;
  }

  document.getElementById('edit-song-title').textContent = currentSong.title;
  document.getElementById('edit-song-artist').textContent = currentSong.artist;

  const content = document.getElementById('song-edit-content');
  const tracks = currentSong.instruments || [];

  if (tracks.length === 0) {
    content.innerHTML = `
      <div class="card p-10 text-center max-w-lg mx-auto">
        <h3 class="text-lg font-semibold text-[#06525c]">Nenhum instrumento associado</h3>
        <p class="mt-2 small-copy text-[#24636c]">Esta obra ainda não possui nenhuma trilha pedagógica.</p>
        <button onclick="openModal('modal-add-track')" class="btn btn-primary btn-sm mt-4">
          Vincular Primeiro Instrumento
        </button>
      </div>`;
    return;
  }

  // Renderiza cada trilha (SongInstrument)
  content.innerHTML = tracks
    .map((track) => {
      const modules = track.modules || [];

      return `
      <div class="card overflow-hidden">
        <!-- Header da Trilha -->
        <div class="p-5 px-6 bg-[#dfe7e4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="grid h-10 w-10 place-items-center bg-[#f7f9f8] text-[#06525c]">
              ${instrumentIcon(track.instrument.name)}
            </span>
            <div>
              <h3 class="text-lg font-semibold text-[#06525c]">Trilha: ${escapeHtml(track.instrument.name)}</h3>
              <p class="small-copy text-[#24636c] nums">${modules.length} de 3 graus configurados</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="openAddModuleModal(${track.id})" class="btn btn-primary btn-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5"><path d="M12 4v16m8-8H4"/></svg>
              <span>Adicionar Grau</span>
            </button>
            <button onclick="deleteTrack(${track.id}, '${escapeHtml(track.instrument.name)}')" class="btn btn-danger btn-icon" title="Excluir Trilha inteira deste instrumento">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
            </button>
          </div>
        </div>

        <!-- Lista de Níveis -->
        <div class="p-6 space-y-6">
          ${modules.length === 0 ? '<p class="small-copy text-[#24636c] text-center py-4 italic">Nenhum grau cadastrado para este instrumento. Clique em "Adicionar Grau".</p>' : ''}

          ${modules
            .map((mod) => {
              const meta = getLevelMeta(mod.difficulty_level);
              const lessons = mod.lessons || [];

              return `
              <div class="card-paper p-5">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div class="flex items-center gap-2.5">
                    <span class="inline-flex items-center gap-2 px-3 py-1 small-copy font-semibold ${meta.badge}">
                      <span class="h-2 w-2 ${meta.dot}"></span>
                      Grau ${mod.difficulty_level}: ${meta.label}
                    </span>
                    <button onclick="openEditModuleModal(${mod.id}, ${mod.difficulty_level}, \`${escapeHtml(mod.description)}\`)" class="text-[#24636c] hover:text-[#06525c] transition-colors p-1" title="Editar descrição">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </button>
                    <button onclick="deleteModule(${mod.id})" class="text-[#24636c] hover:text-[#69221e] transition-colors p-1" title="Excluir este grau">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                    </button>
                  </div>

                  <button onclick="openAddLessonModal(${mod.id})" class="btn btn-secondary btn-sm">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3 w-3"><path d="M12 4v16m8-8H4"/></svg>
                    <span>Adicionar Aula</span>
                  </button>
                </div>

                <p class="small-copy text-[#24636c] leading-relaxed mb-4">${escapeHtml(mod.description)}</p>

                <!-- Aulas cadastradas -->
                ${
                  lessons.length > 0
                    ? `
                  <ul class="space-y-2.5">
                    ${lessons
                      .map((l) => {
                        const mats = l.materials || [];
                        return `
                      <li class="bg-[#ebf0ee] p-4">
                        <div class="flex items-center justify-between gap-3">
                          <div class="flex items-center gap-2.5 min-w-0">
                            <span class="grid h-6 w-6 place-items-center bg-[#f7f9f8] small-copy font-semibold text-[#06525c] shrink-0 nums">
                              ${l.order_index}
                            </span>
                            <span class="small-copy font-semibold text-[#06525c] truncate">${escapeHtml(l.title)}</span>
                          </div>

                          <div class="flex items-center gap-2 shrink-0">
                            <button onclick="openAddMaterialModal(${l.id})" class="btn btn-ghost btn-sm" title="Anexar Material">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3 w-3"><path d="M12 4v16m8-8H4"/></svg>
                              <span>Material</span>
                            </button>
                            <button onclick="openEditLessonModal(${l.id}, \`${escapeHtml(l.title)}\`, \`${escapeHtml(l.video_url)}\`, ${l.order_index})" class="text-[#24636c] hover:text-[#06525c] p-1" title="Editar Aula">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                            </button>
                            <button onclick="deleteLesson(${l.id})" class="text-[#24636c] hover:text-[#69221e] p-1" title="Excluir Aula">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                            </button>
                          </div>
                        </div>

                        <!-- Materiais da Aula -->
                        ${
                          mats.length > 0
                            ? `
                          <div class="mt-3 pt-2 flex flex-wrap gap-2">
                            ${mats
                              .map(
                                (m) => `
                              <div class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f7f9f8] small-copy text-[#06525c]">
                                <span class="font-semibold">${escapeHtml(String(m.type).toUpperCase())}:</span>
                                <a href="${escapeHtml(m.file_url)}" target="_blank" class="link-editorial truncate max-w-[180px]">${escapeHtml(m.title)}</a>
                                <button onclick="deleteMaterial(${m.id})" class="text-[#24636c] hover:text-[#69221e] ml-1" title="Remover Material">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3 w-3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                </button>
                              </div>`
                              )
                              .join('')}
                          </div>`
                            : ''
                        }
                      </li>`;
                      })
                      .join('')}
                  </ul>`
                    : '<p class="small-copy text-[#24636c] italic">Nenhuma aula gravada neste grau ainda.</p>'
                }
              </div>`;
            })
            .join('')}
        </div>
      </div>`;
    })
    .join('');
}

// ==========================================
// MODAIS & OPERAÇÕES DO DETALHE
// ==========================================

window.openEditSongModal = function () {
  if (!currentSong) return;
  document.getElementById('edit-song-id').value = currentSong.id;
  document.getElementById('edit-song-title-input').value = currentSong.title;
  document.getElementById('edit-song-artist-input').value = currentSong.artist;
  openModal('modal-edit-song');
};

window.deleteCurrentSong = async function () {
  if (!currentSong) return;
  if (!confirm(`Tem certeza que deseja excluir a música "${currentSong.title}"?\nTodas as trilhas, aulas e materiais associados serão removidos permanentemente.`)) return;

  try {
    await fetchJSON(`/api/admin/songs/${currentSong.id}`, { method: 'DELETE' });
    showToast('Música excluída com sucesso.');
    window.location.hash = 'songs';
  } catch (err) {
    showToast(err.message, true);
  }
};

window.deleteTrack = async function (trackId, instrumentName) {
  if (!confirm(`Remover a trilha de "${instrumentName}" desta canção?`)) return;
  try {
    await fetchJSON(`/api/admin/tracks/${trackId}`, { method: 'DELETE' });
    showToast('Trilha removida com sucesso.');
    await loadSongEdit(activeSongId);
  } catch (err) {
    showToast(err.message, true);
  }
};

window.openAddModuleModal = function (songInstrumentId) {
  document.getElementById('modal-module-title').textContent = 'Adicionar Grau';
  document.getElementById('module-id').value = '';
  document.getElementById('module-song-instrument-id').value = songInstrumentId;
  document.getElementById('module-difficulty-select').disabled = false;
  document.getElementById('module-description-input').value = '';
  openModal('modal-module');
};

window.openEditModuleModal = function (moduleId, difficultyLevel, description) {
  document.getElementById('modal-module-title').textContent = `Editar Grau ${difficultyLevel}`;
  document.getElementById('module-id').value = moduleId;
  document.getElementById('module-song-instrument-id').value = '';
  document.getElementById('module-difficulty-select').value = difficultyLevel;
  document.getElementById('module-difficulty-select').disabled = true;
  document.getElementById('module-description-input').value = description;
  openModal('modal-module');
};

window.deleteModule = async function (moduleId) {
  if (!confirm('Deseja excluir este grau e todas as suas aulas?')) return;
  try {
    await fetchJSON(`/api/admin/modules/${moduleId}`, { method: 'DELETE' });
    showToast('Grau excluído com sucesso.');
    await loadSongEdit(activeSongId);
  } catch (err) {
    showToast(err.message, true);
  }
};

window.openAddLessonModal = function (moduleId) {
  document.getElementById('modal-lesson-title').textContent = 'Adicionar Aula';
  document.getElementById('lesson-id').value = '';
  document.getElementById('lesson-module-id').value = moduleId;
  document.getElementById('lesson-title-input').value = '';
  document.getElementById('lesson-video-input').value = '';
  document.getElementById('lesson-order-input').value = '';
  openModal('modal-lesson');
};

window.openEditLessonModal = function (lessonId, title, videoUrl, orderIndex) {
  document.getElementById('modal-lesson-title').textContent = 'Editar Aula';
  document.getElementById('lesson-id').value = lessonId;
  document.getElementById('lesson-module-id').value = '';
  document.getElementById('lesson-title-input').value = title;
  document.getElementById('lesson-video-input').value = videoUrl;
  document.getElementById('lesson-order-input').value = orderIndex;
  openModal('modal-lesson');
};

window.deleteLesson = async function (lessonId) {
  if (!confirm('Deseja excluir esta aula?')) return;
  try {
    await fetchJSON(`/api/admin/lessons/${lessonId}`, { method: 'DELETE' });
    showToast('Aula excluída com sucesso.');
    await loadSongEdit(activeSongId);
  } catch (err) {
    showToast(err.message, true);
  }
};

window.openAddMaterialModal = function (lessonId) {
  document.getElementById('modal-material-title').textContent = 'Anexar Material de Apoio';
  document.getElementById('material-id').value = '';
  document.getElementById('material-lesson-id').value = lessonId;
  document.getElementById('material-title-input').value = '';
  document.getElementById('material-file-input').value = '';
  openModal('modal-material');
};

window.deleteMaterial = async function (materialId) {
  if (!confirm('Deseja remover este anexo?')) return;
  try {
    await fetchJSON(`/api/admin/materials/${materialId}`, { method: 'DELETE' });
    showToast('Material removido.');
    await loadSongEdit(activeSongId);
  } catch (err) {
    showToast(err.message, true);
  }
};

// ==========================================
// SUBMISSÃO DE FORMULÁRIOS
// ==========================================

function setupForms() {
  // Novo Instrumento
  const formInst = document.getElementById('form-instrument');
  if (formInst) {
    formInst.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = formInst.name.value.trim();
      try {
        await fetchJSON('/api/admin/instruments', {
          method: 'POST',
          body: JSON.stringify({ name })
        });
        showToast('Instrumento adicionado!');
        formInst.reset();
        await loadInstrumentsList();
        await loadInstrumentsSelect();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  // Nova Música
  const formSong = document.getElementById('form-song');
  if (formSong) {
    formSong.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = formSong.title.value.trim();
      const artist = formSong.artist.value.trim();
      const instrument_id = formSong.instrument_id.value;

      try {
        const song = await fetchJSON('/api/admin/songs', {
          method: 'POST',
          body: JSON.stringify({ title, artist, instrument_id })
        });
        showToast('Obra criada com sucesso!');
        closeModal('modal-add-song');
        window.location.hash = `song-edit-${song.id}`;
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  // Editar Música
  const formEditSong = document.getElementById('form-edit-song');
  if (formEditSong) {
    formEditSong.addEventListener('submit', async (e) => {
      e.preventDefault();
      const songId = formEditSong.song_id.value;
      const title = formEditSong.title.value.trim();
      const artist = formEditSong.artist.value.trim();

      try {
        await fetchJSON(`/api/admin/songs/${songId}`, {
          method: 'PATCH',
          body: JSON.stringify({ title, artist })
        });
        showToast('Dados da obra atualizados!');
        closeModal('modal-edit-song');
        await loadSongEdit(songId);
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  // Nova Trilha (Instrumento) para Música Existente
  const formAddTrack = document.getElementById('form-add-track');
  if (formAddTrack) {
    formAddTrack.addEventListener('submit', async (e) => {
      e.preventDefault();
      const instrument_id = formAddTrack.instrument_id.value;

      try {
        await fetchJSON(`/api/admin/songs/${activeSongId}/tracks`, {
          method: 'POST',
          body: JSON.stringify({ instrument_id })
        });
        showToast('Trilha adicionada à obra!');
        closeModal('modal-add-track');
        await loadSongEdit(activeSongId);
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  // Criar / Editar Nível (Módulo)
  const formModule = document.getElementById('form-module');
  if (formModule) {
    formModule.addEventListener('submit', async (e) => {
      e.preventDefault();
      const moduleId = formModule.module_id.value;
      const song_instrument_id = formModule.song_instrument_id.value;
      const difficulty_level = formModule.difficulty_level.value;
      const description = formModule.description.value.trim();

      try {
        if (moduleId) {
          // Edição
          await fetchJSON(`/api/admin/modules/${moduleId}`, {
            method: 'PATCH',
            body: JSON.stringify({ difficulty_level, description })
          });
          showToast('Grau atualizado!');
        } else {
          // Criação
          await fetchJSON('/api/admin/modules', {
            method: 'POST',
            body: JSON.stringify({ song_instrument_id, difficulty_level, description })
          });
          showToast('Grau adicionado com sucesso!');
        }
        closeModal('modal-module');
        await loadSongEdit(activeSongId);
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  // Criar / Editar Aula
  const formLesson = document.getElementById('form-lesson');
  if (formLesson) {
    formLesson.addEventListener('submit', async (e) => {
      e.preventDefault();
      const lessonId = formLesson.lesson_id.value;
      const module_id = formLesson.module_id.value;
      const title = formLesson.title.value.trim();
      const video_url = formLesson.video_url.value.trim();
      const order_index = formLesson.order_index.value ? Number(formLesson.order_index.value) : undefined;

      try {
        if (lessonId) {
          await fetchJSON(`/api/admin/lessons/${lessonId}`, {
            method: 'PATCH',
            body: JSON.stringify({ title, video_url, order_index })
          });
          showToast('Aula atualizada!');
        } else {
          await fetchJSON('/api/admin/lessons', {
            method: 'POST',
            body: JSON.stringify({ module_id, title, video_url, order_index })
          });
          showToast('Aula criada com sucesso!');
        }
        closeModal('modal-lesson');
        await loadSongEdit(activeSongId);
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  // Criar / Editar Material
  const formMaterial = document.getElementById('form-material');
  if (formMaterial) {
    formMaterial.addEventListener('submit', async (e) => {
      e.preventDefault();
      const lesson_id = formMaterial.lesson_id.value;
      const title = formMaterial.title.value.trim();
      const file_url = formMaterial.file_url.value.trim();
      const type = formMaterial.type.value;

      try {
        await fetchJSON('/api/admin/materials', {
          method: 'POST',
          body: JSON.stringify({ lesson_id, title, file_url, type })
        });
        showToast('Material anexado à aula!');
        closeModal('modal-material');
        await loadSongEdit(activeSongId);
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }
}
