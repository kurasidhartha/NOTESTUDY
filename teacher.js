/* ═══════════════════════════════════════
   EduNotes — Teacher Dashboard Logic
   ═══════════════════════════════════════ */

let teacherNotes = [];   // cache for search filtering
let selectedFile = null; // currently picked file

/* ─── AUTH STATE ──────────────────────── */
auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('nav-email').textContent = user.email;
    loadMyNotes(user.email);
  } else {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
  }
});

/* ─── LOGIN ───────────────────────────── */
async function doLogin() {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errEl    = document.getElementById('auth-error');
  const btn      = document.getElementById('btn-login');

  if (!email || !password) { errEl.textContent = 'Please enter your email and password.'; return; }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in…';
  errEl.textContent = '';

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (e) {
    errEl.textContent = friendlyError(e.code);
    btn.disabled = false;
    btn.innerHTML = '<span>Sign in</span><i class="fas fa-arrow-right"></i>';
  }
}

/* ─── REGISTER ────────────────────────── */
async function doRegister() {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errEl    = document.getElementById('auth-error');

  if (!email || !password) { errEl.textContent = 'Fill in email and password to create an account.'; return; }
  if (password.length < 6)  { errEl.textContent = 'Password must be at least 6 characters.'; return; }

  try {
    await auth.createUserWithEmailAndPassword(email, password);
    showToast('Account created — welcome! 🎉', 'ok');
  } catch (e) {
    errEl.textContent = friendlyError(e.code);
  }
}

/* ─── LOGOUT ──────────────────────────── */
async function doLogout() {
  await auth.signOut();
  showToast('Signed out.', 'info');
}

/* ─── ALLOW ENTER KEY ON LOGIN FORM ───── */
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !document.getElementById('login-screen').classList.contains('hidden')) {
    doLogin();
  }
});

/* ─── FILE SELECTION ──────────────────── */
function dzOver(e)  { e.preventDefault(); document.getElementById('drop-zone').classList.add('dz-active'); }
function dzLeave()  { document.getElementById('drop-zone').classList.remove('dz-active'); }
function dzDrop(e)  {
  e.preventDefault();
  dzLeave();
  const file = e.dataTransfer.files[0];
  if (file) { document.getElementById('f-file').files = e.dataTransfer.files; fileChosen(file); }
}

function fileChosen(file) {
  if (!file) return;
  selectedFile = file;
  document.getElementById('drop-zone').style.display  = 'none';
  document.getElementById('file-chip').classList.remove('hidden');
  document.getElementById('chip-icon').className = 'fas ' + fileIcon(file.name);
  document.getElementById('chip-name').textContent = file.name;
  document.getElementById('chip-size').textContent = fmtBytes(file.size);
}

function clearFile() {
  selectedFile = null;
  document.getElementById('f-file').value = '';
  document.getElementById('file-chip').classList.add('hidden');
  document.getElementById('drop-zone').style.display = '';
}

/* ─── UPLOAD ──────────────────────────── */
async function doUpload() {
  const title   = document.getElementById('f-title').value.trim();
  const subject = document.getElementById('f-subject').value;
  const desc    = document.getElementById('f-desc').value.trim();
  const user    = auth.currentUser;

  if (!title)       { showToast('Please enter a title.', 'err'); return; }
  if (!subject)     { showToast('Please choose a subject.', 'err'); return; }
  if (!selectedFile){ showToast('Please choose a file.', 'err'); return; }
  if (selectedFile.size > 50 * 1024 * 1024) { showToast('File exceeds 50 MB limit.', 'err'); return; }

  const btn = document.getElementById('btn-upload');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading…';

  const progressWrap = document.getElementById('upload-progress');
  const progressBar  = document.getElementById('progress-bar');
  const progressPct  = document.getElementById('progress-pct');
  progressWrap.classList.remove('hidden');

  try {
    const safeName   = Date.now() + '_' + selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageRef = storage.ref('notes/' + safeName);
    const uploadTask = storageRef.put(selectedFile);

    await new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        snapshot => {
          const pct = Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100);
          progressBar.style.width = pct + '%';
          progressPct.textContent = pct + '%';
        },
        reject,
        resolve
      );
    });

    const fileURL = await uploadTask.snapshot.ref.getDownloadURL();

    await db.collection('notes').add({
      title,
      subject,
      description: desc,
      fileName:    selectedFile.name,
      fileURL,
      fileType:    selectedFile.type,
      fileSize:    selectedFile.size,
      storagePath: 'notes/' + safeName,
      uploadedBy:  user.email,
      uploadedAt:  firebase.firestore.FieldValue.serverTimestamp(),
      downloads:   0
    });

    showToast('Note uploaded! ✓', 'ok');

    // Reset form
    document.getElementById('f-title').value   = '';
    document.getElementById('f-subject').value = '';
    document.getElementById('f-desc').value    = '';
    clearFile();
    progressWrap.classList.add('hidden');
    progressBar.style.width = '0%';

    loadMyNotes(user.email);

  } catch (e) {
    showToast('Upload failed: ' + e.message, 'err');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-upload"></i> Upload note';
  }
}

/* ─── LOAD NOTES ──────────────────────── */
async function loadMyNotes(email) {
  const listEl = document.getElementById('teacher-list');
  listEl.innerHTML = '<div class="state-loading"><i class="fas fa-spinner fa-spin"></i> Loading…</div>';

  try {
    const snap = await db.collection('notes').orderBy('uploadedAt', 'desc').get();
    teacherNotes = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(n => n.uploadedBy === email);

    renderTeacherNotes(teacherNotes);
  } catch (e) {
    listEl.innerHTML = `<div class="state-error"><i class="fas fa-circle-exclamation"></i><span>${e.message}</span></div>`;
  }
}

function renderTeacherNotes(notes) {
  const listEl = document.getElementById('teacher-list');
  document.getElementById('count-badge').textContent = notes.length;

  if (notes.length === 0) {
    listEl.innerHTML = `
      <div class="state-empty">
        <i class="fas fa-inbox"></i>
        <strong>No notes yet</strong>
        <span>Upload your first note using the form.</span>
      </div>`;
    return;
  }

  listEl.innerHTML = notes.map(n => `
    <div class="note-row" id="row-${n.id}">
      <div class="note-icon-sq"><i class="fas ${fileIcon(n.fileName||'')}"></i></div>
      <div class="note-row-body">
        <div class="note-row-title">${escHtml(n.title)}</div>
        <div class="note-row-meta">
          <span class="tag">${escHtml(n.subject)}</span>
          <span><i class="fas fa-file"></i> ${fmtBytes(n.fileSize)}</span>
          <span><i class="fas fa-arrow-down-to-bracket"></i> ${n.downloads || 0}</span>
          <span><i class="fas fa-clock"></i> ${n.uploadedAt ? fmtDate(n.uploadedAt.toDate()) : '—'}</span>
        </div>
      </div>
      <div class="note-row-actions">
        <a href="${n.fileURL}" target="_blank" class="icon-btn view" title="Preview"><i class="fas fa-eye"></i></a>
        <button class="icon-btn del" title="Delete" onclick="deleteNote('${n.id}','${n.storagePath||''}')">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
}

/* ─── FILTER (search box) ─────────────── */
function filterTeacherNotes() {
  const q = document.getElementById('t-search').value.toLowerCase();
  const filtered = teacherNotes.filter(n =>
    n.title.toLowerCase().includes(q) ||
    n.subject.toLowerCase().includes(q) ||
    (n.description || '').toLowerCase().includes(q)
  );
  renderTeacherNotes(filtered);
}

/* ─── DELETE ──────────────────────────── */
async function deleteNote(id, storagePath) {
  if (!confirm('Delete this note? This cannot be undone.')) return;

  try {
    await db.collection('notes').doc(id).delete();
    if (storagePath) {
      try { await storage.ref(storagePath).delete(); } catch(_) { /* file may already be gone */ }
    }
    showToast('Note deleted.', 'info');
    const user = auth.currentUser;
    if (user) loadMyNotes(user.email);
  } catch (e) {
    showToast('Could not delete: ' + e.message, 'err');
  }
}

/* ─── HELPERS ─────────────────────────── */
function fileIcon(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return { pdf:'fa-file-pdf', doc:'fa-file-word', docx:'fa-file-word',
    ppt:'fa-file-powerpoint', pptx:'fa-file-powerpoint',
    xls:'fa-file-excel', xlsx:'fa-file-excel', txt:'fa-file-lines' }[ext] || 'fa-file';
}

function fmtBytes(b) {
  if (!b) return '—';
  if (b < 1024) return b + ' B';
  if (b < 1024**2) return (b/1024).toFixed(1) + ' KB';
  return (b/1024**2).toFixed(1) + ' MB';
}

function fmtDate(d) {
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function friendlyError(code) {
  return {
    'auth/user-not-found':     'No account found with this email.',
    'auth/wrong-password':     'Incorrect password.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/invalid-email':      'Please enter a valid email address.',
    'auth/too-many-requests':  'Too many attempts — try again later.',
    'auth/email-already-in-use':'An account with this email already exists.',
    'auth/weak-password':      'Password must be at least 6 characters.',
  }[code] || 'Something went wrong. Please try again.';
}

function showToast(msg, type='info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type;
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.add('hidden'), 3200);
}
