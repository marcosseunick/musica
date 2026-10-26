// Fluxo de autenticação: login e cadastro

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const errorMsgBox = document.getElementById('error-message');
const errorText = document.getElementById('error-text');

function showError(msg) {
  if (errorMsgBox && errorText) {
    errorText.textContent = msg;
    errorMsgBox.classList.remove('hidden');
    errorMsgBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function hideError() {
  if (errorMsgBox) {
    errorMsgBox.classList.add('hidden');
  }
}

// Configura o toggle de exibição de senha
document.querySelectorAll('.password-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    const input = document.getElementById(targetId);
    if (!input) return;

    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Ver senha');

    // Alterna o ícone
    btn.innerHTML = isPassword
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
  });
});

// LOGIN
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    const originalBtnHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> <span>Entrando...</span>';

    try {
      const data = await fetchJSON('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (data.user && data.user.role === 'ADMIN') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'dashboard.html';
      }
    } catch (err) {
      showError(err.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  });
}

// CADASTRO
if (registerForm) {
  const instrumentSelect = document.getElementById('instrument');

  async function loadInstruments() {
    try {
      const instruments = await fetchJSON('/api/instruments');
      instruments.forEach(inst => {
        const option = document.createElement('option');
        option.value = inst.id;
        option.textContent = inst.name;
        instrumentSelect.appendChild(option);
      });
    } catch (err) {
      showError('Não foi possível carregar os instrumentos disponíveis.');
    }
  }

  loadInstruments();

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const instrumentId = document.getElementById('instrument').value;
    const submitBtn = registerForm.querySelector('button[type="submit"]');

    if (!instrumentId) {
      showError('Por favor, selecione seu instrumento de preferência.');
      return;
    }

    const originalBtnHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> <span>Criando conta...</span>';

    try {
      const data = await fetchJSON('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          password,
          preferred_instrument_id: Number(instrumentId)
        })
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = 'dashboard.html';
    } catch (err) {
      showError(err.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  });
}
