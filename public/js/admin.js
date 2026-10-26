// Painel do Estúdio — Harmonia Admin

let currentSong = null;
let activeSongId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const userPayload = getTokenPayload();

  if (!token || !userPayload) {
    window.location.replace('login.html');
    return;
  }

  // Verifica permissão no servidor
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
    links.forEach((l) => l.classList.remove('is-active', 'bg-zinc-800', 'text-white'));

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
      l.classList.add('bg-zinc-800', 'text-white');
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
    const instruments = await fetchJSON('/api/instruments');
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
    const instruments = await fetchJSON('/api/instruments');
    if (instruments.length === 0) {
      list.innerHTML = '<li class="card p-6 text-center text-sm text-zinc-500">Nenhum instrumento cadastrado.</li>';
      return;
    }

    list.innerHTML = instruments
      .map(
        (i) => `
        <li class="card p-4 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="grid h-9 w-9 place-items-center rounded-lg bg-zinc-800 text-amber-400">
              ${instrumentIcon(i.name)}
            </span>
            <span class="text-white font-semibold">${escapeHtml(i.name)}</span>
          </div>
          <button onclick="deleteInstrument(${i.id}, '${escapeHtml(i.name)}')" class="btn btn-ghost btn-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10" title="Excluir Instrumento">
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
    const users = await fetchJSON('/api/admin/users');
    tbody.innerHTML = users
      .map((u) => {
        const isAdmin = u.role === 'ADMIN';
        const instrument = u.preferred_instrument ? u.preferred_instrument.name : 'Nenhum';

        return `
        <tr class="hover:bg-zinc-800/40 transition">
          <td class="px-6 py-4 font-semibold text-white">${escapeHtml(u.name)}</td>
          <td class="px-6 py-4 text-zinc-400 text-xs">${escapeHtml(u.email)}</td>
          <td class="px-6 py-4 text-xs font-medium text-zinc-300">${escapeHtml(instrument)}</td>
          <td class="px-6 py-4">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              isAdmin
                ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                : 'bg-zinc-800 text-zinc-400'
            }">
              ${u.role}
            </span>
          </td>
          <td class="px-6 py-4 text-right">
            <button onclick="toggleUserRole(${u.id}, '${u.role}')" class="btn btn-ghost btn-sm text-xs">
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
    const songs = await fetchJSON('/api/admin/songs');

    if (songs.length === 0) {
      grid.innerHTML = '<div class="col-span-full card p-10 text-center text-sm text-zinc-500">Nenhuma música cadastrada no estúdio. Clique em "Adicionar Música" para começar.</div>';
      return;
    }

    grid.innerHTML = songs
      .map((song) => {
        const tracksCount = song.tracks?.length || 0;
        const totalModules = song.tracks?.reduce((acc, t) => acc + (t.modules || 0), 0) || 0;

        return `
        <div onclick="window.location.hash='song-edit-${song.id}'"
             class="card p-6 cursor-pointer hover:border-amber-400/40 hover:bg-zinc-800/40 transition-all duration-200 group">
          <div class="flex justify-between items-start mb-2">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-zinc-800 text-zinc-300">
              ${tracksCount} ${tracksCount === 1 ? 'trilha' : 'trilhas'}
            </span>
            <span class="text-xs text-zinc-500 font-medium">${totalModules} níveis criados</span>
          </div>
          <h3 class="font-display text-xl font-bold text-white group-hover:text-amber-300 transition-colors mt-3">
            ${escapeHtml(song.title)}
          </h3>
          <p class="text-sm text-zinc-400 mt-1">${escapeHtml(song.artist)}</p>

          <div class="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 font-semibold uppercase tracking-wider">
            <span>Gerenciar conteúdo</span>
            <span class="text-amber-400 group-hover:translate-x-1 transition-transform">→</span>
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
    showToast('Música não encontrada.', true);
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
        <h3 class="text-lg font-semibold text-white">Nenhum instrumento associado</h3>
        <p class="mt-2 text-sm text-zinc-400">Esta música ainda não possui nenhuma trilha pedagógica.</p>
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
        <div class="p-5 px-6 bg-zinc-900/80 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="grid h-10 w-10 place-items-center rounded-xl bg-zinc-800 text-amber-400 ring-1 ring-zinc-700">
              ${instrumentIcon(track.instrument.name)}
            </span>
            <div>
              <h3 class="text-lg font-bold text-white">Trilha: ${escapeHtml(track.instrument.name)}</h3>
              <p class="text-xs text-zinc-500">${modules.length} de 4 níveis configurados</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="openAddModuleModal(${track.id})" class="btn btn-secondary btn-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5 text-amber-400"><path d="M12 4v16m8-8H4"/></svg>
              <span>Adicionar Nível</span>
            </button>
            <button onclick="deleteTrack(${track.id}, '${escapeHtml(track.instrument.name)}')" class="btn btn-danger btn-icon" title="Excluir Trilha inteira deste instrumento">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
            </button>
          </div>
        </div>

        <!-- Lista de Níveis -->
        <div class="p-6 space-y-6">
          ${modules.length === 0 ? '<p class="text-sm text-zinc-500 text-center py-4 italic">Nenhum nível cadastrado para este instrumento. Clique em "Adicionar Nível".</p>' : ''}

          ${modules
            .map((mod) => {
              const meta = getLevelMeta(mod.difficulty_level);
              const lessons = mod.lessons || [];

              return `
              <div class="card p-5 bg-ink-950/40 border-zinc-800/60">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div class="flex items-center gap-2.5">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${meta.badge}">
                      <span class="h-2 w-2 rounded-full ${meta.dot}"></span>
                      Nível ${mod.difficulty_level} — ${meta.label}
                    </span>
                    <button onclick="openEditModuleModal(${mod.id}, ${mod.difficulty_level}, \`${escapeHtml(mod.description)}\`)" class="text-zinc-500 hover:text-white transition" title="Editar descrição">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </button>
                    <button onclick="deleteModule(${mod.id})" class="text-zinc-500 hover:text-rose-400 transition" title="Excluir este nível">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                    </button>
                  </div>

                  <button onclick="openAddLessonModal(${mod.id})" class="btn btn-secondary btn-sm text-xs">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3 w-3 text-amber-400"><path d="M12 4v16m8-8H4"/></svg>
                    <span>Adicionar Aula</span>
                  </button>
                </div>

                <p class="text-xs text-zinc-400 leading-relaxed mb-4">${escapeHtml(mod.description)}</p>

                <!-- Aulas cadastradas -->
                ${
                  lessons.length > 0
                    ? `
                  <ul class="space-y-2.5">
                    ${lessons
                      .map((l) => {
                        const mats = l.materials || [];
                        return `
                      <li class="rounded-xl border border-zinc-800 bg-ink-900/60 p-3.5">
                        <div class="flex items-center justify-between gap-3">
                          <div class="flex items-center gap-2.5 min-w-0">
                            <span class="grid h-6 w-6 place-items-center rounded bg-zinc-800 text-xs font-bold text-amber-400 shrink-0">
                              ${l.order_index}
                            </span>
                            <span class="text-sm font-semibold text-white truncate">${escapeHtml(l.title)}</span>
                          </div>

                          <div class="flex items-center gap-2 shrink-0">
                            <button onclick="openAddMaterialModal(${l.id})" class="btn btn-ghost btn-sm text-xs text-zinc-400 hover:text-white" title="Anexar Material">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3 w-3"><path d="M12 4v16m8-8H4"/></svg>
                              <span>Material</span>
                            </button>
                            <button onclick="openEditLessonModal(${l.id}, \`${escapeHtml(l.title)}\`, \`${escapeHtml(l.video_url)}\`, ${l.order_index})" class="text-zinc-500 hover:text-white p-1" title="Editar Aula">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                            </button>
                            <button onclick="deleteLesson(${l.id})" class="text-zinc-500 hover:text-rose-400 p-1" title="Excluir Aula">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                            </button>
                          </div>
                        </div>

                        <!-- Materiais da Aula -->
                        ${
                          mats.length > 0
                            ? `
                          <div class="mt-3 pt-3 border-t border-zinc-800/60 flex flex-wrap gap-2">
                            ${mats
                              .map(
                                (m) => `
                              <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 text-[11px] text-zinc-300">
                                <span class="font-bold text-amber-400 uppercase">${escapeHtml(m.type)}:</span>
                                <a href="${escapeHtml(m.file_url)}" target="_blank" class="hover:text-white truncate max-w-[180px]">${escapeHtml(m.title)}</a>
                                <button onclick="deleteMaterial(${m.id})" class="text-zinc-500 hover:text-rose-400 ml-1" title="Remover Material">
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
                    : '<p class="text-xs text-zinc-500 italic">Nenhuma aula gravada neste nível ainda.</p>'
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
  document.getElementById('modal-module-title').textContent = 'Adicionar Nível';
  document.getElementById('module-id').value = '';
  document.getElementById('module-song-instrument-id').value = songInstrumentId;
  document.getElementById('module-difficulty-select').disabled = false;
  document.getElementById('module-description-input').value = '';
  openModal('modal-module');
};

window.openEditModuleModal = function (moduleId, difficultyLevel, description) {
  document.getElementById('modal-module-title').textContent = `Editar Nível ${difficultyLevel}`;
  document.getElementById('module-id').value = moduleId;
  document.getElementById('module-song-instrument-id').value = '';
  document.getElementById('module-difficulty-select').value = difficultyLevel;
  document.getElementById('module-difficulty-select').disabled = true;
  document.getElementById('module-description-input').value = description;
  openModal('modal-module');
};

window.deleteModule = async function (moduleId) {
  if (!confirm('Deseja excluir este nível e todas as suas aulas?')) return;
  try {
    await fetchJSON(`/api/admin/modules/${moduleId}`, { method: 'DELETE' });
    showToast('Nível excluído com sucesso.');
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
        showToast('Música criada com sucesso!');
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
        showToast('Dados da música atualizados!');
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
        showToast('Trilha adicionada à música!');
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
          showToast('Nível atualizado!');
        } else {
          // Criação
          await fetchJSON('/api/admin/modules', {
            method: 'POST',
            body: JSON.stringify({ song_instrument_id, difficulty_level, description })
          });
          showToast('Nível adicionado com sucesso!');
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
