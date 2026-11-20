'use strict';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const colors = {
  MERAH:['#ed4c56','#fff0f1','#a52a35'], BIRU:['#3986ed','#eaf2ff','#2056a0'],
  HIJAU:['#26b66b','#e8f8ef','#187043'], KUNING:['#efc000','#fff8d6','#806000']
};
const PAGE_SIZE = 50;
let students = [], filtered = [], house = '', token = '', expiry = 0, page = 1, viewMode = 'cards';
const reportJobs = new Map();
let pdfUrl = '';
let bridge, endpoint, ready = false, installEvent, printing = false, loadVersion = 0;
const channel = String(Date.now()) + Math.random().toString(36).slice(2);
const requests = new Map();

function api(action, payload = {}) {
  return new Promise((resolve, reject) => {
    if (!ready) return reject(Error('Sambungan belum tersedia. Semak deployment Apps Script dan muat semula halaman.'));
    const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
    const timer = setTimeout(() => { requests.delete(id); reject(Error('Sambungan tamat masa. Sila cuba lagi.')); }, 45000);
    requests.set(id, {resolve, reject, timer});
    endpoint.postMessage({type:'SKST_REQUEST', channel, id, action, payload}, '*');
  });
}
window.addEventListener('message', event => {
  if (!bridge || !/^https:\/\/([a-z0-9-]+\.)*(googleusercontent\.com|google\.com)$/.test(event.origin)) return;
  const message = event.data;
  if (message?.channel !== channel) return;
  if (message.type === 'SKST_READY' && !ready) { endpoint = event.source; ready = true; load(); }
  if (event.source !== endpoint) return;
  if (message.type === 'SKST_RESPONSE' && requests.has(message.id)) {
    const request = requests.get(message.id);
    clearTimeout(request.timer); requests.delete(message.id);
    message.ok ? request.resolve(message.data) : request.reject(Error(message.error || 'Permintaan gagal.'));
  }
});
function connect() {
  bridge = document.createElement('iframe'); bridge.hidden = true; bridge.title = 'Sambungan data sekolah';
  bridge.src = window.SKST_CONFIG.apiUrl + '?origin=' + encodeURIComponent(location.origin) + '&channel=' + encodeURIComponent(channel);
  document.body.append(bridge);
  setTimeout(() => { if (!ready) setStatus('Sambungan belum berjaya. Pastikan Apps Script dan Bridge.html telah dideploy dengan akses Anyone. Rujuk PANDUAN.', true); }, 25000);
}
function setStatus(text, error = false) { $('status').textContent = text; $('status').classList.toggle('error', error); }
function opts(id, values, label) {
  const old = $(id).value;
  $(id).innerHTML = '<option value="">' + label + '</option>' + [...new Set(values.filter(Boolean))].sort((a,b) => a.localeCompare(b,'ms',{numeric:true})).map(value => `<option>${esc(value)}</option>`).join('');
  if (values.includes(old)) $(id).value = old;
}
function updateClasses() { opts('class', students.filter(s => !$('year').value || s.year === $('year').value).map(s => s.className), 'Semua kelas'); }
function updateStats() {
  $('stats').innerHTML = [
    ['Jumlah murid',students.length,'♙','violet'], ['Kelas',new Set(students.map(s => s.className).filter(Boolean)).size,'▦','blue'],
    ['Ada sejarah perubatan',students.filter(s => s.sick).length,'♡','rose'], ['Perlu semakan padanan',students.filter(s => s.match !== 'matched').length,'⚑','amber']
  ].map(([label,count,icon,color]) => `<div class="stat stat-${color}"><span class="stat-icon" aria-hidden="true">${icon}</span><div><strong>${count.toLocaleString('ms-MY')}</strong><span class="stat-label">${label}</span></div></div>`).join('');
}
async function load() {
  const version = ++loadVersion, requestedToken = token;
  try {
    setStatus('Memuatkan rekod terkini…');
    const data = await api('list', {token:requestedToken});
    if (version !== loadVersion || requestedToken !== token) return;
    students = data.students;
    if (!token || !data.admin) students.forEach(s => delete s.ic);
    if (token && !data.admin) clearAdmin();
    opts('year', students.map(s => s.year), 'Semua tahun'); updateClasses(); updateStats();
    setStatus('Dikemas kini ' + new Date().toLocaleString('ms-MY') + ' · ' + (token ? 'Sesi admin aktif' : 'Paparan guru'));
    render();
  } catch (error) { if (version === loadVersion) setStatus(error.message, true); }
}
function medIcon(student) {
  const text = student.medical.toLowerCase();
  return /asma|asthma/.test(text) ? '🫁' : /alahan|alerg|allerg/.test(text) ? '⚠️' : /jantung|ventricular|septal|heart/.test(text) ? '🫀' : /mata|rabun/.test(text) ? '👁️' : '🩺';
}
function filterLabels() {
  const labels = [];
  if ($('q').value.trim()) labels.push('Carian: ' + $('q').value.trim());
  if ($('year').value) labels.push('Tahun ' + $('year').value);
  if ($('class').value) labels.push('Kelas ' + $('class').value);
  if ($('gender').value) labels.push($('gender').value === 'LELAKI' ? 'Lelaki' : 'Perempuan');
  if (house) labels.push('Rumah ' + house.toLowerCase());
  if ($('health').value) labels.push($('health').selectedOptions[0].textContent);
  return labels;
}
function clearAdmin() {
  token = ''; expiry = 0; students.forEach(student => delete student.ic);
  syncExportAccess();
  revokeReports();
  $('admin').textContent = '🔐 Admin'; $('q').placeholder = 'Cari nama atau rumah sukan…';
  $('modeBadge').textContent = '● PAPARAN GURU'; $('modeBadge').classList.remove('admin');
}
function render(resetPage = true) {
  printing = false;
  if (token && Date.now() > expiry) clearAdmin();
  if (resetPage) page = 1;
  const query = $('q').value.trim().toUpperCase();
  filtered = students.filter(s =>
    (!query || [s.name,s.house,token ? s.ic : ''].join(' ').toUpperCase().includes(query)) &&
    (!$('year').value || s.year === $('year').value) && (!$('class').value || s.className === $('class').value) &&
    (!$('gender').value || s.gender === $('gender').value) && (!house || s.house === house) &&
    (!$('health').value || ($('health').value === 'sick' ? s.sick : $('health').value === 'healthy' ? !s.sick : s.match !== 'matched'))
  ).sort((a,b) => a.className.localeCompare(b.className,'ms',{numeric:true}) || a.name.localeCompare(b.name,'ms'));
  $('count').textContent = filtered.length.toLocaleString('ms-MY') + ' daripada ' + students.length.toLocaleString('ms-MY') + ' murid · Disusun mengikut kelas dan nama';
  const labels = filterLabels();
  $('activeFilters').innerHTML = (labels.length ? labels : ['Semua murid']).map(label => '<span>' + esc(label) + '</span>').join('');
  document.querySelectorAll('#houses button').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.house === house)));
  syncExportAccess();
  renderTable();
}
function renderTable(allRows = false) {
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  page = Math.max(1, Math.min(page, totalPages));
  const start = allRows ? 0 : (page - 1) * PAGE_SIZE;
  const rows = allRows ? filtered : filtered.slice(start, start + PAGE_SIZE);
  const headers = ['Bil.','Nama murid','Kelas','Jantina','Rumah sukan','Sejarah perubatan', ...(token ? ['No. K/P'] : [])];
  const columns = ['num','name','class','gender','house','medical', ...(token ? ['ic'] : [])];
  const body = rows.map((student,index) => {
    const color = colors[student.house] || ['#aab6c8','#eff2f7','#53647d'];
    const warning = student.match === 'matched' ? '' : `<span class="match-warning">⚑ ${student.match === 'ambiguous' ? 'Nama berulang — semak padanan' : 'Tiada padanan rumah sukan'}</span>`;
    return `<tr><td class="number">${start + index + 1}</td><td><span class="student-name">${esc(student.name)}</span>${warning}</td><td><span class="class-pill">${esc(student.className || 'Belum direkodkan')}</span></td><td><span class="gender-text">${esc(student.gender || '—')}</span></td><td><span class="house-badge" style="--house:${color[0]};--tint:${color[1]};--ink:${color[2]}"><i class="house-dot" aria-hidden="true"></i>${esc(student.house || 'Belum dipadankan')}</span></td><td class="medical-cell${student.sick ? ' medical-attention' : ''}">${student.sick ? `<span class="medical-label"><span aria-hidden="true">${medIcon(student)}</span>Ada sejarah perubatan</span><span class="medical-detail">${esc(student.medical)}</span>` : 'Tiada sejarah direkodkan'}</td>${token ? `<td class="ic-cell">${esc(student.ic || 'Tidak tersedia')}</td>` : ''}</tr>`;
  }).join('');
  $('results').classList.toggle('cards-view', viewMode === 'cards' && !allRows);
  $('results').innerHTML = viewMode === 'cards' && !allRows ? (rows.map(cardMarkup).join('') || '<div class="empty">Tiada murid menepati tapisan ini.</div>') : `<table class="student-table${token ? ' has-ic' : ''}"><caption>Senarai murid SK Sungai Tiram mengikut tapisan yang dipilih</caption><colgroup>${columns.map(col => `<col class="col-${col}">`).join('')}</colgroup><thead><tr>${headers.map(header => '<th scope="col">' + header + '</th>').join('')}</tr></thead><tbody>${body || `<tr><td colspan="${headers.length}"><div class="empty">Tiada murid menepati tapisan ini.</div></td></tr>`}</tbody></table>`;
  $('pageInfo').textContent = filtered.length ? `${start + 1}–${Math.min(start + PAGE_SIZE,filtered.length)} · Halaman ${page}/${totalPages}` : '0 murid';
  $('prevPage').disabled = page <= 1; $('nextPage').disabled = page >= totalPages;
  $('viewCards').setAttribute('aria-pressed', String(viewMode === 'cards'));
  $('viewTable').setAttribute('aria-pressed', String(viewMode === 'table'));
  document.querySelector('.scroll-hint').textContent = viewMode === 'cards' ? 'Kad disusun mengikut kelas dan nama murid.' : '↔ Tatal jadual untuk melihat semua kolum pada skrin kecil.';
}
function cardMarkup(student) {
  const female = student.gender === 'PEREMPUAN', male = student.gender === 'LELAKI';
  const genderClass = female ? 'female' : male ? 'male' : 'unknown';
  const color = colors[student.house] || ['#8793ab','#eef1f5','#40536e'];
  const userIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="7.5" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2Z"/></svg>';
  return `<article class="student-card ${genderClass}"><div class="card-top"><span class="person-tile">${userIcon}</span><h3>${esc(student.name)}</h3></div><div class="card-meta"><span class="card-class">${esc(student.className || 'Belum direkodkan')}</span><span class="gender-badge">${female ? '♀' : male ? '♂' : '•'} ${esc(student.gender || 'Belum direkodkan')}</span></div><span class="card-house" style="--house-bg:${color[0]};--house-ink:${student.house === 'KUNING' ? '#594400' : '#fff'}">${esc(student.house || 'Belum dipadankan')}</span>${token ? `<div class="card-ic"><span>No. K/P</span><strong>${esc(student.ic || 'Tidak tersedia')}</strong></div>` : ''}<div class="card-medical ${student.sick ? 'attention' : 'healthy'}"><span class="medical-emoji" aria-hidden="true">${student.sick ? medIcon(student) : '✓'}</span><div>${student.sick ? '<strong>SEJARAH PERUBATAN</strong>' : ''}<p>${esc(student.sick ? student.medical : 'Tiada sejarah perubatan direkodkan')}</p></div></div>${student.match !== 'matched' ? `<span class="match-warning">⚑ ${student.match === 'ambiguous' ? 'Nama berulang — semak padanan' : 'Tiada padanan rumah sukan'}</span>` : ''}</article>`;
}
$('viewCards').onclick = () => { viewMode = 'cards'; render(false); };
$('viewTable').onclick = () => { viewMode = 'table'; render(false); };
function isAdmin() { return Boolean(token && Date.now() < expiry); }
function syncExportAccess() {
  const active = isAdmin();
  $('print').hidden = !active;
  document.body.classList.toggle('admin-print', active);
  if (!active && $('exportDialog').open) $('exportDialog').close();
}
function revokeReports() {
  for (const [job, record] of reportJobs) { try { record.win?.postMessage({type:'SKST_REPORT_REVOKE', job}, location.origin); } catch {} }
  reportJobs.clear();
  if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  pdfUrl = ''; $('pdfLink').hidden = true; $('pdfLink').removeAttribute('href');
}
function snapshot() {
  if (!isAdmin()) throw Error('Log masuk admin untuk mencetak atau menjana PDF.');
  render(false);
  if (!isAdmin()) throw Error('Sesi admin tamat. Sila log masuk semula.');
  return {createdAt:Date.now(), expiresAt:expiry, labels:filterLabels(), includeIC:true, students:filtered.map(s => ({name:s.name,className:s.className,gender:s.gender,house:s.house,medical:s.medical,sick:s.sick,match:s.match,ic:s.ic || ''}))};
}
$('print').onclick = () => {
  if (!isAdmin()) { clearAdmin(); render(false); return; }
  if (!filtered.length) { setStatus('Tiada murid untuk dicetak. Semak tapisan yang dipilih.', true); return; }
  $('exportCount').textContent = filtered.length.toLocaleString('ms-MY') + ' murid mengikut tapisan semasa. Semua halaman dimasukkan.';
  $('exportStatus').textContent = ''; $('pdfLink').hidden = true;
  $('sharePdf').hidden = typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function';
  $('exportDialog').showModal();
};
$('closeExport').onclick = () => $('exportDialog').close();
$('openPrint').onclick = () => {
  try {
    const data = snapshot();
    const job = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
    const url = new URL('cetak.html', location.href); url.searchParams.set('job', job);
    const win = window.open(url.href, '_blank');
    if (!win) throw Error('Paparan cetak tidak dapat dibuka. Gunakan Muat turun PDF.');
    reportJobs.set(job, {win, data});
    setTimeout(() => { const pending = reportJobs.get(job); if (pending) pending.data = null; }, 45000);
    $('exportStatus').textContent = 'Paparan cetak dibuka. Tekan Cetak pada halaman tersebut, atau gunakan Muat turun PDF di sini.';
  } catch (error) { $('exportStatus').textContent = error.message; }
};
window.addEventListener('message', event => {
  if (event.origin !== location.origin) return;
  const message = event.data, job = reportJobs.get(message?.job);
  if (!job || event.source !== job.win) return;
  if (!isAdmin()) { revokeReports(); return; }
  if (message.type === 'SKST_REPORT_READY' && job.data) {
    job.win.postMessage({type:'SKST_REPORT_DATA', job:message.job, snapshot:job.data}, location.origin);
  } else if (message.type === 'SKST_REPORT_ACK') { job.data = null; }
});
function pdfDocument() {
  const data = snapshot();
  if (!window.SKST_REPORT) throw Error('Fail PDF belum dimuat. Muat semula aplikasi dan pastikan semua fail github dimuat naik.');
  return {doc:window.SKST_REPORT.makePdf(data), filename:window.SKST_REPORT.filename(data)};
}
$('savePdf').onclick = () => {
  try {
    $('exportStatus').textContent = 'Menjana PDF…';
    const {doc,filename} = pdfDocument(), blob = doc.output('blob');
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    pdfUrl = URL.createObjectURL(blob);
    $('pdfLink').href = pdfUrl; $('pdfLink').hidden = false;
    const link = document.createElement('a'); link.href = pdfUrl; link.download = filename; document.body.append(link); link.click(); link.remove();
    $('exportStatus').textContent = 'PDF telah dijana. Jika muat turun tidak bermula, tekan Buka PDF yang dijana.';
  } catch (error) { $('exportStatus').textContent = error.message; }
};
$('sharePdf').onclick = async () => {
  try {
    const {doc,filename} = pdfDocument(), file = new File([doc.output('blob')],filename,{type:'application/pdf'});
    if (!navigator.canShare({files:[file]})) throw Error('Peranti ini tidak menyokong perkongsian fail PDF. Gunakan Muat turun PDF.');
    await navigator.share({files:[file], title:'Senarai murid SK Sungai Tiram'});
  } catch (error) { if (error.name !== 'AbortError') $('exportStatus').textContent = error.message; }
};
$('houses').innerHTML = [['','Semua','#f1f3f8'], ...Object.keys(colors).map(h => [h,h,colors[h][0]])].map(([value,label,color]) => `<button data-house="${value}" title="${label}" aria-label="Rumah ${label}" aria-pressed="false" style="background:${color}">${value ? '' : 'All'}</button>`).join('');
$('houses').onclick = event => { const button = event.target.closest('button'); if (button) { house = button.dataset.house; render(); } };
['q','class','gender','health'].forEach(id => $(id).addEventListener(id === 'q' ? 'input' : 'change', () => render()));
$('year').onchange = () => { updateClasses(); render(); };
$('reset').onclick = () => { ['q','year','class','gender','health'].forEach(id => $(id).value = ''); house = ''; updateClasses(); render(); };
$('generate').onclick = () => {
  render();
  if (students.length) setStatus('Senarai dijana: ' + filtered.length.toLocaleString('ms-MY') + ' murid.');
  $('listPanel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
};
$('refresh').onclick = load;
$('prevPage').onclick = () => { page--; render(false); };
$('nextPage').onclick = () => { page++; render(false); };
function preparePrint() {
  if (!isAdmin()) { document.body.classList.remove('admin-print'); return; }
  if (printing) return;
  const oldPage = page; render(false); page = oldPage; printing = true;
  $('printinfo').textContent = ['Tarikh: ' + new Date().toLocaleString('ms-MY'), ...filterLabels(), 'Jumlah: ' + filtered.length + ' murid'].join(' · ');
  renderTable(true);
}
function finishPrint() { if (printing) { printing = false; render(false); } }
window.addEventListener('beforeprint', preparePrint); window.addEventListener('afterprint', finishPrint);
function logout(remote = true) {
  const previous = token; ++loadVersion; clearAdmin(); render(false);
  if (remote && previous) api('logout', {token:previous}).catch(() => {});
  setStatus('Sesi admin tamat. Paparan guru aktif.');
}
$('admin').onclick = () => token ? logout() : $('login').showModal();
$('cancel').onclick = () => $('login').close();
$('loginform').onsubmit = async event => {
  event.preventDefault(); $('submit').disabled = true; $('loginerror').textContent = '';
  try {
    const form = new FormData(event.target);
    const response = await api('login', {username:form.get('username'), password:form.get('password')});
    token = response.token; expiry = Date.now() + response.expiresIn * 1000;
    syncExportAccess();
    $('login').close(); event.target.reset(); $('admin').textContent = '↪ Log keluar';
    $('q').placeholder = 'Cari nama, No. K/P atau rumah sukan…';
    $('modeBadge').textContent = '● MOD ADMIN AKTIF'; $('modeBadge').classList.add('admin');
    await load();
  } catch (error) { $('loginerror').textContent = error.message; }
  finally { $('submit').disabled = false; }
};
setInterval(() => { if (token && Date.now() > expiry) logout(); }, 15000);
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installEvent = event; $('install').hidden = false; });
$('install').onclick = async () => { if (installEvent) { await installEvent.prompt(); installEvent = null; $('install').hidden = true; } };
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
connect();
