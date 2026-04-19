const API = 'http://localhost:5000/api';
let role = 'student';

function setRole(r) {
  role = r;
  document.getElementById('roleStudent').classList.toggle('active', r === 'student');
  document.getElementById('roleTeacher').classList.toggle('active', r === 'teacher');
}

function toggle(showReg) {
  document.getElementById('loginView').classList.toggle('hidden', showReg);
  document.getElementById('regView').classList.toggle('hidden', !showReg);
  document.getElementById('formTitle').textContent = showReg ? 'Create account' : 'Welcome back';
  document.getElementById('formSub').textContent = showReg
    ? 'Join LearnSphere today'
    : 'Sign in to continue your learning journey';
}

async function login() {
  const email = document.getElementById('lEmail').value.trim();
  const password = document.getElementById('lPass').value;
  if (!email || !password) return toast('Please fill in all fields', 'err');
  try {
    const r = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const d = await r.json();
    if (!r.ok) return toast(d.error || 'Login failed', 'err');
    localStorage.setItem('ls_token', d.token);
    localStorage.setItem('ls_user', JSON.stringify(d.user));
    window.location.href = d.user.role === 'teacher' ? 'teacher.html' : 'student.html';
  } catch { toast('Cannot reach server. Is backend running?', 'err'); }
}

async function register() {
  const name = document.getElementById('rName').value.trim();
  const email = document.getElementById('rEmail').value.trim();
  const password = document.getElementById('rPass').value;
  if (!name || !email || !password) return toast('Please fill in all fields', 'err');
  try {
    const r = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    });
    const d = await r.json();
    if (!r.ok) return toast(d.error || 'Registration failed', 'err');
    localStorage.setItem('ls_token', d.token);
    localStorage.setItem('ls_user', JSON.stringify(d.user));
    window.location.href = d.user.role === 'teacher' ? 'teacher.html' : 'student.html';
  } catch { toast('Cannot reach server. Is backend running?', 'err'); }
}

function toast(msg, type = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

const u = JSON.parse(localStorage.getItem('ls_user') || 'null');
if (u) window.location.href = u.role === 'teacher' ? 'teacher.html' : 'student.html';