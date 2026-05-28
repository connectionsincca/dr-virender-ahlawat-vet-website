'use strict';

// ══════════════════════════════════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════════════════════════════════
const REPO   = 'connectionsincca/dr-virender-ahlawat-vet-website';
const BRANCH = 'main';
const API    = `https://api.github.com/repos/${REPO}/contents`;

// ══════════════════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════════════════
let token    = null;   // GitHub PAT — lives in memory only
let fileSHAs = {};     // path → current SHA (needed for GitHub API updates)
let data = { testimonials: [], videos: [], gallery: [], blogs: [] };
let pendingDeleteCb = null;
let dirty = { testimonials: 0, gallery: 0, videos: 0, blogs: 0 };

// ══════════════════════════════════════════════════════════════════════
//  CRYPTO  (Web Crypto API — no external libraries)
// ══════════════════════════════════════════════════════════════════════
async function deriveKey(password, salt) {
  const keyMat = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
    keyMat, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

async function encryptText(plain, password) {
  const salt      = crypto.getRandomValues(new Uint8Array(16));
  const iv        = crypto.getRandomValues(new Uint8Array(12));
  const key       = await deriveKey(password, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain)
  );
  return JSON.stringify({ salt: [...salt], iv: [...iv], data: [...new Uint8Array(encrypted)] });
}

async function decryptText(json, password) {
  const { salt, iv, data: enc } = JSON.parse(json);
  const key       = await deriveKey(password, new Uint8Array(salt));
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) }, key, new Uint8Array(enc)
  );
  return new TextDecoder().decode(decrypted);
}

async function hashText(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// ══════════════════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════════════════
function isFirstTime() {
  return !localStorage.getItem('admin_hash');
}

async function setupAdmin(password, pat) {
  const hash       = await hashText(password);
  const encryptedPAT = await encryptText(pat, password);
  localStorage.setItem('admin_hash',    hash);
  localStorage.setItem('admin_enc_pat', encryptedPAT);
}

async function loginAdmin(password) {
  const storedHash = localStorage.getItem('admin_hash');
  const encPAT     = localStorage.getItem('admin_enc_pat');
  if (!storedHash || !encPAT) throw new Error('No admin configured.');

  const enteredHash = await hashText(password);
  if (enteredHash !== storedHash) throw new Error('Incorrect password.');

  token = await decryptText(encPAT, password);
}

function logoutAdmin() {
  token = null;
  show('login-screen');
  hide('admin-screen');
  el('login-pwd').value = '';
}

function resetAdmin() {
  if (!confirm('This will clear all saved credentials. You will need to enter your GitHub token again. Continue?')) return;
  localStorage.removeItem('admin_hash');
  localStorage.removeItem('admin_enc_pat');
  token = null;
  showAuthScreen();
}

// ══════════════════════════════════════════════════════════════════════
//  GITHUB API
// ══════════════════════════════════════════════════════════════════════
async function ghRequest(method, path, body) {
  const opts = {
    method,
    headers: {
      'Authorization': `token ${token}`,
      'Accept':        'application/vnd.github.v3+json',
      'Content-Type':  'application/json'
    }
  };
  if (body) opts.body = JSON.stringify(body);

  const url = method === 'GET' ? `${API}/${path}?ref=${BRANCH}` : `${API}/${path}`;
  const res = await fetch(url, opts);
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`GitHub ${method} /${path} → ${res.status}: ${msg}`);
  }
  return res.json();
}

// Encode a UTF-8 string to base64 (handles non-ASCII characters)
function b64Encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin);
}

// Decode a base64 string back to UTF-8
function b64Decode(b64) {
  const bin   = atob(b64.replace(/\n/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function readJSON(path) {
  const resp = await ghRequest('GET', path);
  fileSHAs[path] = resp.sha;
  return JSON.parse(b64Decode(resp.content));
}

async function writeJSON(path, content, message) {
  const resp = await ghRequest('PUT', path, {
    message,
    content: b64Encode(JSON.stringify(content, null, 2)),
    sha:     fileSHAs[path],
    branch:  BRANCH
  });
  fileSHAs[path] = resp.content.sha;
}

async function readHTML(path) {
  const resp = await ghRequest('GET', path);
  fileSHAs[path] = resp.sha;
  return b64Decode(resp.content);
}

async function writeHTML(path, html, message) {
  const resp = await ghRequest('PUT', path, {
    message,
    content: b64Encode(html),
    sha:     fileSHAs[path],
    branch:  BRANCH
  });
  fileSHAs[path] = resp.content.sha;
}

async function uploadImage(filename, file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const b64 = e.target.result.split(',')[1]; // strip data:...;base64,
        const path = `static_resources/images/${filename}`;

        // Check if file already exists (to get its SHA)
        let existingSHA;
        try {
          const existing = await ghRequest('GET', path);
          existingSHA = existing.sha;
        } catch (_) { /* new file */ }

        const resp = await ghRequest('PUT', path, {
          message: `Upload ${filename} via admin`,
          content: b64,
          sha:     existingSHA,
          branch:  BRANCH
        });
        resolve(`static_resources/images/${filename}`);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ══════════════════════════════════════════════════════════════════════
//  DRAFT / PUBLISH
// ══════════════════════════════════════════════════════════════════════
function markDirty(section) {
  dirty[section]++;
  updatePublishButton();
  updateNavDots();
}

function updatePublishButton() {
  const count = Object.values(dirty).reduce((a, b) => a + b, 0);
  const btn   = el('publish-btn');
  const badge = el('publish-count');
  if (count > 0) {
    badge.textContent = count;
    btn.hidden = false;
  } else {
    btn.hidden = true;
  }
}

function updateNavDots() {
  ['testimonials', 'videos', 'gallery', 'blogs'].forEach(section => {
    el('dot-' + section).hidden = dirty[section] === 0;
  });
}

async function publishAll() {
  const count = Object.values(dirty).reduce((a, b) => a + b, 0);
  if (count === 0) return;

  setLoading(true, 'Publishing changes to website…');
  try {
    if (dirty.testimonials) await writeJSON('data/testimonials.json', { testimonials: data.testimonials }, 'Update testimonials via admin');
    if (dirty.gallery)      await writeJSON('data/gallery.json',      { gallery: data.gallery },           'Update gallery via admin');
    if (dirty.videos)       await writeJSON('data/videos.json',       { videos: data.videos },             'Update videos via admin');
    if (dirty.blogs)        await writeJSON('data/blogs.json',        { blogs: data.blogs },               'Update blogs via admin');

    if (dirty.testimonials || dirty.gallery || dirty.videos) {
      let html = await readHTML('index.html');
      if (dirty.testimonials) {
        html = replaceMarker(html, 'TESTIMONIALS', genTestimonialsHTML(data.testimonials));
        html = replaceMarker(html, 'INDICATORS',   genIndicatorsHTML(data.testimonials.length));
      }
      if (dirty.gallery) html = replaceMarker(html, 'GALLERY', genGalleryHTML(data.gallery));
      if (dirty.videos)  html = replaceMarker(html, 'VIDEOS',  genVideosHTML(data.videos));
      await writeHTML('index.html', html, 'Publish content updates via admin');
    }

    if (dirty.blogs) {
      let html = await readHTML('blogs.html');
      html = replaceMarker(html, 'BLOGS_LIST', genBlogsListHTML(data.blogs));
      html = replaceMarker(html, 'BLOGS_MENU', genBlogsMenuHTML(data.blogs));
      await writeHTML('blogs.html', html, 'Publish blog updates via admin');
    }

    Object.keys(dirty).forEach(k => dirty[k] = 0);
    updatePublishButton();
    updateNavDots();
    setSaveStatus('saved');
  } catch (err) {
    setSaveStatus('error');
    alert('Publish failed: ' + err.message);
  } finally {
    setLoading(false);
  }
}

// ══════════════════════════════════════════════════════════════════════
//  HTML GENERATORS  (must match exactly the markup the site expects)
// ══════════════════════════════════════════════════════════════════════
// Prefix repo-relative paths with ../ so they resolve correctly from admin/
function adminSrc(path) {
  if (!path) return '';
  return path.startsWith('static_resources/') ? '../' + path : path;
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function genTestimonialsHTML(items) {
  return items.map((t, i) => `						<div class="carousel-item${i === 0 ? ' active' : ''}">
							<div class="testimonial-card">
								<div class="testimonial-content">
									<p class="testimonial-text">"${esc(t.text)}"</p>
									<div class="author-info">
										<span class="author-name">${esc(t.author)}</span>
										<span class="separator">-</span>
										<span class="author-title">${esc(t.role)}</span>
									</div>
								</div>
								<div class="author-image">
									<img src="${esc(t.photo || 'static_resources/images/placeholder-profile.jpg')}" alt="Client Name">
								</div>
							</div>
						</div>`).join('\n');
}

function genIndicatorsHTML(count) {
  return Array.from({ length: count }, (_, i) =>
    `						<span class="indicator${i === 0 ? ' active' : ''}"></span>`
  ).join('\n');
}

function genVideosHTML(items) {
  return items.map(v => `					<div class="video-item" data-video-id="${esc(v.videoId)}">
						<div class="video-thumbnail">
							<img src="https://img.youtube.com/vi/${esc(v.videoId)}/0.jpg" alt="Video thumbnail">
							<div class="play-button"></div>
						</div>
						<h3 class="video-title">${esc(v.title)}</h3>
					</div>`).join('\n\n');
}

function genGalleryHTML(items) {
  return items.map(g => `			<div class="gallery-item">
				<img src="${esc(g.src)}" alt="${esc(g.alt)}">
				<div class="gallery-overlay">
					<p>${esc(g.caption)}</p>
				</div>
			</div>`).join('\n');
}

function titleWithHighlight(title, highlightWord) {
  if (!highlightWord) return esc(title);
  const idx = title.lastIndexOf(highlightWord);
  if (idx === -1) return esc(title);
  return esc(title.slice(0, idx)) +
    `<span class="highlight-letter">${esc(highlightWord)}</span>` +
    esc(title.slice(idx + highlightWord.length));
}

function genBlogItemHTML(b) {
  return `        <div class="blog-item" id="${esc(b.id)}">
          <div class="blog-text">
            <h3>${titleWithHighlight(b.title, b.highlightWord)}</h3>
            <div class="blog-preview">
              <p>${esc(b.previewText)}</p>
              <span class="fade-out">${esc(b.previewFade || '')}</span><br><br>
              <a href="#" class="read-more">Read More</a>
            </div>
            <div class="blog-full" style="display: none;">
              ${b.content}
              <a href="#" class="collapse">Collapse</a>
            </div>
          </div>
          <div class="blog-image">
            <img src="${esc(b.image || '')}" alt="${esc(b.imageAlt || '')}" loading="lazy">
          </div>
        </div>`;
}

function genBlogsListHTML(items) {
  return items.map(genBlogItemHTML).join('\n');
}

function genBlogsMenuHTML(items) {
  return items.map(b =>
    `          <li><a href="#${esc(b.id)}">${esc(b.title)}</a></li>`
  ).join('\n');
}

// Replace content between HTML marker comments
function replaceMarker(html, marker, newContent) {
  const start = `<!-- ${marker}_START -->`;
  const end   = `<!-- ${marker}_END -->`;
  const si = html.indexOf(start);
  const ei = html.indexOf(end);
  if (si === -1 || ei === -1) throw new Error(`Marker "${marker}" not found in HTML.`);
  return html.slice(0, si + start.length) + '\n' + newContent + '\n' + html.slice(ei);
}

// ══════════════════════════════════════════════════════════════════════
//  LOAD & SAVE
// ══════════════════════════════════════════════════════════════════════
async function loadAll() {
  setLoading(true, 'Loading content from GitHub…');
  try {
    const [t, v, g, b] = await Promise.all([
      readJSON('data/testimonials.json'),
      readJSON('data/videos.json'),
      readJSON('data/gallery.json'),
      readJSON('data/blogs.json')
    ]);
    data.testimonials = t.testimonials;
    data.videos       = v.videos;
    data.gallery      = g.gallery;
    data.blogs        = b.blogs;
  } finally {
    setLoading(false);
  }
}

async function saveTestimonials() {
  setSaveStatus('saving');
  try {
    await writeJSON('data/testimonials.json',
      { testimonials: data.testimonials },
      'Update testimonials via admin');

    let html = await readHTML('index.html');
    html = replaceMarker(html, 'TESTIMONIALS', genTestimonialsHTML(data.testimonials));
    html = replaceMarker(html, 'INDICATORS',   genIndicatorsHTML(data.testimonials.length));
    await writeHTML('index.html', html, 'Update testimonials in index.html via admin');
    setSaveStatus('saved');
  } catch (err) {
    setSaveStatus('error');
    alert('Save failed: ' + err.message);
  }
}

async function saveVideos() {
  setSaveStatus('saving');
  try {
    await writeJSON('data/videos.json', { videos: data.videos }, 'Update videos via admin');
    let html = await readHTML('index.html');
    html = replaceMarker(html, 'VIDEOS', genVideosHTML(data.videos));
    await writeHTML('index.html', html, 'Update videos in index.html via admin');
    setSaveStatus('saved');
  } catch (err) {
    setSaveStatus('error');
    alert('Save failed: ' + err.message);
  }
}

async function saveGallery() {
  setSaveStatus('saving');
  try {
    await writeJSON('data/gallery.json', { gallery: data.gallery }, 'Update gallery via admin');
    let html = await readHTML('index.html');
    html = replaceMarker(html, 'GALLERY', genGalleryHTML(data.gallery));
    await writeHTML('index.html', html, 'Update gallery in index.html via admin');
    setSaveStatus('saved');
  } catch (err) {
    setSaveStatus('error');
    alert('Save failed: ' + err.message);
  }
}

async function saveBlogs() {
  setSaveStatus('saving');
  try {
    await writeJSON('data/blogs.json', { blogs: data.blogs }, 'Update blogs via admin');
    let html = await readHTML('blogs.html');
    html = replaceMarker(html, 'BLOGS_LIST', genBlogsListHTML(data.blogs));
    html = replaceMarker(html, 'BLOGS_MENU', genBlogsMenuHTML(data.blogs));
    await writeHTML('blogs.html', html, 'Update blogs in blogs.html via admin');
    setSaveStatus('saved');
  } catch (err) {
    setSaveStatus('error');
    alert('Save failed: ' + err.message);
  }
}

// ══════════════════════════════════════════════════════════════════════
//  UI HELPERS
// ══════════════════════════════════════════════════════════════════════
const el  = id => document.getElementById(id);
const show = id => el(id).hidden = false;
const hide = id => el(id).hidden = true;

function setSaveStatus(state) {
  const s = el('save-status');
  s.className = state;
  if (state === 'saving') s.textContent = '⏳ Saving…';
  if (state === 'saved')  { s.textContent = '✓ Published'; setTimeout(() => { s.textContent = ''; s.className = ''; }, 3500); }
  if (state === 'error')  s.textContent = '✗ Error';
}

function setLoading(on, msg) {
  const overlay = el('loading-overlay');
  overlay.hidden = !on;
  if (msg) el('loading-msg').textContent = msg;
}

function showSection(name) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  el(`section-${name}`).classList.add('active');
  document.querySelector(`[data-section="${name}"]`).classList.add('active');
}

function confirmDelete(message, onConfirm) {
  el('confirm-msg').textContent = message;
  show('confirm-overlay');
  pendingDeleteCb = onConfirm;
}

// Generic photo input wiring (file picker + URL field + preview)
function wirePhotoInput(fileInputId, urlInputId, previewId) {
  const fileInput = el(fileInputId);
  const urlInput  = el(urlInputId);
  const preview   = el(previewId);

  fileInput.addEventListener('change', () => {
    const f = fileInput.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = e => { preview.src = e.target.result; preview.hidden = false; };
    reader.readAsDataURL(f);
    urlInput.value = '';
  });
  urlInput.addEventListener('input', () => {
    if (urlInput.value) { preview.src = urlInput.value; preview.hidden = false; }
    fileInput.value = '';
  });
}

// ══════════════════════════════════════════════════════════════════════
//  DRAG-AND-DROP REORDER
// ══════════════════════════════════════════════════════════════════════
function initDragSort(containerId, itemSelector, dataArray, sectionName, renderFn) {
  const container = el(containerId);
  if (!container) return;
  let dragSrc = null;

  container.querySelectorAll(itemSelector).forEach(item => {
    item.draggable = true;

    item.addEventListener('dragstart', e => {
      dragSrc = item;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => item.classList.add('dragging'), 0);
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      container.querySelectorAll(itemSelector).forEach(i => i.classList.remove('drag-over'));
    });

    item.addEventListener('dragover', e => {
      e.preventDefault();
      if (item !== dragSrc) {
        container.querySelectorAll(itemSelector).forEach(i => i.classList.remove('drag-over'));
        item.classList.add('drag-over');
      }
    });

    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));

    item.addEventListener('drop', e => {
      e.preventDefault();
      item.classList.remove('drag-over');
      if (!dragSrc || dragSrc === item) return;
      const srcIdx = dataArray.findIndex(x => x.id === dragSrc.dataset.id);
      const dstIdx = dataArray.findIndex(x => x.id === item.dataset.id);
      if (srcIdx === -1 || dstIdx === -1) return;
      const [moved] = dataArray.splice(srcIdx, 1);
      dataArray.splice(dstIdx, 0, moved);
      markDirty(sectionName);
      renderFn();
    });
  });
}

// ══════════════════════════════════════════════════════════════════════
//  TESTIMONIALS UI
// ══════════════════════════════════════════════════════════════════════
function renderTestimonials() {
  const list = el('testimonials-list');
  if (!data.testimonials.length) {
    list.innerHTML = '<div class="empty-state"><i class="fas fa-quote-left"></i><p>No testimonials yet.</p></div>';
    return;
  }
  list.innerHTML = data.testimonials.map((t, i) => `
    <div class="item-row" data-id="${esc(t.id)}">
      <span class="drag-handle" title="Drag to reorder">⠿</span>
      <img class="item-thumb" src="${adminSrc(t.photo || 'static_resources/images/placeholder-profile.jpg')}" alt="">
      <div class="item-body">
        <div class="item-title">${esc(t.author)} — ${esc(t.role)}</div>
        <div class="item-meta">${esc(t.text.slice(0,90))}…</div>
      </div>
      <div class="item-actions">
        <button class="btn-icon" onclick="editTestimonial('${esc(t.id)}')" title="Edit">
          <i class="fas fa-pencil-alt"></i>
        </button>
        <button class="btn-icon danger" onclick="deleteTestimonial('${esc(t.id)}')" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
  initDragSort('testimonials-list', '.item-row', data.testimonials, 'testimonials', renderTestimonials);
}

function showTestimonialForm(t) {
  const isNew = !t;
  el('testimonial-form-title').textContent = isNew ? 'New Testimonial' : 'Edit Testimonial';
  el('t-id').value           = t?.id    || '';
  el('t-text').value         = t?.text  || '';
  el('t-author').value       = t?.author || '';
  el('t-role').value         = t?.role  || '';
  el('t-photo-url').value    = t?.photo || '';
  el('t-photo-file').value   = '';
  const prev = el('t-photo-preview');
  if (t?.photo) { prev.src = adminSrc(t.photo); prev.hidden = false; }
  else { prev.src = ''; prev.hidden = true; }
  show('testimonial-form');
  el('t-text').focus();
}

function hideTestimonialForm() {
  hide('testimonial-form');
  el('t-text').value = '';
}

async function saveTestimonialForm() {
  const text   = el('t-text').value.trim();
  const author = el('t-author').value.trim();
  const role   = el('t-role').value.trim();
  if (!text || !author || !role) { alert('Please fill in Quote Text, Author Name, and Role.'); return; }

  const btn = el('t-save-btn');
  btn.disabled = true;
  btn.textContent = 'Uploading…';

  try {
    let photo = el('t-photo-url').value.trim();
    const file = el('t-photo-file').files[0];
    if (file) {
      const filename = `profile_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      photo = await uploadImage(filename, file);
    }

    const id = el('t-id').value || `t${Date.now()}`;
    const idx = data.testimonials.findIndex(t => t.id === id);
    const entry = { id, text, author, role, photo: photo || 'static_resources/images/placeholder-profile.jpg' };
    if (idx >= 0) data.testimonials[idx] = entry;
    else          data.testimonials.push(entry);

    markDirty('testimonials');
    hideTestimonialForm();
    renderTestimonials();
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Save';
  }
}

function editTestimonial(id) {
  showTestimonialForm(data.testimonials.find(t => t.id === id));
}

function deleteTestimonial(id) {
  confirmDelete('Delete this testimonial? This cannot be undone.', async () => {
    data.testimonials = data.testimonials.filter(t => t.id !== id);
    markDirty('testimonials');
    renderTestimonials();
  });
}

// ══════════════════════════════════════════════════════════════════════
//  VIDEOS UI
// ══════════════════════════════════════════════════════════════════════
function extractVideoId(input) {
  input = input.trim();
  // Full URL patterns
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  // Assume it's already a video ID if 11 alphanumeric chars
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  return null;
}

function renderVideos() {
  const list = el('videos-list');
  if (!data.videos.length) {
    list.innerHTML = '<div class="empty-state"><i class="fas fa-video"></i><p>No videos yet.</p></div>';
    return;
  }
  list.innerHTML = data.videos.map(v => `
    <div class="item-row" data-id="${esc(v.id)}">
      <span class="drag-handle" title="Drag to reorder">⠿</span>
      <img class="item-thumb" src="https://img.youtube.com/vi/${esc(v.videoId)}/default.jpg" alt="">
      <div class="item-body">
        <div class="item-title">${esc(v.title)}</div>
        <div class="item-meta">youtube.com/watch?v=${esc(v.videoId)}</div>
      </div>
      <div class="item-actions">
        <button class="btn-icon" onclick="editVideo('${esc(v.id)}')" title="Edit">
          <i class="fas fa-pencil-alt"></i>
        </button>
        <button class="btn-icon danger" onclick="deleteVideo('${esc(v.id)}')" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
  initDragSort('videos-list', '.item-row', data.videos, 'videos', renderVideos);
}

function showVideoForm(v) {
  el('video-form-title').textContent = v ? 'Edit Video' : 'New Video';
  el('v-id').value      = v?.id     || '';
  el('v-videoid').value = v?.videoId || '';
  el('v-title').value   = v?.title  || '';
  const wrap = el('v-preview-wrap');
  if (v?.videoId) {
    el('v-thumb').src = `https://img.youtube.com/vi/${v.videoId}/0.jpg`;
    wrap.hidden = false;
  } else { wrap.hidden = true; }
  show('video-form');
  el('v-videoid').focus();
}

function hideVideoForm() { hide('video-form'); }

async function saveVideoForm() {
  const raw   = el('v-videoid').value;
  const title = el('v-title').value.trim();
  const vid   = extractVideoId(raw);
  if (!vid)   { alert('Could not find a valid YouTube video ID. Paste the full YouTube URL or just the 11-character video ID.'); return; }
  if (!title) { alert('Please enter a video title.'); return; }

  const id  = el('v-id').value || `v${Date.now()}`;
  const idx = data.videos.findIndex(v => v.id === id);
  const entry = { id, videoId: vid, title };
  if (idx >= 0) data.videos[idx] = entry;
  else          data.videos.push(entry);

  markDirty('videos');
  hideVideoForm();
  renderVideos();
}

function editVideo(id) { showVideoForm(data.videos.find(v => v.id === id)); }

function deleteVideo(id) {
  confirmDelete('Delete this video?', async () => {
    data.videos = data.videos.filter(v => v.id !== id);
    markDirty('videos');
    renderVideos();
  });
}

// Show thumbnail preview as user types YouTube URL
function wireVideoIdPreview() {
  el('v-videoid').addEventListener('input', () => {
    const vid  = extractVideoId(el('v-videoid').value);
    const wrap = el('v-preview-wrap');
    if (vid) { el('v-thumb').src = `https://img.youtube.com/vi/${vid}/0.jpg`; wrap.hidden = false; }
    else      { wrap.hidden = true; }
  });
}

// ══════════════════════════════════════════════════════════════════════
//  GALLERY UI
// ══════════════════════════════════════════════════════════════════════
function renderGallery() {
  const grid = el('gallery-grid-admin');
  if (!data.gallery.length) {
    grid.innerHTML = '<div class="empty-state"><i class="fas fa-images"></i><p>No photos yet.</p></div>';
    return;
  }
  grid.innerHTML = data.gallery.map(g => `
    <div class="gallery-admin-item" data-id="${esc(g.id)}">
      <span class="drag-handle">⠿</span>
      <img src="${adminSrc(g.src)}" alt="${esc(g.alt)}" loading="lazy">
      <div class="gallery-item-footer">
        <span class="gallery-item-caption">${esc(g.caption || '')}</span>
        <div>
          <button class="btn-icon" onclick="editGalleryItem('${esc(g.id)}')" title="Edit">
            <i class="fas fa-pencil-alt"></i>
          </button>
          <button class="btn-icon danger" onclick="deleteGalleryItem('${esc(g.id)}')" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
  initDragSort('gallery-grid-admin', '.gallery-admin-item', data.gallery, 'gallery', renderGallery);
}

function showGalleryForm(g) {
  el('gallery-form-title').textContent = g ? 'Edit Photo' : 'New Photo';
  el('g-id').value       = g?.id      || '';
  el('g-caption').value  = g?.caption || '';
  el('g-alt').value      = g?.alt     || '';
  el('g-photo-url').value = g?.src   || '';
  el('g-photo-file').value = '';
  const prev = el('g-photo-preview');
  if (g?.src) { prev.src = adminSrc(g.src); prev.hidden = false; }
  else        { prev.src = ''; prev.hidden = true; }
  show('gallery-form');
}

function hideGalleryForm() { hide('gallery-form'); }

async function saveGalleryForm() {
  const caption = el('g-caption').value.trim();
  const alt     = el('g-alt').value.trim() || 'Gallery Image';
  const file    = el('g-photo-file').files[0];
  const urlVal  = el('g-photo-url').value.trim();
  const existingId = el('g-id').value;

  if (!file && !urlVal && !existingId) { alert('Please select a photo or paste an image URL.'); return; }

  const btn = el('g-save-btn');
  btn.disabled = true;
  btn.textContent = 'Uploading…';

  try {
    let src = urlVal;
    if (file) {
      const filename = `gallery_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      src = await uploadImage(filename, file);
    } else if (!src) {
      const existing = data.gallery.find(g => g.id === existingId);
      src = existing?.src || '';
    }

    const id  = existingId || `g${Date.now()}`;
    const idx = data.gallery.findIndex(g => g.id === id);
    const entry = { id, src, alt, caption };
    if (idx >= 0) data.gallery[idx] = entry;
    else          data.gallery.push(entry);

    markDirty('gallery');
    hideGalleryForm();
    renderGallery();
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Save';
  }
}

function editGalleryItem(id) { showGalleryForm(data.gallery.find(g => g.id === id)); }

function deleteGalleryItem(id) {
  confirmDelete('Delete this photo from the gallery?', async () => {
    data.gallery = data.gallery.filter(g => g.id !== id);
    markDirty('gallery');
    renderGallery();
  });
}

// ══════════════════════════════════════════════════════════════════════
//  BLOGS UI
// ══════════════════════════════════════════════════════════════════════
function renderBlogs() {
  const list = el('blogs-list');
  if (!data.blogs.length) {
    list.innerHTML = '<div class="empty-state"><i class="fas fa-pen-nib"></i><p>No blog posts yet.</p></div>';
    return;
  }
  list.innerHTML = data.blogs.map(b => `
    <div class="item-row" data-id="${esc(b.id)}">
      <span class="drag-handle">⠿</span>
      <img class="item-thumb" src="${adminSrc(b.image || '')}" alt="" onerror="this.style.display='none'">
      <div class="item-body">
        <div class="item-title">${esc(b.title)}</div>
        <div class="item-meta">${esc(b.previewText.slice(0,80))}…</div>
      </div>
      <div class="item-actions">
        <button class="btn-icon" onclick="editBlog('${esc(b.id)}')" title="Edit">
          <i class="fas fa-pencil-alt"></i>
        </button>
        <button class="btn-icon danger" onclick="deleteBlog('${esc(b.id)}')" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
  initDragSort('blogs-list', '.item-row', data.blogs, 'blogs', renderBlogs);
}

function showBlogForm(b) {
  el('blog-form-title').textContent = b ? 'Edit Blog Post' : 'New Blog Post';
  el('b-id').value           = b?.id          || '';
  el('b-title').value        = b?.title       || '';
  el('b-highlight').value    = b?.highlightWord || '';
  el('b-preview').value      = b?.previewText  || '';
  el('b-preview-fade').value = b?.previewFade  || '';
  el('b-image-url').value    = b?.image        || '';
  el('b-image-alt').value    = b?.imageAlt     || '';
  el('b-image-file').value   = '';
  el('b-content').innerHTML  = b?.content || '<p>Write your article here…</p>';

  const prev = el('b-image-preview');
  if (b?.image) { prev.src = adminSrc(b.image); prev.hidden = false; }
  else          { prev.src = ''; prev.hidden = true; }

  show('blog-form');
  el('b-title').focus();
}

function hideBlogForm() {
  hide('blog-form');
  el('b-content').innerHTML = '';
}

async function saveBlogForm() {
  const title       = el('b-title').value.trim();
  const highlight   = el('b-highlight').value.trim();
  const previewText = el('b-preview').value.trim();
  const previewFade = el('b-preview-fade').value.trim();
  const content     = el('b-content').innerHTML.trim();
  const imageAlt    = el('b-image-alt').value.trim();

  if (!title || !previewText || !content) {
    alert('Please fill in Title, Preview Text, and Full Content.');
    return;
  }

  const btn = el('b-save-btn');
  btn.disabled = true;
  btn.textContent = 'Publishing…';

  try {
    let image = el('b-image-url').value.trim();
    const file = el('b-image-file').files[0];
    if (file) {
      const filename = `blog_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      image = await uploadImage(filename, file);
    }

    const existingId = el('b-id').value;
    const id  = existingId || `blog${Date.now()}`;
    const idx = data.blogs.findIndex(b => b.id === id);
    const entry = { id, title, highlightWord: highlight, previewText, previewFade, content, image, imageAlt };
    if (idx >= 0) data.blogs[idx] = entry;
    else          data.blogs.push(entry);

    markDirty('blogs');
    hideBlogForm();
    renderBlogs();
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Publish';
  }
}

function editBlog(id) { showBlogForm(data.blogs.find(b => b.id === id)); }

function deleteBlog(id) {
  confirmDelete('Delete this blog post permanently?', async () => {
    data.blogs = data.blogs.filter(b => b.id !== id);
    markDirty('blogs');
    renderBlogs();
  });
}

// Rich text editor toolbar
function wireEditorToolbar() {
  document.querySelectorAll('.toolbar-btn').forEach(btn => {
    btn.addEventListener('mousedown', e => {
      e.preventDefault(); // don't blur the editor
      const cmd = btn.dataset.cmd;
      const editor = el('b-content');
      editor.focus();
      if (cmd === 'h4') {
        document.execCommand('formatBlock', false, 'h4');
      } else if (cmd === 'p') {
        document.execCommand('formatBlock', false, 'p');
      } else if (cmd === 'ul') {
        document.execCommand('insertUnorderedList');
      } else {
        document.execCommand(cmd);
      }
    });
  });
}

// ══════════════════════════════════════════════════════════════════════
//  AUTH SCREEN LOGIC
// ══════════════════════════════════════════════════════════════════════
function showAuthScreen() {
  show('login-screen');
  hide('admin-screen');
  if (isFirstTime()) {
    show('setup-panel');
    hide('login-panel');
  } else {
    hide('setup-panel');
    show('login-panel');
  }
}

// ══════════════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════════════
async function init() {
  // Auth screen
  showAuthScreen();

  // Setup form
  el('setup-btn').addEventListener('click', async () => {
    const pwd  = el('setup-pwd').value;
    const pwd2 = el('setup-pwd2').value;
    const pat  = el('setup-pat').value.trim();
    const errEl = el('setup-error');

    hide(errEl.id);
    if (!pwd || pwd.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; show(errEl.id); return; }
    if (pwd !== pwd2)           { errEl.textContent = 'Passwords do not match.'; show(errEl.id); return; }
    if (!pat)                   { errEl.textContent = 'Please enter your GitHub Personal Access Token.'; show(errEl.id); return; }

    const btn = el('setup-btn');
    btn.disabled = true; btn.textContent = 'Setting up…';
    try {
      await setupAdmin(pwd, pat);
      token = pat;
      hide('login-screen');
      show('admin-screen');
      await loadAll();
      renderAll();
    } catch (err) {
      errEl.textContent = 'Setup failed: ' + err.message; show(errEl.id);
    } finally {
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Set Up Admin';
    }
  });

  // Login form
  el('login-btn').addEventListener('click', async () => {
    const pwd   = el('login-pwd').value;
    const errEl = el('login-error');
    hide(errEl.id);
    const btn = el('login-btn');
    btn.disabled = true; btn.textContent = 'Logging in…';
    try {
      await loginAdmin(pwd);
      hide('login-screen');
      show('admin-screen');
      await loadAll();
      renderAll();
    } catch (err) {
      errEl.textContent = err.message; show(errEl.id);
    } finally {
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Log In';
    }
  });

  // Allow Enter key to submit login
  el('login-pwd').addEventListener('keydown', e => { if (e.key === 'Enter') el('login-btn').click(); });

  el('publish-btn').addEventListener('click', publishAll);
  el('logout-btn').addEventListener('click', logoutAdmin);

  window.addEventListener('beforeunload', e => {
    if (Object.values(dirty).some(v => v > 0)) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  el('reset-btn').addEventListener('click', resetAdmin);

  // Section navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.section));
  });

  // Confirm dialog
  el('confirm-yes').addEventListener('click', async () => {
    hide('confirm-overlay');
    if (pendingDeleteCb) { await pendingDeleteCb(); pendingDeleteCb = null; }
  });
  el('confirm-no').addEventListener('click', () => {
    hide('confirm-overlay'); pendingDeleteCb = null;
  });

  // Testimonials
  el('add-testimonial-btn').addEventListener('click', () => showTestimonialForm(null));
  el('t-save-btn').addEventListener('click', saveTestimonialForm);
  el('t-cancel-btn').addEventListener('click', hideTestimonialForm);
  wirePhotoInput('t-photo-file', 't-photo-url', 't-photo-preview');

  // Videos
  el('add-video-btn').addEventListener('click', () => showVideoForm(null));
  el('v-save-btn').addEventListener('click', saveVideoForm);
  el('v-cancel-btn').addEventListener('click', hideVideoForm);
  wireVideoIdPreview();

  // Gallery
  el('add-gallery-btn').addEventListener('click', () => showGalleryForm(null));
  el('g-save-btn').addEventListener('click', saveGalleryForm);
  el('g-cancel-btn').addEventListener('click', hideGalleryForm);
  wirePhotoInput('g-photo-file', 'g-photo-url', 'g-photo-preview');

  // Blogs
  el('add-blog-btn').addEventListener('click', () => showBlogForm(null));
  el('b-save-btn').addEventListener('click', saveBlogForm);
  el('b-cancel-btn').addEventListener('click', hideBlogForm);
  wirePhotoInput('b-image-file', 'b-image-url', 'b-image-preview');
  wireEditorToolbar();
}

function renderAll() {
  renderTestimonials();
  renderVideos();
  renderGallery();
  renderBlogs();
  updatePublishButton();
  updateNavDots();
}

document.addEventListener('DOMContentLoaded', init);
