const API = 'http://localhost:5000/api';
const user = JSON.parse(localStorage.getItem('ls_user') || 'null');
if (!user || user.role !== 'student') window.location.href = 'index.html';

document.getElementById('uName').textContent = user.name;
document.getElementById('uAva').textContent = user.name.charAt(0).toUpperCase();

// Use per-student key so requests are isolated per user
const requestsKey = `ls_requests_${user.email}`;
let myRequests = JSON.parse(localStorage.getItem(requestsKey) || '[]');
let chatMode = 'normal'; // normal | short | detailed
let chatMessages = []; // in-memory session only
let selectedDocumentId = null; // tracks which document is selected for Q&A

// CHANGE 1: answerStore to safely hold answer data instead of passing through onclick
const answerStore = {};

const pgTitles = { home: 'Dashboard', chat: 'Chat', requests: 'My Requests', docs: 'Documents' };

// ── NAVIGATION ────────────────────────────────────
function nav(id, el) {
  // Hide all standard pages
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.style.display = 'none';
  });
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  document.getElementById('pgTitle').textContent = pgTitles[id] || '';

  if (id === 'chat') {
    buildChatPage();
  } else {
    // Make sure chat is hidden
    const chatPg = document.getElementById('pg-chat');
    chatPg.classList.remove('active');
    document.getElementById('mainContent').style.padding = '28px 32px';
   
    const pg = document.getElementById('pg-' + id);
    pg.classList.add('active');
    pg.style.display = 'block';
    if (id === 'requests') loadRequests();
    if (id === 'docs') loadDocs();
  }
}

// ── BUILD CHAT PAGE ───────────────────────────────
function buildChatPage() {
  document.getElementById('mainContent').style.padding = '0';
  const pg = document.getElementById('pg-chat');
  pg.classList.add('active');

  // Only build HTML once per session
  if (document.getElementById('chatMessages')) {
    refreshDocPanel();
    return;
  }

  pg.innerHTML = `
    <div class="chat-shell">

      <!-- Left: Documents Panel -->
      <div class="docs-panel">
        <div class="docs-panel-head">
          <span class="docs-panel-title">Materials</span>
          <button class="btn-upload-sm" onclick="document.getElementById('fileInp').click()">
            + Upload
          </button>
        </div>
        <div class="docs-panel-list" id="docPanelList">
          <div class="docs-panel-empty">
            <div class="de-icon">📄</div>
            No PDFs yet.<br/>Upload to get smarter answers.
          </div>
        </div>
      </div>

      <!-- Right: Chat Main -->
      <div class="chat-main">
        <div class="chat-messages" id="chatMessages">
          <div class="chat-welcome" id="chatWelcome">
            <div class="w-icon">◈</div>
            <h2>What do you want to learn today?</h2>
            <p>Ask a question, upload a PDF first for document-based answers, or just start typing.</p>
            <div class="suggest-grid">
              <button class="suggest-chip" onclick="fillSuggest('What is photosynthesis in short?')">What is photosynthesis?</button>
              <button class="suggest-chip" onclick="fillSuggest('Explain recursion in detail')">Explain recursion in detail</button>
              <button class="suggest-chip" onclick="fillSuggest('What is a shell in Linux?')">What is a shell in Linux?</button>
              <button class="suggest-chip" onclick="fillSuggest('How does TCP/IP work?')">How does TCP/IP work?</button>
            </div>
          </div>
        </div>

        <div class="chat-input-bar">
          <div class="chat-input-inner">
            <div class="chat-input-top">
              <textarea
                class="chat-ta"
                id="chatInput"
                placeholder="Ask anything..."
                rows="1"
                onkeydown="chatKey(event)"
                oninput="autoGrow(this)"
              ></textarea>
              <button class="btn-send" id="sendBtn" onclick="sendMessage()">↑</button>
            </div>
            <div class="chat-input-footer">
              <button class="btn-attach" onclick="document.getElementById('fileInp').click()">
                📎 Upload PDF
              </button>
              <div class="doc-select-wrap">
                <span class="doc-select-label">Doc:</span>
                <select class="doc-select" id="docSelect" onchange="selectedDocumentId=this.value;this.classList.remove('required')">
                  <option value="">— Select a document —</option>
                </select>
              </div>
              <div class="toggle-group-sm" id="modeToggle">
                <button class="tog-sm active" onclick="setChatMode('normal',this)">Default</button>
                <button class="tog-sm" onclick="setChatMode('short',this)">Short</button>
                <button class="tog-sm" onclick="setChatMode('detailed',this)">Detailed</button>
              </div>
            </div>
          </div>
          <div class="chat-hint">↵ to send · Shift+↵ for new line · 📎 to upload PDF</div>
        </div>
      </div>

    </div>`;

  // Load docs panel
  refreshDocPanel();

  // Restore session messages if any
  if (chatMessages.length > 0) {
    const welcome = document.getElementById('chatWelcome');
    if (welcome) welcome.remove();
    chatMessages.forEach(m => renderExisting(m));
  }
}

async function refreshDocPanel() {
  const panel = document.getElementById('docPanelList');
  if (!panel) return;
  try {
      const r = await fetch(`${API}/upload/documents?email=${encodeURIComponent(user.email)}`);
      const docs = await r.json();
      if (!docs.length) {
      panel.innerHTML = `
        <div class="docs-panel-empty">
          <div class="de-icon">📄</div>
          No PDFs yet.<br/>Upload to get smarter answers.
        </div>`;
      populateDocSelect([]);
      return;
    }
    panel.innerHTML = docs.map(doc => `
      <div class="doc-panel-item">
        <div class="doc-panel-ico">📄</div>
        <div>
          <div class="doc-panel-name">${escHtml(doc.originalName)}</div>
          <div class="doc-panel-meta">${doc.totalChunks} chunks · ${timeAgo(new Date(doc.createdAt))}</div>
        </div>
      </div>`).join('');
    populateDocSelect(docs);
  } catch {
    panel.innerHTML = `<div class="docs-panel-empty" style="color:var(--red)">Could not load</div>`;
  }
}

function populateDocSelect(docs) {
  const sel = document.getElementById('docSelect');
  if (!sel) return;
  if (!docs.length) {
    sel.innerHTML = '<option value="">No documents uploaded yet</option>';
    selectedDocumentId = null;
    return;
  }
  const prev = selectedDocumentId;
  sel.innerHTML = '<option value="">— Select a document —</option>' +
    docs.map(d => `<option value="${d._id}">${escHtml(d.originalName)}</option>`).join('');
  // Restore previous selection if still valid
  if (prev && docs.find(d => d._id === prev)) {
    sel.value = prev;
  }
}

function fillSuggest(text) {
  const inp = document.getElementById('chatInput');
  if (inp) { inp.value = text; inp.focus(); autoGrow(inp); }
}

function setChatMode(m, el) {
  chatMode = m;
  document.querySelectorAll('#modeToggle .tog-sm').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}

function chatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

// ── SEND MESSAGE ──────────────────────────────────
async function sendMessage() {
  const inp = document.getElementById('chatInput');
  const question = inp?.value.trim();
  if (!question) return;

  // Enforce document selection
  const docSel = document.getElementById('docSelect');
  if (!selectedDocumentId) {
    if (docSel) docSel.classList.add('required');
    toast('Please select a document before asking a question', 'err');
    return;
  }

  // Hide welcome if first message
  const welcome = document.getElementById('chatWelcome');
  if (welcome) welcome.remove();

  // Show user bubble
  appendUserBubble(question);
  inp.value = '';
  inp.style.height = 'auto';

  // Show thinking
  const thinkId = appendThinking();

  // Disable send
  const btn = document.getElementById('sendBtn');
  if (btn) btn.disabled = true;

  try {
    let q = question;
    if (chatMode === 'short' && !question.toLowerCase().includes('short')) q += ' in short';
    if (chatMode === 'detailed' && !question.toLowerCase().includes('detail')) q += ' explain in detail';

    const r = await fetch(`${API}/qa/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, studentEmail: user.email, selectedDocument: selectedDocumentId })
    });
    const d = await r.json();
    removeThinking(thinkId);
    if (!r.ok) throw new Error(d.error);

    appendAnswerBubble(d, question);
    loadStats();
  } catch (e) {
    removeThinking(thinkId);
    appendSystemMsg('⚠ ' + e.message, true);
  }

  if (btn) btn.disabled = false;
  scrollToBottom();
}

// ── BUBBLE RENDERERS ──────────────────────────────
function appendUserBubble(text) {
  const msgs = document.getElementById('chatMessages');
  const row = document.createElement('div');
  row.className = 'msg-row';
  row.innerHTML = `<div class="msg-user">${escHtml(text)}</div>`;
  msgs.appendChild(row);
  chatMessages.push({ type: 'user', text });
  scrollToBottom();
}

function appendThinking() {
  const msgs = document.getElementById('chatMessages');
  const id = 'think-' + Date.now();
  const row = document.createElement('div');
  row.className = 'msg-row';
  row.id = id;
  row.innerHTML = `
    <div class="msg-assistant">
      <div class="msg-ava">◈</div>
      <div class="msg-bubble msg-thinking">
        <div class="msg-bubble-body">
          <div class="dots"><span></span><span></span><span></span></div>
          <span>Thinking...</span>
        </div>
      </div>
    </div>`;
  msgs.appendChild(row);
  scrollToBottom();
  return id;
}

function removeThinking(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// CHANGE 2: appendAnswerBubble — store data in answerStore, pass only ID to onclick
function appendAnswerBubble(d, question) {
  const srcMap = {
    verified: { cls: 'src-verified', tag: 'tag-verified', icon: '✓', label: 'Verified' },
    resource:  { cls: 'src-resource',  tag: 'tag-resource', icon: '▤', label: 'From Document' },
    ai:        { cls: 'src-ai',        tag: 'tag-ai',       icon: '◆', label: 'AI Generated' }
  };
  const normalized = (d.tag || '').toLowerCase();

const s = srcMap[normalized] || srcMap.ai;
const aid = 'ans-' + Date.now();
const canVerify = normalized !== 'verified';

// Store correct source
answerStore[aid] = { question, answer: d.answer, source: normalized };

  const tcNote = d.teacherComment
    ? `<div class="bubble-note teacher"><strong>Teacher Note</strong>${escHtml(d.teacherComment)}</div>` : '';
  const rejNote = d.previouslyRejected && d.rejectionComment
    ? `<div class="bubble-note reject"><strong>Previous Feedback</strong>${escHtml(d.rejectionComment)}</div>` : '';

  const verifySection = canVerify ? `
    <div class="verify-section" id="vs-${aid}">
      <p>Not satisfied with this answer? Select an expert and request verification.</p>
      <select class="verify-expert-select" id="vex-${aid}">
        <option value="">Loading experts...</option>
      </select>
      <textarea class="verify-inp" id="vi-${aid}" placeholder="Describe your specific doubt (optional)..." rows="2"></textarea>
      <button class="btn btn-ghost btn-sm" onclick="sendVerify('${aid}')">
        ↑ Send for Verification
      </button>
    </div>` : '';

  // Load experts into dropdown after rendering
  if (canVerify) setTimeout(() => loadExpertDropdown(aid), 100);

  const msgs = document.getElementById('chatMessages');
  const row = document.createElement('div');
  row.className = 'msg-row';
  row.id = aid;
  row.innerHTML = `
    <div class="msg-assistant">
      <div class="msg-ava">◈</div>
      <div class="msg-bubble ${s.cls}">
        <div class="msg-bubble-top">
          <span class="tag ${s.tag}">${s.icon} ${s.label}</span>
        </div>
        <div class="msg-bubble-body">
          <div class="msg-text">${formatAnswer(d.answer)}</div>
          ${tcNote}${rejNote}
        </div>
        ${verifySection}
      </div>
    </div>`;
  msgs.appendChild(row);
  chatMessages.push({ type: 'answer', data: d, question });
  scrollToBottom();
}

function appendSystemMsg(text, isError = false) {
  const msgs = document.getElementById('chatMessages');
  const el = document.createElement('div');
  el.className = 'msg-row';
  el.innerHTML = `<div class="msg-system" style="${isError ? 'color:var(--red);border-color:var(--red-border)' : ''}">${text}</div>`;
  msgs.appendChild(el);
  scrollToBottom();
}

// Restore existing messages (after nav away and back)
function renderExisting(m) {
  if (m.type === 'user') appendUserBubble(m.text);
  if (m.type === 'answer') appendAnswerBubble(m.data, m.question);
  if (m.type === 'system') appendSystemMsg(m.text);
}

// Add expert dropdown loader
async function loadExpertDropdown(aid) {
  const sel = document.getElementById('vex-' + aid);
  if (!sel) return;
  try {
    const r = await fetch(`${API}/auth/experts`);
    const experts = await r.json();
    if (!experts.length) {
      sel.innerHTML = '<option value="">No experts available</option>';
      return;
    }
    sel.innerHTML = '<option value="">Select an expert...</option>' +
      experts.map(e => `<option value="${e.email}">${e.name} — ${e.domain || 'General'}</option>`).join('');
  } catch {
    sel.innerHTML = '<option value="">Could not load experts</option>';
  }
}

async function sendVerify(aid) {
  const stored = answerStore[aid];
  if (!stored) return toast('Could not find answer data', 'err');
  const { question, answer, source: src } = stored;
  const comment = document.getElementById('vi-' + aid)?.value || '';
  const assignedTeacher = document.getElementById('vex-' + aid)?.value || '';
  if (!assignedTeacher) return toast('Please select an expert teacher first', 'err');

  try {
    const r = await fetch(`${API}/verify/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer, source: src, studentEmail: user.email, studentComment: comment, assignedTeacher })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);

    // Update verify section in bubble
    const vs = document.getElementById('vs-' + aid);
    if (vs) vs.innerHTML = '<div class="verify-sent">✓ Sent for teacher review · Check My Requests for status</div>';

    // Track locally
    myRequests.unshift({ id: d.requestId, question, answer, source: src, comment, status: 'pending' });
    localStorage.setItem(requestsKey, JSON.stringify(myRequests));
    updateBadge();
    toast('Verification request sent', 'ok');
  } catch (e) { toast(e.message, 'err'); }
}

// ── FILE UPLOAD ───────────────────────────────────
async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';
  if (file.type !== 'application/pdf') return toast('Only PDF files allowed', 'err');

  // Make sure chat is visible
  if (!document.getElementById('chatMessages')) {
    nav('chat', document.querySelectorAll('.nav-link')[1]);
  }
  const welcome = document.getElementById('chatWelcome');
  if (welcome) welcome.remove();

  appendSystemMsg(`📎 Uploading ${file.name}...`);

const fd = new FormData();
  fd.append('file', file);
  fd.append('studentEmail', user.email);

  try {
    const r = await fetch(`${API}/upload/pdf`, { method: 'POST', body: fd });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);

    const msgs = document.getElementById('chatMessages');
    const last = msgs.lastElementChild;
    if (last) last.remove();

    if (d.alreadyExists) {
      const row = document.createElement('div');
      row.className = 'msg-row';
      row.innerHTML = `
        <div class="msg-assistant">
          <div class="msg-ava">◈</div>
          <div class="msg-bubble src-resource">
            <div class="msg-bubble-body">
              <div class="msg-text">
                <strong style="color:var(--blue)">📄 Already indexed!</strong><br/>
                <span style="color:var(--text2)">
                  <strong>${escHtml(d.originalName)}</strong> is already in your knowledge base
                  (${d.totalChunks} chunks). Go ahead and ask your question!
                </span>
              </div>
            </div>
          </div>
        </div>`;
      msgs.appendChild(row);
      scrollToBottom();
      toast('Document already indexed — ask your question!', 'ok');
    } else {
      appendSystemMsg(`✓ ${d.originalName} uploaded — ${d.totalChunks} chunks indexed`);
      chatMessages.push({ type: 'system', text: `✓ ${d.originalName} uploaded — ${d.totalChunks} chunks indexed` });
      refreshDocPanel();
      const msgs2 = document.getElementById('chatMessages');
      const row = document.createElement('div');
      row.className = 'msg-row';
      row.innerHTML = `
        <div class="msg-assistant">
          <div class="msg-ava">◈</div>
          <div class="msg-bubble src-verified">
            <div class="msg-bubble-body">
              <div class="msg-text">
                <strong style="color:var(--green)">PDF indexed successfully!</strong><br/>
                <span style="color:var(--text2)">
                  I have indexed <strong>${escHtml(d.originalName)}</strong> (${d.totalChunks} chunks).
                  You can now ask questions about its content.
                </span>
              </div>
            </div>
          </div>
        </div>`;
      msgs2.appendChild(row);
      scrollToBottom();
      toast('PDF uploaded successfully', 'ok');
    }
    selectedDocumentId = d.documentId;

     const sel = document.getElementById('docSelect');
     if (sel) {
     sel.value = d.documentId;
     sel.classList.remove('required');
}

document.getElementById('chatInput')?.focus();

} catch (err) {
    const msgs = document.getElementById('chatMessages');
    const last = msgs?.lastElementChild;
    if (last) last.remove();
    appendSystemMsg('⚠ Upload failed: ' + err.message, true);
  }
}

// ── STATS ─────────────────────────────────────────
async function loadStats() {
  try {
    const r = await fetch(`${API}/qa/mystats?email=${encodeURIComponent(user.email)}`);
    const d = await r.json();
    document.getElementById('statQ').textContent = d.total ?? 0;
    document.getElementById('statV').textContent = d.verified ?? 0;
    document.getElementById('statD').textContent = d.resource ?? 0;
    loadRecent(d.recent || []);
  } catch {}
  updateBadge();
}

function loadRecent(data) {
  const c = document.getElementById('recentList');
  if (!c) return;
  const recent = (data || []).slice(0, 5);
  if (!recent.length) {
    c.innerHTML = '<div class="empty" style="padding:28px"><div class="empty-icon">◎</div><h3>No questions yet</h3></div>';
    return;
  }
  const tagMap = { verified:'tag-verified', resource:'tag-resource', ai:'tag-ai' };
  const dotMap = { verified:'green', resource:'blue', ai:'amber' };
  c.innerHTML = recent.map(a => `
    <div class="activity-item">
      <div class="act-dot ${dotMap[a.source]||'amber'}"></div>
      <div class="act-text">
        <strong>${a.question.length > 58 ? a.question.slice(0,58)+'…' : a.question}</strong>
        <span class="tag ${tagMap[a.source]||'tag-ai'}" style="margin-top:3px">${a.source}</span>
      </div>
      <span class="act-time">${timeAgo(new Date(a.createdAt))}</span>
    </div>`).join('');
}

// ── MY REQUESTS ───────────────────────────────────
async function loadRequests() {
  const c = document.getElementById('reqList');
  c.innerHTML = '<div class="loading-row"><div class="spin"></div> Fetching statuses...</div>';

  const updated = await Promise.all(myRequests.map(async req => {
    try {
      const r = await fetch(`${API}/verify/status/${req.id}`);
      if (r.ok) { const d = await r.json(); return { ...req, ...d }; }
    } catch {}
    return req;
  }));
  myRequests = updated;
  localStorage.setItem(requestsKey, JSON.stringify(myRequests));
  updateBadge();

  if (!myRequests.length) {
    c.innerHTML = '<div class="empty"><div class="empty-icon">◎</div><h3>No requests yet</h3><p>Ask a question in Chat and request teacher verification to see it here</p></div>';
    return;
  }

  const stMap = {
    pending:  { tag: 'tag-pending',  label: 'Pending' },
    verified: { tag: 'tag-verified', label: 'Verified' },
    rejected: { tag: 'tag-rejected', label: 'Rejected' }
  };

  c.innerHTML = myRequests.map(r => {
    const s = stMap[r.status] || stMap.pending;
    const note = r.teacherComment ? `
      <div class="${r.status==='rejected'?'rejection-note':'teacher-note'}" style="margin-top:10px">
        <strong>${r.status==='rejected'?'Teacher Feedback':'Teacher Note'}</strong>${escHtml(r.teacherComment)}
      </div>` : '';
    const doubt = r.comment ? `<div class="req-doubt">"${escHtml(r.comment)}"</div>` : '';
    return `
      <div class="req-card">
        <div class="req-card-top">
          <div class="req-q">${escHtml(r.question)}</div>
          <span class="tag ${s.tag}">${s.label}</span>
        </div>
        <div class="req-card-body">
          <div class="req-a">${escHtml(r.answer)}</div>
          ${doubt}${note}
        </div>
      </div>`;
  }).join('');
}

// ── DOCUMENTS ─────────────────────────────────────
async function loadDocs() {
  const c = document.getElementById('docList');
  try {
const r = await fetch(`${API}/upload/documents?email=${encodeURIComponent(user.email)}`);
    const d = await r.json();
    if (!d.length) {
      c.innerHTML = '<div class="empty" style="padding:40px"><div class="empty-icon">📄</div><h3>No documents yet</h3><p>Upload a PDF via the Chat page</p></div>';
      return;
    }
    c.innerHTML = d.map(doc => `
      <div class="doc-item">
        <div class="doc-ico">📄</div>
        <div>
          <div class="doc-name">${escHtml(doc.originalName)}</div>
          <div class="doc-meta">${timeAgo(new Date(doc.createdAt))} · ${doc.totalChunks} chunks</div>
        </div>
        <span class="tag tag-resource" style="margin-left:auto">Indexed</span>
      </div>`).join('');
  } catch {
    c.innerHTML = '<div style="padding:16px 20px;color:var(--text3);font-size:13px">Could not load documents</div>';
  }
}

// ── UTILS ─────────────────────────────────────────
function updateBadge() {
  const p = myRequests.filter(r => r.status === 'pending').length;
  const b = document.getElementById('reqBadge');
  b.textContent = p;
  b.style.display = p ? 'inline' : 'none';
  const sp = document.getElementById('statP');
  if (sp) sp.textContent = p;
}

function scrollToBottom() {
  const msgs = document.getElementById('chatMessages');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

function formatAnswer(text) {
  if (!text) return '';

  let lines = text.split('\n');
  let html = '';
  let inList = false;
  let inOrderedList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) {
      if (inList) { html += '</ul>'; inList = false; }
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      continue;
    }

    const olMatch = line.match(/^(\d+)[\.\)] (.+)/);
    if (olMatch) {
      if (inList) { html += '</ul>'; inList = false; }
      if (!inOrderedList) { html += '<ol>'; inOrderedList = true; }
      html += '<li>' + inlineFormat(olMatch[2]) + '</li>';
      continue;
    }

    const ulMatch = line.match(/^[-*•] (.+)/);
    if (ulMatch) {
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      if (!inList) { html += '<ul>'; inList = true; }
      html += '<li>' + inlineFormat(ulMatch[1]) + '</li>';
      continue;
    }

    if (inList) { html += '</ul>'; inList = false; }
    if (inOrderedList) { html += '</ol>'; inOrderedList = false; }

    if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      html += '<h3>' + line.replace(/\*\*/g,'') + '</h3>';
      continue;
    }

    html += '<p>' + inlineFormat(line) + '</p>';
  }

  if (inList) html += '</ul>';
  if (inOrderedList) html += '</ol>';

  return html;
}

function inlineFormat(text) {
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/`(.+?)`/g, '<code>$1</code>');
  return text;
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function timeAgo(d) {
  const s = Math.floor((Date.now()-d)/1000);
  if(s<60) return 'just now';
  if(s<3600) return Math.floor(s/60)+'m ago';
  if(s<86400) return Math.floor(s/3600)+'h ago';
  return Math.floor(s/86400)+'d ago';
}

function logout() {
  localStorage.removeItem('ls_token');
  localStorage.removeItem('ls_user');
  window.location.href = 'index.html';
}

function toast(msg, type='ok') {
  const el = document.createElement('div');
  el.className = `toast ${type}`; el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── INIT ──────────────────────────────────────────
loadStats();
updateBadge();