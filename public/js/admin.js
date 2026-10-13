document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const user = JSON.parse(userStr);
    if (user.role !== 'ADMIN') {
      window.location.href = 'dashboard.html';
      return;
    }
  } catch (e) {
    window.location.href = 'login.html';
    return;
  }

  // Revelar a interface se for admin
  document.getElementById('admin-body').classList.remove('hidden');

  // Inicializa dados e a navegação SPA
  await loadInstrumentsSelect();
  initSPA();
});

// ==========================================
// UTILITÁRIOS
// ==========================================

// Único ponto de acesso à API do admin: SEMPRE envia o cabeçalho Authorization.
function adminFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('token'),
      'Content-Type': 'application/json'
    }
  });
}

// GET/POST + JSON. Só lança erro se a API realmente falhar.
async function adminFetchJSON(url, options = {}) {
  let res;
  try {
    res = await adminFetch(url, options);
  } catch (networkErr) {
    throw new Error('Não foi possível comunicar com o servidor. Verifique a conexão.');
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
    throw new Error(data.error || 'Sessão expirada ou sem permissão.');
  }
  if (!res.ok) throw new Error(data.error || `Falha na requisição (HTTP ${res.status}).`);
  return data;
}

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toast-message');
  
  toast.className = `fixed bottom-4 right-4 rounded-lg p-4 shadow-lg flex items-center transition-opacity duration-300 z-50 ${isError ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`;
  msgEl.textContent = message;
  
  toast.classList.remove('hidden', 'opacity-0');
  
  setTimeout(() => {
    toast.classList.add('opacity-0');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 4000);
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    // Animação simples
    modal.querySelector('.modal-content').classList.add('section-enter');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    // Reseta form se houver
    const form = modal.querySelector('form');
    if (form) form.reset();
  }
}

// ==========================================
// NAVEGAÇÃO SPA
// ==========================================

let currentSongsData = [];
let activeSongId = null;

function initSPA() {
  const sections = document.querySelectorAll('.studio-section');
  const links = document.querySelectorAll('a[data-section]');

  window.showSection = async function(sectionId, param = null) {
    // Hide all
    sections.forEach(sec => sec.classList.add('hidden'));
    links.forEach(l => l.classList.remove('is-active'));

    // Handle nested edit view specially
    let targetId = sectionId;
    let mainNavId = sectionId;
    if (sectionId === 'song-edit') {
      targetId = 'section-song-edit';
      mainNavId = 'songs';
      await loadSongEditData(param);
    } else {
      targetId = `section-${sectionId}`;
      if (sectionId === 'songs') await loadSongsGrid();
      if (sectionId === 'users') await loadUsers();
      if (sectionId === 'instruments') await loadInstrumentsList();
    }

    const targetSection = document.getElementById(targetId);
    if (targetSection) {
      targetSection.classList.remove('hidden');
      targetSection.classList.remove('section-enter');
      void targetSection.offsetWidth;
      targetSection.classList.add('section-enter');
    }

    document.querySelectorAll(`a[data-section="${mainNavId}"]`).forEach(l => l.classList.add('is-active'));
  };

  // Clique nos menus
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = link.dataset.section;
      window.history.pushState(null, '', `#${sectionId}`);
      showSection(sectionId);
    });
  });

  // Handle URL Load
  const handleHash = () => {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('song-edit-')) {
      const id = hash.replace('song-edit-', '');
      showSection('song-edit', id);
    } else if (['songs', 'instruments', 'users'].includes(hash)) {
      showSection(hash);
    } else {
      window.history.replaceState(null, '', '#songs');
      showSection('songs');
    }
  };

  window.addEventListener('popstate', handleHash);
  handleHash();
}

// ==========================================
// CARREGAMENTO DE DADOS (GET)
// ==========================================

async function loadInstrumentsSelect() {
  try {
    const instruments = await adminFetchJSON('/api/admin/instruments');
    const select = document.getElementById('modal-select-instruments');
    select.innerHTML = '<option value="">Selecione...</option>' + 
      instruments.map(i => `<option value="${i.id}">${escapeHtml(i.name)}</option>`).join('');
  } catch (err) {
    console.error('Falha ao carregar instrumentos', err);
  }
}

async function loadInstrumentsList() {
  try {
    const instruments = await adminFetchJSON('/api/admin/instruments');
    const list = document.getElementById('instruments-list');
    if (instruments.length === 0) {
      list.innerHTML = '<p class="text-zinc-500 text-sm">Nenhum instrumento cadastrado.</p>';
      return;
    }
    list.innerHTML = instruments.map(i => `
      <li class="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center gap-4">
        ${i.icon_url ? `<img src="${escapeHtml(i.icon_url)}" class="w-8 h-8 rounded-full object-cover">` : `<div class="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs">Inst</div>`}
        <span class="text-white font-medium">${escapeHtml(i.name)}</span>
      </li>
    `).join('');
  } catch (err) {
    showToast(err.message || 'Erro ao carregar instrumentos', true);
  }
}

async function loadUsers() {
  try {
    const users = await adminFetchJSON('/api/admin/users');
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = users.map(u => `
      <tr class="hover:bg-zinc-800/50 transition">
        <td class="px-6 py-4 font-medium text-white">${escapeHtml(u.name)}</td>
        <td class="px-6 py-4">${escapeHtml(u.email)}</td>
        <td class="px-6 py-4">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${u.role === 'ADMIN' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-zinc-800 text-zinc-300'}">
            ${u.role}
          </span>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    showToast(err.message || 'Erro ao carregar utilizadores', true);
  }
}

async function loadSongsGrid() {
  try {
    const songs = await adminFetchJSON('/api/admin/songs');
    currentSongsData = songs;
    const grid = document.getElementById('songs-grid');
    
    if (songs.length === 0) {
      grid.innerHTML = '<div class="col-span-full text-zinc-500 text-center py-12">Nenhuma música cadastrada.</div>';
      return;
    }

    grid.innerHTML = songs.map(song => {
      const instrumentsCount = song.instruments.length;
      return `
        <div onclick="window.location.hash='song-edit-${song.id}'" class="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50 transition cursor-pointer rounded-2xl p-6 group relative">
          <div class="absolute inset-0 bg-gradient-to-t from-zinc-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none"></div>
          <h3 class="font-display text-xl font-bold text-white mb-1">${escapeHtml(song.title)}</h3>
          <p class="text-zinc-400 text-sm mb-4">${escapeHtml(song.artist)}</p>
          <div class="flex items-center gap-2 text-xs text-zinc-500 font-medium">
            <span class="px-2 py-1 bg-zinc-950 rounded-md border border-zinc-800">${instrumentsCount} Trilha(s)</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    showToast(err.message || 'Erro ao carregar músicas', true);
  }
}

async function loadSongEditData(songId) {
  activeSongId = parseInt(songId);
  // Ensure we have data
  if (currentSongsData.length === 0) {
    try {
      currentSongsData = await adminFetchJSON('/api/admin/songs');
    } catch (e) {
      showToast('Erro ao carregar música', true);
      return;
    }
  }

  const song = currentSongsData.find(s => s.id === activeSongId);
  if (!song) {
    showToast('Música não encontrada.', true);
    window.location.hash = 'songs';
    return;
  }

  document.getElementById('edit-song-title').textContent = song.title;
  document.getElementById('edit-song-artist').textContent = song.artist;

  const contentDiv = document.getElementById('song-edit-content');
  if (song.instruments.length === 0) {
    contentDiv.innerHTML = '<p class="text-zinc-500">Nenhuma trilha (instrumento) associada a esta música.</p>';
    return;
  }

  // Renderiza cada trilha (SongInstrument)
  contentDiv.innerHTML = song.instruments.map(songInst => `
    <div class="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden mb-8">
      <!-- Header da Trilha -->
      <div class="px-6 py-4 bg-zinc-800/30 border-b border-zinc-800 flex justify-between items-center">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
            <svg class="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </div>
          <div>
            <h3 class="text-white font-medium text-lg">Trilha: ${escapeHtml(songInst.instrument.name)}</h3>
          </div>
        </div>
        <button onclick="openAddModuleModal(${songInst.id})" class="text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition">
          + Adicionar Nível
        </button>
      </div>

      <!-- Módulos (Níveis) -->
      <div class="p-6 space-y-6">
        ${songInst.modules.length === 0 ? '<p class="text-zinc-500 text-sm">Nenhum nível cadastrado para este instrumento.</p>' : ''}
        ${songInst.modules.map(mod => `
          <div class="border border-zinc-800 rounded-xl p-5 bg-zinc-950/30">
            <div class="flex justify-between items-start mb-4">
              <div>
                <h4 class="text-white font-semibold">Nível ${mod.difficulty_level}</h4>
                <p class="text-xs text-zinc-500 mt-1">${escapeHtml(mod.description)}</p>
              </div>
              <button onclick="openAddLessonModal(${mod.id})" class="text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1.5 rounded-md transition border border-indigo-500/20">
                + Adicionar Aula
              </button>
            </div>

            <!-- Aulas -->
            ${mod.lessons.length > 0 ? `
              <ul class="space-y-2 mt-4">
                ${mod.lessons.map(lesson => `
                  <li class="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                    <div class="flex justify-between items-center">
                      <div class="flex items-center gap-3">
                        <span class="text-zinc-600 text-xs font-bold w-4">${lesson.order_index}</span>
                        <span class="text-zinc-200 text-sm font-medium">${escapeHtml(lesson.title)}</span>
                      </div>
                      <button onclick="openAddMaterialModal(${lesson.id})" class="text-xs text-zinc-400 hover:text-white transition flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-width="2" d="M12 4v16m8-8H4"/></svg> Material
                      </button>
                    </div>
                    
                    <!-- Materiais da Aula -->
                    ${lesson.materials.length > 0 ? `
                      <div class="mt-3 ml-7 flex flex-wrap gap-2">
                        ${lesson.materials.map(mat => `
                          <a href="${escapeHtml(mat.file_url)}" target="_blank" class="inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-800 rounded text-[11px] font-medium text-zinc-300 hover:text-white hover:bg-zinc-700 transition">
                            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                            ${escapeHtml(mat.title)} (${mat.type})
                          </a>
                        `).join('')}
                      </div>
                    ` : ''}
                  </li>
                `).join('')}
              </ul>
            ` : '<p class="text-zinc-600 text-xs mt-2 italic">Sem aulas neste nível.</p>'}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

// ==========================================
// PREPARAÇÃO DE MODAIS
// ==========================================

window.openAddModuleModal = function(songInstrumentId) {
  document.getElementById('module-song-instrument-id').value = songInstrumentId;
  openModal('modal-add-module');
}

window.openAddLessonModal = function(moduleId) {
  document.getElementById('lesson-module-id').value = moduleId;
  openModal('modal-add-lesson');
}

window.openAddMaterialModal = function(lessonId) {
  document.getElementById('material-lesson-id').value = lessonId;
  openModal('modal-add-material');
}

// ==========================================
// SUBMISSÃO DE FORMULÁRIOS
// ==========================================

function handleFormSubmit(formId, endpoint, modalIdToClose, reloadCallback) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Aguarde...';

    try {
      const json = await adminFetchJSON(endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      

      showToast('Criado com sucesso!');
      if (modalIdToClose) closeModal(modalIdToClose);
      form.reset();
      
      if (reloadCallback) await reloadCallback();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

// Configura os forms
handleFormSubmit('form-instrument', '/api/admin/instruments', null, async () => {
  await loadInstrumentsList();
  await loadInstrumentsSelect();
});

handleFormSubmit('form-song', '/api/admin/songs', 'modal-add-song', async () => {
  await loadSongsGrid();
});

handleFormSubmit('form-module', '/api/admin/modules', 'modal-add-module', async () => {
  currentSongsData = await adminFetchJSON('/api/admin/songs'); // reload global state
  if (activeSongId) loadSongEditData(activeSongId);
});

handleFormSubmit('form-lesson', '/api/admin/lessons', 'modal-add-lesson', async () => {
  currentSongsData = await adminFetchJSON('/api/admin/songs');
  if (activeSongId) loadSongEditData(activeSongId);
});

handleFormSubmit('form-material', '/api/admin/materials', 'modal-add-material', async () => {
  currentSongsData = await adminFetchJSON('/api/admin/songs');
  if (activeSongId) loadSongEditData(activeSongId);
});
