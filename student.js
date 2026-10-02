/* ═══════════════════════════════════════
   EduNotes — Student Portal Logic
   ═══════════════════════════════════════ */

let allNotes     = [];
let activeSubject = 'all';

/* Stripe colours per subject */
const SUBJECT_COLORS = {
  'Mathematics':     '#3B82F6',
  'Physics':         '#8B5CF6',
  'Chemistry':       '#06B6D4',
  'Biology':         '#10B981',
  'Computer Science':'#F59E0B',
  'English':         '#EC4899',
  'History':         '#EF4444',
  'Geography':       '#6366F1',
  'Economics':       '#14B8A6',
  'Other':           '#9CA3AF',
};

function subjectColor(s) { return SUBJECT_COLORS[s] || '#6366F1'; }

/* ─── BOOT ────────────────────────────── */
document.addEventListener('DOMContentLoaded', loadAllNotes);

async function loadAllNotes() {
  const grid = document.getElementById('student-grid');

  try {
    const snap = await db.collection('notes').orderBy('uploadedAt', 'desc').get();
    allNotes   = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const subjects = [...new Set(allNotes.map(n => n.subject))];

    // Stats
    document.getElementById('stat-notes').textContent    = allNotes.length;
    document.getElementById('stat-subjects').textContent = subjects.length;

    // Build subject pills
    buildPills(subjects);

    renderNotes(allNotes);

  } catch (e) {
    grid.innerHTML = `
      <div class="state-error full-span">
        <i class="fas fa-circle-exclamation"></i>
        <span>Could not load notes: ${e.message}</span>
      </div>`;
  }
}

/* ─── PILLS ───────────────────────────── */
function buildPills(subjects) {
  const container = document.getElementById('subject-pills');
  // Keep the "All notes" pill, add the rest
  subjects.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'pill';
    btn.dataset.subj = s;
    btn.textContent = s;
    btn.onclick = () => pillClick(btn);
    container.appendChild(btn);
  });
}

function pillClick(btn) {
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  activeSubject = btn.dataset.subj;
  applyFilters();
}

/* ─── FILTERS ─────────────────────────── */
function applyFilters() {
  const q = document.getElementById('s-search').value.toLowerCase();
  let filtered = allNotes;

  if (activeSubject !== 'all') {
    filtered = filtered.filter(n => n.subject === activeSubject);
  }
  if (q) {
    filtered = filtered.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.subject.toLowerCase().includes(q) ||
      (n.description || '').toLowerCase().includes(q)
    );
  }

  renderNotes(filtered);
}

/* ─── RENDER ──────────────────────────── */
function renderNotes(notes) {
  const grid = document.getElementById('student-grid');

  if (notes.length === 0) {
    grid.innerHTML = `
      <div class="state-empty full-span">
        <i class="fas fa-magnifying-glass"></i>
        <strong>No notes found</strong>
        <span>Try a different search term or subject.</span>
      </div>`;
    return;
  }

  grid.innerHTML = notes.map(n => {
    const color = subjectColor(n.subject);
    const icon  = fileIcon(n.fileName || '');
    const desc  = n.description ? escHtml(n.description) : '<em class="no-desc">No description provided</em>';
    const date  = n.uploadedAt ? fmtDate(n.uploadedAt.toDate()) : '';
    const uploader = n.uploadedBy ? n.uploadedBy.split('@')[0] : 'Teacher';

    return `
      <article class="note-card">
        <div class="note-card-stripe" style="background:${color}"></div>
        <div class="note-card-body">
          <div class="note-card-subj">
            <i class="fas ${icon}"></i> ${escHtml(n.subject)}
          </div>
          <h3>${escHtml(n.title)}</h3>
          <p class="note-card-desc">${desc}</p>
          <div class="note-card-footer-meta">
            <span><i class="fas fa-user-tie"></i> ${escHtml(uploader)}</span>
            <span><i class="fas fa-file"></i> ${fmtBytes(n.fileSize)}</span>
            ${date ? `<span><i class="fas fa-calendar-days"></i> ${date}</span>` : ''}
          </div>
        </div>
        <div class="note-card-actions">
          <a href="${n.fileURL}" target="_blank" class="nca-btn view"
             onclick="trackDownload('${n.id}')">
            <i class="fas fa-eye"></i> View
          </a>
          <a href="${n.fileURL}" download="${escHtml(n.fileName || 'note')}" class="nca-btn dl"
             onclick="trackDownload('${n.id}')">
            <i class="fas fa-arrow-down-to-bracket"></i> Download
          </a>
        </div>
      </article>`;
  }).join('');
}

/* ─── DOWNLOAD TRACKING ───────────────── */
async function trackDownload(id) {
  try {
    await db.collection('notes').doc(id).update({
      downloads: firebase.firestore.FieldValue.increment(1)
    });
  } catch(_) { /* non-critical */ }
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
