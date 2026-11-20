var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
(function(root) {
  "use strict";
  const config = () => root.SKST_CONFIG || {};
  const norm = (value) => String(value != null ? value : "").normalize("NFKC").replace(/[\u200B-\u200D\u2060\uFEFF]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
  const fail = (message, code = "NETWORK") => Object.assign(new Error(message), { code });
  function apiUrl(action) {
    const url = new URL(config().apiUrl);
    url.searchParams.set("action", action);
    url.searchParams.set("v", "4");
    url.searchParams.set("_", String(Date.now()));
    return url;
  }
  async function textRequest(url, options = {}, timeout = 12e3) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    let timer;
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller == null ? void 0 : controller.abort();
        reject(fail("Sambungan mengambil masa terlalu lama. Sila cuba semula.", "TIMEOUT"));
      }, timeout);
    });
    const task = (async () => {
      const response = await root.fetch(String(url), __spreadValues(__spreadValues({ mode: "cors", credentials: "omit", redirect: "follow", cache: "no-store", referrerPolicy: "no-referrer" }, options), controller ? { signal: controller.signal } : {}));
      if (!response.ok) throw fail("Sumber data tidak dapat dicapai (HTTP " + response.status + ").", "HTTP");
      return response.text();
    })();
    try {
      return await Promise.race([task, deadline]);
    } catch (error) {
      if (error.code) throw error;
      throw fail(error.name === "AbortError" ? "Sambungan tamat masa. Sila cuba semula." : "Pelayar belum dapat menyambung kepada sumber data.", error.name === "AbortError" ? "TIMEOUT" : "NETWORK");
    } finally {
      clearTimeout(timer);
    }
  }
  function unwrap(text) {
    let response;
    try {
      response = JSON.parse(text);
    } catch (e) {
      throw fail("Apps Script belum memberikan data API versi baharu. Kemas kini Code.gs dan deploy New version.", "API_VERSION");
    }
    if (response.apiVersion !== 4) throw fail("Apps Script perlu dikemas kini kepada versi 4 dan dideploy semula.", "API_VERSION");
    if (!response.ok) throw fail(response.error || "Permintaan tidak berjaya.", response.code || "SERVER");
    return response.data;
  }
  async function post(action, payload) {
    return unwrap(await textRequest(config().apiUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, payload }) }, 2e4));
  }
  function parseCsv(text) {
    if (/^\s*</.test(text)) throw fail("Tab nama murid tidak dapat dibaca. Semak penerbitan CSV.", "CSV_FORMAT");
    const rows = [];
    let row = [], field = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (quoted && text[i + 1] === '"') {
          field += '"';
          i++;
        } else if (quoted || !field) {
          quoted = !quoted;
        } else field += c;
      } else if (c === "," && !quoted) {
        row.push(field);
        field = "";
      } else if ((c === "\n" || c === "\r") && !quoted) {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else field += c;
    }
    if (quoted) throw fail("Format CSV tidak lengkap. Cuba muat semula.", "CSV_FORMAT");
    if (field || row.length) {
      row.push(field);
      rows.push(row);
    }
    const headers = (rows.shift() || []).map(norm);
    const required = ["NAMA MURID", "KELAS", "JANTINA", "SEJARAH PERUBATAN"];
    const index = required.map((h) => headers.indexOf(h));
    if (index.some((i) => i < 0)) throw fail("Kolum tab nama/perubatan tidak sepadan.", "CSV_HEADERS");
    return rows.filter((r) => String(r[index[0]] || "").trim()).map((r) => {
      const [name, className, gender, medical] = index.map((i) => String(r[i] || "").trim());
      return { name, className: norm(className), year: (className.match(/[1-6]/) || [""])[0], gender: norm(gender), medical, sick: !!medical && !/^(TIADA|TIADA PENYAKIT|SIHAT|TIADA SEJARAH PERUBATAN|TIDAK ADA|TAK ADA|NONE|NIL|N\/A|NA|-|0)$/i.test(norm(medical)), house: "", match: "unavailable" };
    });
  }
  function housesJsonp() {
    return new Promise((resolve, reject) => {
      const callback = "skst_cb_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2);
      const script = document.createElement("script");
      let ended = false;
      const cleanup = () => {
        script.remove();
        clearTimeout(timer);
        delete root[callback];
      };
      const finish = (error, value) => {
        if (ended) return;
        ended = true;
        cleanup();
        error ? reject(error) : resolve(value);
      };
      const timer = setTimeout(() => finish(fail("Rumah sukan belum dapat dimuat. Semak deployment Apps Script.", "HOUSES_TIMEOUT")), 12e3);
      root[callback] = (value) => {
        try {
          const data = unwrap(JSON.stringify(value));
          if (!Array.isArray(data.houses)) throw fail("Format rumah sukan tidak sah.", "SHAPE");
          finish(null, data.houses);
        } catch (error) {
          finish(error);
        }
      };
      script.onerror = () => finish(fail("Sambungan rumah sukan belum tersedia. Kemas kini Apps Script dan akses Anyone.", "HOUSES_NETWORK"));
      const url = apiUrl("houses");
      url.searchParams.set("callback", callback);
      script.src = url.href;
      script.referrerPolicy = "no-referrer";
      document.head.append(script);
    });
  }
  function joinHouses(students, houses) {
    const map = /* @__PURE__ */ new Map(), frequency = /* @__PURE__ */ new Map();
    for (const row of houses) {
      const key = norm(row.name);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    for (const student of students) {
      const key = norm(student.name);
      frequency.set(key, (frequency.get(key) || 0) + 1);
    }
    return students.map((student) => {
      const key = norm(student.name), matches = map.get(key) || [], ambiguous = matches.length > 1 || frequency.get(key) > 1;
      return __spreadProps(__spreadValues({}, student), { house: !ambiguous && matches.length === 1 ? norm(matches[0].house) : "", match: ambiguous ? "ambiguous" : matches.length === 1 ? "matched" : "missing" });
    });
  }
  function validate(data) {
    if (!data || !Array.isArray(data.students)) throw fail("Format data murid tidak sah. Semak Apps Script.", "SHAPE");
    return __spreadProps(__spreadValues({}, data), { students: data.students.map((s) => {
      var _a, _b, _c, _d, _e, _f, _g;
      return __spreadProps(__spreadValues({}, s), { name: String((_a = s.name) != null ? _a : "").trim(), className: String((_b = s.className) != null ? _b : ""), year: String((_c = s.year) != null ? _c : ""), gender: String((_d = s.gender) != null ? _d : ""), house: String((_e = s.house) != null ? _e : ""), medical: String((_f = s.medical) != null ? _f : ""), sick: Boolean(s.sick), match: String((_g = s.match) != null ? _g : "missing") });
    }).filter((s) => s.name) });
  }
  async function publicList() {
    var _a;
    let primaryError;
    try {
      return __spreadProps(__spreadValues({}, validate(unwrap(await textRequest(apiUrl("public"))))), { source: "direct", partial: false });
    } catch (error) {
      primaryError = error;
    }
    if (!config().profileCsvUrl) throw primaryError;
    const [profileResult, houseResult] = await Promise.allSettled([textRequest(config().profileCsvUrl).then(parseCsv), housesJsonp()]);
    if (profileResult.status !== "fulfilled") throw fail("Data murid belum dapat dimuat. Semak internet, URL Apps Script dan penerbitan tab nama/perubatan. Tekan Cuba semula.", "ALL_SOURCES_FAILED");
    const full = houseResult.status === "fulfilled";
    return { students: full ? joinHouses(profileResult.value, houseResult.value) : profileResult.value, admin: false, partial: !full, source: full ? "csv-and-houses" : "profile-only", warning: full ? "" : ((_a = houseResult.reason) == null ? void 0 : _a.message) || (primaryError == null ? void 0 : primaryError.message) || "Rumah sukan belum dimuat." };
  }
  async function request(action, payload = {}) {
    if (action === "list" && !payload.token) return publicList();
    try {
      return await post(action, payload);
    } catch (error) {
      if (["NETWORK", "HTTP", "TIMEOUT", "API_VERSION"].includes(error.code) || error instanceof TypeError) {
        if (typeof root.SKST_PRIVATE_BRIDGE === "function") return root.SKST_PRIVATE_BRIDGE(action, payload);
      }
      throw error;
    }
  }
  root.SKST_DATA = { request, parseCsv, joinHouses, validate, normalize: norm };
})(window);
