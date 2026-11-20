'use strict';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const colors = {
  MERAH:['#ed4c56','#fff0f1','#a52a35'], BIRU:['#3986ed','#eaf2ff','#2056a0'],
  HIJAU:['#26b66b','#e8f8ef','#187043'], KUNING:['#efc000','#fff8d6','#806000']
};
const PAGE_SIZE = 50;
let students = [], filtered = [], house = '', token = '', expiry = 0, page = 1;
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
  return /asma|asthma/.test(text) ? '🫁' : /alahan|alerg|allerg/.test(text) ? '⚠️' : /jantung/.test(text) ? '🫀' : /mata|rabun/.test(text) ? '👁️' : '🩺';
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
  $('results').innerHTML = `<table class="student-table${token ? ' has-ic' : ''}"><caption>Senarai murid SK Sungai Tiram mengikut tapisan yang dipilih</caption><colgroup>${columns.map(col => `<col class="col-${col}">`).join('')}</colgroup><thead><tr>${headers.map(header => '<th scope="col">' + header + '</th>').join('')}</tr></thead><tbody>${body || `<tr><td colspan="${headers.length}"><div class="empty">Tiada murid menepati tapisan ini.</div></td></tr>`}</tbody></table>`;
  $('pageInfo').textContent = filtered.length ? `${start + 1}–${Math.min(start + PAGE_SIZE,filtered.length)} · Halaman ${page}/${totalPages}` : '0 murid';
  $('prevPage').disabled = page <= 1; $('nextPage').disabled = page >= totalPages;
}
$('houses').innerHTML = [['','Semua','#f1f3f8'], ...Object.keys(colors).map(h => [h,h,colors[h][0]])].map(([value,label,color]) => `<button data-house="${value}" title="${label}" aria-label="Rumah ${label}" aria-pressed="false" style="background:${color}">${value ? '' : 'All'}</button>`).join('');
$('houses').onclick = event => { const button = event.target.closest('button'); if (button) { house = button.dataset.house; render(); } };
['q','class','gender','health'].forEach(id => $(id).addEventListener(id === 'q' ? 'input' : 'change', () => render()));
$('year').onchange = () => { updateClasses(); render(); };
$('reset').onclick = () => { ['q','year','class','gender','health'].forEach(id => $(id).value = ''); house = ''; updateClasses(); render(); };
$('generate').onclick = () => {
  render();
  if (students.length) setStatus('Senarai dijana: ' + filtered.length.toLocaleString('ms-MY') + ' murid. Cetak / PDF akan memasukkan semua hasil tapisan.');
  $('listPanel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
};
$('refresh').onclick = load;
$('prevPage').onclick = () => { page--; render(false); };
$('nextPage').onclick = () => { page++; render(false); };
function preparePrint() {
  if (printing) return;
  const oldPage = page; render(false); page = oldPage; printing = true;
  const labels = filterLabels();
  $('printinfo').textContent = ['Tarikh: ' + new Date().toLocaleString('ms-MY'), ...(labels.length ? labels : ['Semua murid']), 'Jumlah: ' + filtered.length + ' murid', 'Sorotan merah jambu: ada sejarah perubatan'].join(' · ');
  renderTable(true);
}
function finishPrint() { if (printing) { printing = false; render(false); } }
$('print').onclick = () => {
  if (!students.length) { setStatus('Muatkan data murid sebelum mencetak.', true); return; }
  preparePrint();
  try { window.print(); } catch (error) { finishPrint(); setStatus('Cetakan tidak dapat dibuka. Cuba menu cetak pelayar.', true); }
};
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
