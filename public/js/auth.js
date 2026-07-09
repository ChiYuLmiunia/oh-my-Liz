function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

  if (tab === 'login') {
    document.querySelectorAll('.auth-tab')[0].classList.add('active');
    document.getElementById('loginForm').classList.add('active');
  } else {
    document.querySelectorAll('.auth-tab')[1].classList.add('active');
    document.getElementById('registerForm').classList.add('active');
  }

  document.getElementById('message').innerHTML = '';
}

function showMessage(message, type = 'error') {
  const msgDiv = document.getElementById('message');
  msgDiv.innerHTML = `<div class="message message-${type}">${message}</div>`;
  setTimeout(() => { msgDiv.innerHTML = ''; }, 5000);
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const result = await authAPI.login(username, password);
    if (result.success) {
      localStorage.setItem('token', result.data.token);
      localStorage.setItem('user', JSON.stringify(result.data.user));
      window.location.href = '/home';
    } else {
      showMessage(result.message);
    }
  } catch (err) {
    showMessage(err.message);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('regUsername').value;
  const password = document.getElementById('regPassword').value;
  const passwordConfirm = document.getElementById('regPasswordConfirm').value;

  if (password !== passwordConfirm) {
    showMessage('两次输入的密码不一致');
    return;
  }

  try {
    const result = await authAPI.register(username, password);
    if (result.success) {
      showMessage(result.message, 'success');
      document.getElementById('registerForm').reset();
      setTimeout(() => switchTab('login'), 2000);
    } else {
      showMessage(result.message);
    }
  } catch (err) {
    showMessage(err.message);
  }
}

// 检查是否已登录
(function checkAuth() {
  const token = getToken();
  if (token) {
    const user = getUser();
    if (user && user.role && user.role !== 'pending') {
      window.location.href = '/home';
    }
  }
})();
