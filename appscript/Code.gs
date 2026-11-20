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
    // Keselamatan maklumat terjamin melalui fungsi pelayan & sesi admin.
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Data bootstrap awam: hanya metadata kategori, tanpa nama murid / KP / perubatan. */
function getBootstrap() {
  const data = loadRecords_();
  return {
    school: CONFIG.SCHOOL,
    classes: uniqueSorted_(data.students.map(r => r.className)),
    houses: uniqueSorted_(data.students.map(r => r.house)),
    searchMinimum: CONFIG.MIN_NAME_QUERY,
    serverTime: new Date().toISOString()
  };
}

/**
 * Sila masukkan nama minimum 3 aksara. Hanya data bukan sensitif dikembalikan
 * untuk carian awam. Carian KP & maklumat perubatan memerlukan sesi admin sah.
 */
function searchStudents(request) {
  const req = request && typeof request === 'object' ? request : {};
  const token = typeof req.token === 'string' ? req.token : '';
  const isAdmin = Boolean(validateSession_(token));
  const rawQuery = String(req.query || '').trim().slice(0, 100);
  const query = normalizeName_(rawQuery);
  const digitQuery = rawQuery.replace(/\D/g, '');
  const selectedClass = String(req.className || '').trim();
  const selectedHouse = String(req.house || '').trim();
  const maybeIC = isAdmin && digitQuery.length >= CONFIG.MIN_IC_QUERY;
  if (query.length < CONFIG.MIN_NAME_QUERY && !maybeIC) {
    return {results: [], total: 0, truncated: false, isAdmin, minChars: CONFIG.MIN_NAME_QUERY};
  }

  const all = loadRecords_().students;
  const filtered = all.filter(s => {
    if (selectedClass && s.className !== selectedClass) return false;
    if (selectedHouse && s.house !== selectedHouse) return false;
    return normalizeName_(s.name).includes(query) || (maybeIC && (s.identity || '').replace(/\D/g, '').includes(digitQuery));
  });
  const selected = filtered.slice(0, CONFIG.SEARCH_LIMIT).map(s => sanitizeStudent_(s, isAdmin));
  return {
    results: selected,
    total: filtered.length,
    truncated: filtered.length > CONFIG.SEARCH_LIMIT,
    isAdmin,
    minChars: CONFIG.MIN_NAME_QUERY
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
      name, className:read_(row,a.className), gender:read_(row,a.gender),
      medical:read_(row,a.medical),
      house:match ? match.house : '', identity:match ? match.identity : '',
      matchStatus
    });
  });
  students.sort((x,y) => x.name.localeCompare(y.name, 'ms'));
  return {students};
}

function sanitizeStudent_(s, admin) {
  const base = {id:s.id,name:s.name,className:s.className,gender:s.gender,
    house:s.house,matchStatus:s.matchStatus};
  if (admin) {
    base.identity = s.identity;
    base.medical = s.medical;
  }
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
