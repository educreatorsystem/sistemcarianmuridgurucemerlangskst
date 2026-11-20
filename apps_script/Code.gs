/**
 * SISTEM CARIAN MAKLUMAT MURID • SK SUNGAI TIRAM
 * Backend untuk Google Apps Script Web App (HtmlService).
 * Kunci admin DISIMPAN dalam Script Properties, BUKAN dalam fail ini.
 * Kod boleh diletakkan dalam repositori GitHub tanpa menerbitkan kata laluan.
 */
const CONFIG = Object.freeze({
  SPREADSHEET_ID: '1xMsTSwR7p6IMZiehyn4vL962kKh4PcchtPmzzpnMAV8',
  CLASS_SHEET: 'KELAS DAN NAMA MURID',
  SPORT_SHEET: 'NAMA MURID, RUMAH SUKAN DAN NO K/P',
  SCHOOL: 'SEKOLAH KEBANGSAAN SUNGAI TIRAM',
  SESSION_SECONDS: 21600, // Enam jam (had CacheService).
  SEARCH_LIMIT: 40,
  MIN_NAME_QUERY: 3,
  MIN_IC_QUERY: 5
});

function doGet() {
  return HtmlService.createHtmlOutputFromFile('App')
    .setTitle('SK Sungai Tiram | Sistem Carian Murid')
    // Diperlukan supaya laman GitHub Pages boleh memaparkan web app dalam iframe.
    // HADKAN Google Apps Script deployment kepada akaun guru; iframe bukan kawalan akses.
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Data bootstrap awam: hanya metadata kategori, tanpa nama murid / KP / perubatan. */
function getBootstrap() {
  const data = loadRecords_();
  return {
    school: CONFIG.SCHOOL,
    classes: uniqueSorted_(data.students.map(r => r.className)),
    houses: uniqueSorted_(data.students.map(r => r.house)),
    genders: uniqueSorted_(data.students.map(r => r.gender)),
    years: uniqueSorted_(data.students.map(r => r.year)),
    searchMinimum: CONFIG.MIN_NAME_QUERY,
    serverTime: new Date().toISOString()
  };
}

/** Sekolah mesti menghadkan akses Web App kepada guru melalui tetapan Deployment. */
function selection_(request, allowNoFilters) {
  const req = request && typeof request === 'object' ? request : {};
  const isAdmin = Boolean(validateSession_(typeof req.token==='string' ? req.token : ''));
  const raw = String(req.query || '').trim().slice(0,100);
  const nameQuery = normalizeName_(raw);
  const digitQuery = raw.replace(/\D/g,'');
  const maybeIC = isAdmin && /^[\d\s-]+$/.test(raw) && digitQuery.length >= CONFIG.MIN_IC_QUERY;
  const selectedYear = String(req.year || '').trim();
  const selectedClass = String(req.className || '').trim();
  const selectedHouse = String(req.house || '').trim();
  const selectedGender = String(req.gender || '').trim();
  const selectedHealth = ['ada','tiada'].includes(req.health) ? req.health : '';
  const filteredAtLeastOnce = Boolean(selectedYear||selectedClass||selectedHouse||selectedGender||selectedHealth);
  const invalid = !allowNoFilters &&
    (raw.length===0 ? !filteredAtLeastOnce : (nameQuery.length < CONFIG.MIN_NAME_QUERY && !maybeIC));
  if (invalid) return {students:[],isAdmin};

  const matches = loadRecords_().students.filter(s => {
    if (selectedYear && s.year !== selectedYear) return false;
    if (selectedClass && s.className !== selectedClass) return false;
    if (selectedHouse && s.house !== selectedHouse) return false;
    if (selectedGender && s.gender !== selectedGender) return false;
    if (selectedHealth === 'ada' && !hasMedicalRecord_(s.medical)) return false;
    if (selectedHealth === 'tiada' && hasMedicalRecord_(s.medical)) return false;
    return !raw || normalizeName_(s.name).includes(nameQuery) ||
      (maybeIC && (s.identity||'').replace(/\D/g,'').includes(digitQuery));
  });
  return {students:matches,isAdmin};
}

/** Paparan carian ringkas terhad kepada 40 baris pertama. */
function searchStudents(request) {
  const hit=selection_(request,false);
  return {
    results:hit.students.slice(0,CONFIG.SEARCH_LIMIT).map(s=>sanitizeStudent_(s,hit.isAdmin)),
    total:hit.students.length,
    truncated:hit.students.length>CONFIG.SEARCH_LIMIT,
    isAdmin:hit.isAdmin,
    minChars:CONFIG.MIN_NAME_QUERY
  };
}

/** Cetak SEMUA baris sepadan, bukan hanya 40 baris paparan. Nombor KP hanya untuk admin. */
function getPrintData(request) {
  const hit=selection_(request,true);
  const maxRows=2500;
  if (hit.students.length>maxRows) throw new Error('Hasil cetakan terlalu besar. Sila kecilkan pilihan tapisan.');
  return {
    results:hit.students.map(s=>sanitizeStudent_(s,hit.isAdmin)),
    total:hit.students.length,
    isAdmin:hit.isAdmin,
    generatedAt:new Date().toISOString()
  };
}

/** Panel admin. Hanya ringkasan agregat & isu padanan; tidak memaparkan data kesihatan secara pukal. */
function getAdminSummary(token) {
  requireAdmin_(token);
  const students = loadRecords_().students;
  const tally = {total: students.length, matched: 0, unmatched: 0, duplicate: 0};
  students.forEach(s => {
    if (s.matchStatus === 'matched') tally.matched++;
    else if (s.matchStatus === 'ambiguous') tally.duplicate++;
    else tally.unmatched++;
  });
  return {
    ...tally,
    classes: aggregate_(students, 'className'),
    houses: aggregate_(students, 'house'),
    guidance: 'Rekod tidak dipadankan secara automatik jika nama berulang dalam mana-mana tab.'
  };
}

/** Log masuk admin. Kata laluan hanya disemak di pelayan, bukan dalam HTML atau GitHub. */
function loginAdmin(username, password) {
  const props = PropertiesService.getScriptProperties();
  const expectedUser = props.getProperty('ADMIN_USERNAME') || 'admin';
  const expectedPass = props.getProperty('ADMIN_PASSWORD');
  if (!expectedPass) throw new Error('Kata laluan admin belum diset dalam Script Properties.');

  const cache = CacheService.getScriptCache();
  const lockKey = 'admin_login_failed';
  const failureCount = Number(cache.get(lockKey) || 0);
  if (failureCount >= 10) throw new Error('Terlalu banyak cubaan. Cuba semula selepas 15 minit.');
  const userOK = String(username || '').trim() === expectedUser;
  const passOK = secureEquals_(String(password || ''), expectedPass);
  if (!userOK || !passOK) {
    cache.put(lockKey, String(failureCount + 1), 900);
    throw new Error('Nama pengguna atau kata laluan tidak tepat.');
  }
  cache.remove(lockKey);
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  cache.put(sessionKey_(token), JSON.stringify({role:'admin',issued:Date.now()}), CONFIG.SESSION_SECONDS);
  return {token, username: expectedUser, expiresIn: CONFIG.SESSION_SECONDS};
}

/** Pulihkan sesi admin dalam tab yang sama selepas halaman diperbaharui. */
function resumeAdmin(token) {
  return {isAdmin: Boolean(validateSession_(token))};
}

function logoutAdmin(token) {
  if (token && typeof token === 'string') CacheService.getScriptCache().remove(sessionKey_(token));
  return {ok: true};
}



function loadRecords_() {
  const book = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const s1 = book.getSheetByName(CONFIG.CLASS_SHEET);
  const s2 = book.getSheetByName(CONFIG.SPORT_SHEET);
  if (!s1 || !s2) throw new Error('Nama tab Google Sheet tidak ditemui. Semak nama dua tab.');
  const gridA = s1.getDataRange().getDisplayValues();
  const gridB = s2.getDataRange().getDisplayValues();
  if (!gridA.length || !gridB.length) throw new Error('Salah satu tab Google Sheet masih kosong.');

  const a = headerIndexes_(gridA[0], {
    className: ['KELAS', 'NAMA KELAS'],
    name: ['NAMA MURID', 'NAMA PELAJAR', 'NAMA'],
    gender: ['JANTINA'],
    medical: ['SEJARAH PERUBATAN', 'REKOD KESIHATAN']
  });
  const b = headerIndexes_(gridB[0], {
    name: ['NAMA MURID', 'NAMA PELAJAR', 'NAMA'],
    house: ['RUMAH SUKAN', 'RUMAH'],
    identity: ['NO K/P', 'NO KP', 'NO. K/P', 'NO. KP', 'NO KAD PENGENALAN', 'NO. KAD PENGENALAN']
  });

  // Asingkan nama yang berulang: tidak pernah memilih rekod secara rawak.
  const countA = {};
  const countB = {};
  const mapB = {};
  gridA.slice(1).forEach(row => {const k = normalizeName_(read_(row, a.name)); if (k) countA[k] = (countA[k]||0)+1;});
  gridB.slice(1).forEach(row => {
    const key = normalizeName_(read_(row,b.name));
    if (!key) return;
    countB[key] = (countB[key]||0)+1;
    if (!mapB[key]) mapB[key] = [];
    mapB[key].push({house:read_(row,b.house), identity:read_(row,b.identity)});
  });

  const students = [];
  gridA.slice(1).forEach((row, index) => {
    const name = read_(row,a.name);
    const key = normalizeName_(name);
    if (!key) return;
    const duplicate = (countA[key]||0)>1 || (countB[key]||0)>1;
    const match = !duplicate && countB[key]===1 ? mapB[key][0] : null;
    const matchStatus = duplicate ? 'ambiguous' : match ? 'matched' : 'unmatched';
    students.push({
      id: 'M' + (index+2),
      name, className:read_(row,a.className), year:classYear_(read_(row,a.className)), gender:read_(row,a.gender),
      medical:read_(row,a.medical),
      house:match ? match.house : '', identity:match ? match.identity : '',
      matchStatus
    });
  });
  students.sort((x,y) => x.name.localeCompare(y.name, 'ms'));
  return {students};
}

/** Status perubatan dibaca hanya di server; status bukan diagnosis. */
function hasMedicalRecord_(value) {
  const text = String(value || '').normalize('NFKC').trim();
  if (!text) return false;
  return !/^(TIADA|TIADA PENYAKIT|TIADA REKOD|TIADA MASALAH KESIHATAN|NONE|NO|NIL|N\/A|NA|NEGATIF|TIDAK ADA|TIDAK BERKAITAN|[-—–.])$/i.test(text);
}

function classYear_(className) {
  const match = String(className||'').trim().match(/^(?:TAHUN\s*)?([1-6])(?:\b|\s)/i);
  return match ? match[1] : '';
}

function sanitizeStudent_(s, admin) {
  // KEPUTUSAN SEKOLAH: Maklumat perubatan dipaparkan kepada semua pengguna
  // Web App, TETAPI Google deployment mesti dihadkan kepada akaun guru.
  const base = {id:s.id,name:s.name,year:s.year,className:s.className,
    gender:s.gender,house:s.house,matchStatus:s.matchStatus,
    hasMedicalRecord:hasMedicalRecord_(s.medical),medical:s.medical};
  if (admin) base.identity=s.identity;
  return base;
}

function headerIndexes_(headers, fields) {
  const headerList = headers.map(h=>normalizeHeading_(h));
  const indexes = {};
  Object.keys(fields).forEach(key => {
    indexes[key] = headerList.findIndex(h => fields[key].some(allowed => h===normalizeHeading_(allowed)));
    if (indexes[key] < 0) throw new Error('Kolum "'+fields[key][0]+'" tidak ditemui dalam Google Sheet.');
  });
  return indexes;
}

function normalizeHeading_(value) {
  return String(value || '').normalize('NFKC').trim().toUpperCase().replace(/\s+/g,' ').replace(/\./g,'');
}

function normalizeName_(value) {
  // Normalisasi ruang, tanda baca dan bentuk unicode. Tidak memotong BIN/BINTI.
  return String(value || '').normalize('NFKC').toUpperCase()
    .replace(/[\u200B-\u200D\uFEFF]/g,'')
    .replace(/[’‘`]/g,"'")
    .replace(/[.\-_/(),']/g,' ')
    .replace(/\s+/g,' ').trim();
}

function read_(row, i) {return i<0 ? '' : String(row[i] == null ? '' : row[i]).trim();}
function uniqueSorted_(items) {return [...new Set(items.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ms'));}
function aggregate_(rows,field) {
  const counts = {};
  rows.forEach(r => {const k = r[field] || 'Tidak dinyatakan';counts[k] = (counts[k]||0)+1;});
  return Object.keys(counts).sort((a,b)=>a.localeCompare(b,'ms')).map(name=>({name,count:counts[name]}));
}
function sessionKey_(token) {return 'session_' + digest_(token);}
function digest_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8)
    .map(x => ('0'+(x & 255).toString(16)).slice(-2)).join('');
}
function secureEquals_(a,b) {
  // Bandingan panjang tetap selepas hash; mengelakkan kebocoran panjang kata laluan.
  const x=digest_(a), y=digest_(b); let mismatch=0;
  for (let i=0;i<x.length;i++) mismatch |= x.charCodeAt(i)^y.charCodeAt(i);
  return mismatch===0;
}
function validateSession_(token) {
  if (typeof token!=='string' || !/^[a-f0-9]{64}$/.test(token)) return false;
  const value=CacheService.getScriptCache().get(sessionKey_(token));
  if (!value) return false;
  try { return JSON.parse(value).role==='admin'; } catch(e) {return false;}
}
function requireAdmin_(token) {
  if (!validateSession_(token)) throw new Error('Sesi admin tamat. Sila log masuk semula.');
}

