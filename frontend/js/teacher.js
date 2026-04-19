const API = 'http://localhost:5000/api';
const user = JSON.parse(localStorage.getItem('ls_user') || 'null');
if (!user || user.role !== 'teacher') window.location.href = 'index.html';

document.getElementById('uName').textContent = user.name;
document.getElementById('uAva').textContent = user.name.charAt(0).toUpperCase();

const pgTitles = { pending:'Pending Reviews', overview:'Overview' };

function nav(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  document.getElementById('pg-' + id).classList.add('active');
  if (el) el.classList.add('active');
  document.getElementById('pgTitle').textContent = pgTitles[id] || '';
  if (id === 'overview') loadOverview();
}

function logout() {
  localStorage.removeItem('ls_token');
  localStorage.removeItem('ls_user');
  window.location.href = 'index.html';
}

async function loadPending() {
  const c = document.getElementById('pendList');
  c.innerHTML = '<div class="loading-row"><div class="spin"></div> Loading requests...</div>';
  try {
    const r = await fetch(`${API}/verify/pending?teacherEmail=${encodeURIComponent(user.email)}`);
    const d = await r.json();
    document.getElementById('pendBadge').textContent = d.length;
    if (!d.length) {
      c.innerHTML = '<div class="empty"><div class="empty-icon">✓</div><h3>All caught up</h3><p>No pending verification requests right now</p></div>';
      return;
    }
    c.innerHTML = d.map(req => buildPendCard(req)).join('');
  } catch (e) {
    c.innerHTML = `<div style="color:var(--red);font-size:13px;padding:16px">${e.message}</div>`;
  }
}

function buildPendCard(req) {
  const srcMap = { ai:{tag:'tag-ai',label:'AI Generated'}, resource:{tag:'tag-resource',label:'From Document'} };
  const s = srcMap[req.source] || srcMap.ai;
  const doubt = req.studentComment
    ? `<div class="student-doubt"><strong>Student's doubt</strong>${req.studentComment}</div>` : '';
  return `
    <div class="pend-card" id="pc-${req._id}">
      <div class="pend-top">
        <div style="flex:1">
          <div class="pend-chips">
            <span class="tag ${s.tag}">${s.label}</span>
            <span class="chip">📧 ${req.studentEmail}</span>
          </div>
          <div class="pend-q">${req.question}</div>
        </div>
        <div class="pend-time">${timeAgo(new Date(req.createdAt))}</div>
      </div>
      <div class="pend-body">
        <div class="pend-ans-preview">${req.answer}</div>
        ${doubt}
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.4px">Edit answer before verifying (optional)</div>
        <textarea class="edit-ta" id="ea-${req._id}">${req.answer}</textarea>
        <input class="comment-inp" id="cm-${req._id}" placeholder="Add a note for the student (required for rejection)…"/>
        <div class="action-row">
          <button class="btn btn-green btn-sm" onclick="approve('${req._id}')">✓ Verify as-is</button>
          <button class="btn btn-blue btn-sm" onclick="editVerify('${req._id}')">✏ Edit & Verify</button>
          <button class="btn btn-red btn-sm" onclick="reject('${req._id}')">✕ Reject</button>
        </div>
      </div>
    </div>`;
}

async function approve(id) {
  try {
    const r = await fetch(`${API}/verify/${id}/approve`, { method:'PUT', headers:{'Content-Type':'application/json'} });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    removeCard(id); toast('Answer verified ✓', 'ok');
  } catch (e) { toast(e.message, 'err'); }
}

async function editVerify(id) {
  const answer = document.getElementById('ea-'+id).value.trim();
  const teacherComment = document.getElementById('cm-'+id).value.trim();
  if (!answer) return toast('Answer cannot be empty', 'err');
  try {
    const r = await fetch(`${API}/verify/${id}/edit-verify`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ answer, teacherComment })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    removeCard(id); toast('Answer edited and verified ✓', 'ok');
  } catch (e) { toast(e.message, 'err'); }
}

async function reject(id) {
  const teacherComment = document.getElementById('cm-'+id).value.trim();
  if (!teacherComment) return toast('Please add a rejection comment', 'err');
  try {
    const r = await fetch(`${API}/verify/${id}/reject`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ teacherComment })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    removeCard(id); toast('Request rejected with feedback', 'ok');
  } catch (e) { toast(e.message, 'err'); }
}

function removeCard(id) {
  const c = document.getElementById('pc-'+id);
  if (c) {
    c.style.transition = 'all 0.25s ease';
    c.style.opacity = '0';
    c.style.transform = 'translateX(10px)';
    setTimeout(() => {
      c.remove();
      const b = document.getElementById('pendBadge');
      b.textContent = Math.max(0, (parseInt(b.textContent)||0) - 1);
      if (!document.querySelectorAll('.pend-card').length) {
        document.getElementById('pendList').innerHTML = '<div class="empty"><div class="empty-icon">✓</div><h3>All caught up</h3><p>No pending verification requests right now</p></div>';
      }
    }, 250);
  }
}

async function loadOverview() {
  try {
    const [pr, ar] = await Promise.all([fetch(`${API}/verify/pending`), fetch(`${API}/qa/all`)]);
    const [pend, all] = await Promise.all([pr.json(), ar.json()]);
    document.getElementById('ovPend').textContent = pend.length;
    document.getElementById('ovTotal').textContent = all.length;
    const ver = all.filter(a => a.verified).length;
    document.getElementById('ovVer').textContent = ver;

    const src = {
      verified: ver,
      resource: all.filter(a => a.source==='resource').length,
      ai: all.filter(a => a.source==='ai').length
    };
    const total = all.length || 1;
    const rows = [
      { label:'Verified',      val:src.verified, tag:'tag-verified', color:'var(--green)' },
      { label:'From Document', val:src.resource,  tag:'tag-resource', color:'var(--blue)' },
      { label:'AI Generated',  val:src.ai,        tag:'tag-ai',       color:'var(--amber)' }
    ];
    document.getElementById('srcBreakdown').innerHTML = rows.map(item => `
      <div class="src-row">
        <div class="src-row-top">
          <span class="tag ${item.tag}">${item.label}</span>
          <strong>${item.val} (${Math.round(item.val/total*100)}%)</strong>
        </div>
        <div class="prog-bar"><div class="prog-fill" style="width:${Math.round(item.val/total*100)}%;background:${item.color}"></div></div>
      </div>`).join('');

    const tagMap = { verified:'tag-verified', resource:'tag-resource', ai:'tag-ai' };
    const dotMap = { verified:'green', resource:'blue', ai:'amber' };
    document.getElementById('recentQs').innerHTML = all.slice(0,6).map(a => `
      <div class="activity-item">
        <div class="act-dot ${dotMap[a.source]||'amber'}"></div>
        <div class="act-text">
          <strong>${a.question.length>55 ? a.question.slice(0,55)+'…' : a.question}</strong>
          <span class="tag ${tagMap[a.source]||'tag-ai'}" style="margin-top:3px">${a.source}</span>
        </div>
        <span class="act-time">${timeAgo(new Date(a.createdAt))}</span>
      </div>`).join('');
  } catch(e) { console.error(e); }
}

function timeAgo(d) {
  const s = Math.floor((Date.now()-d)/1000);
  if(s<60) return 'just now';
  if(s<3600) return Math.floor(s/60)+'m ago';
  if(s<86400) return Math.floor(s/3600)+'h ago';
  return Math.floor(s/86400)+'d ago';
}

function toast(msg, type='ok') {
  const el = document.createElement('div');
  el.className = `toast ${type}`; el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

loadPending();
setInterval(loadPending, 30000);