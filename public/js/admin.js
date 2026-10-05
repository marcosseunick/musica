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

  // Popula os Selects
  await loadSelects();
});

// Toast Helper
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toast-message');
  
  toast.className = `fixed bottom-4 right-4 rounded-lg p-4 shadow-lg flex items-center transition-opacity duration-300 ${isError ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`;
  msgEl.textContent = message;
  
  setTimeout(() => {
    toast.classList.add('opacity-0');
    setTimeout(() => {
      toast.className = 'hidden';
    }, 300);
  }, 4000);
}

// Interceptadores de Formulário
function handleForm(formId, endpoint, onSuccess) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify(data)
      });
      
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Erro na requisição');
      }

      showToast('Cadastrado com sucesso!');
      form.reset();
      
      if (onSuccess) {
        await onSuccess();
      }
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

async function loadSelects() {
  try {
    const [instruments, songInstruments, modules, lessons] = await Promise.all([
      fetchJSON('/api/admin/instruments'),
      fetchJSON('/api/admin/song-instruments'),
      fetchJSON('/api/admin/modules'),
      fetchJSON('/api/admin/lessons'),
    ]);

    // Popular Instrumentos
    const selInst = document.getElementById('select-instruments');
    selInst.innerHTML = '<option value="">Selecione...</option>' + 
      instruments.map(i => `<option value="${i.id}">${escapeHtml(i.name)}</option>`).join('');

    // Popular Trilhas (SongInstrument)
    const selSongInst = document.getElementById('select-song-instruments');
    selSongInst.innerHTML = '<option value="">Selecione a trilha...</option>' + 
      songInstruments.map(si => `<option value="${si.id}">${escapeHtml(si.song.title)} (${escapeHtml(si.instrument.name)})</option>`).join('');

    // Popular Módulos (Níveis)
    const selModules = document.getElementById('select-modules');
    const niveis = {1: 'Fácil', 2: 'Médio', 3: 'Difícil', 4: 'Avançado'};
    selModules.innerHTML = '<option value="">Selecione o nível...</option>' + 
      modules.map(m => `<option value="${m.id}">${escapeHtml(m.song_instrument.song.title)} - ${niveis[m.difficulty_level]} (${escapeHtml(m.song_instrument.instrument.name)})</option>`).join('');

    // Popular Aulas
    const selLessons = document.getElementById('select-lessons');
    selLessons.innerHTML = '<option value="">Selecione a aula...</option>' + 
      lessons.map(l => `<option value="${l.id}">${escapeHtml(l.title)} [Módulo ${l.module.difficulty_level}] (${escapeHtml(l.module.song_instrument.song.title)})</option>`).join('');

  } catch (err) {
    showToast('Falha ao carregar dados dos selects: ' + err.message, true);
  }
}

// Setup listeners
handleForm('form-song', '/api/admin/songs', loadSelects);
handleForm('form-module', '/api/admin/modules', loadSelects);
handleForm('form-lesson', '/api/admin/lessons', loadSelects);
handleForm('form-material', '/api/admin/materials', loadSelects);

// Navegação da Sidebar simplificada
document.querySelectorAll('aside nav a').forEach(link => {
  link.addEventListener('click', (e) => {
    // Apenas visual
    document.querySelectorAll('aside nav a').forEach(a => {
      a.classList.remove('bg-zinc-800', 'text-white');
      a.classList.add('text-zinc-400');
    });
    e.target.classList.remove('text-zinc-400');
    e.target.classList.add('bg-zinc-800', 'text-white');
  });
});
