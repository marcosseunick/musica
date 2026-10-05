// Lida com o fluxo de login e registro nas telas públicas

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const errorMsgBox = document.getElementById('error-message');
const errorText = document.getElementById('error-text');

function showError(msg) {
  if (errorMsgBox && errorText) {
    errorText.textContent = msg;
    errorMsgBox.classList.remove('hidden');
  }
}

function hideError() {
  if (errorMsgBox) {
    errorMsgBox.classList.add('hidden');
  }
}

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao realizar login.');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/dashboard.html';
    } catch (err) {
      showError(err.message);
    }
  });
}

if (registerForm) {
  // Popula os instrumentos
  const instrumentSelect = document.getElementById('instrument');
  
  async function loadInstruments() {
    try {
      const res = await fetch('/api/instruments');
      if (res.ok) {
        const instruments = await res.json();
        instruments.forEach(inst => {
          const option = document.createElement('option');
          option.value = inst.id;
          option.textContent = inst.name;
          instrumentSelect.appendChild(option);
        });
      }
    } catch (err) {
      console.error('Falha ao carregar instrumentos:', err);
    }
  }

  loadInstruments();

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const instrumentId = document.getElementById('instrument').value;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          email, 
          password, 
          preferred_instrument_id: instrumentId ? Number(instrumentId) : null 
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar.');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/dashboard.html';
    } catch (err) {
      showError(err.message);
    }
  });
}
