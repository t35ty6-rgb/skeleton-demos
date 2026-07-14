// 三崎屋電工AI — Vertex AI Gemini 2.5 Flash 統合 (client-side)
// (1) YouTube URL → Gemini (即時)
// (2) 動画ファイル → GCS 直接 upload (signed URL) → Gemini
// CF host: skeleton-femoon-saas / Vertex AI: skeleton-femoon-saas / GCS: misakiya-uploads-1

const CF_BASE = 'https://us-central1-skeleton-femoon-saas.cloudfunctions.net';
const CF_GEN  = CF_BASE + '/misakiyaGenerateStepsFromVideo';
const CF_URL  = CF_BASE + '/misakiyaGetUploadUrl';

const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

/**
 * YouTube URL or gs:// URI から Gemini 手順生成
 */
async function generateStepsFromVideo(videoUrl, hint = '') {
  if (!videoUrl) throw new Error('videoUrl required');
  const t0 = Date.now();
  const resp = await fetch(CF_GEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoUrl, hint }),
  });
  if (!resp.ok) {
    const errTxt = await resp.text().catch(() => '');
    throw new Error(`CF ${resp.status}: ${errTxt.slice(0, 200)}`);
  }
  const data = await resp.json();
  if (data.error) throw new Error(data.error + (data.detail ? ': ' + data.detail : ''));
  console.log(`[misakiya-gemini] ${data?.steps?.length || 0} steps in ${((Date.now()-t0)/1000).toFixed(1)}s (${data._meta?.model})`);
  return data;
}

/**
 * 動画ファイル → GCS 直接 upload → gs:// URI 取得
 * @param {File} file - <input type=file> の File
 * @param {(pct:number)=>void} onProgress - 0..100 の アップロード進捗
 * @returns {Promise<{gsUri:string, bytesUploaded:number}>}
 */
async function uploadVideoToGcs(file, onProgress = () => {}) {
  if (!file) throw new Error('file required');
  if (!/^video\//.test(file.type)) throw new Error(`動画ファイル (video/*) のみ対応。 受け取り: ${file.type || 'unknown'}`);
  if (file.size > MAX_UPLOAD_BYTES) throw new Error(`ファイル サイズ 上限 ${Math.round(MAX_UPLOAD_BYTES/1024/1024)}MB を超えています (${Math.round(file.size/1024/1024)}MB)`);

  // 1) Get signed upload URL from CF
  const urlResp = await fetch(CF_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
  });
  if (!urlResp.ok) throw new Error(`upload URL取得失敗 (${urlResp.status})`);
  const { uploadUrl, gsUri } = await urlResp.json();
  if (!uploadUrl || !gsUri) throw new Error('CF returned invalid upload URL');

  // 2) PUT to signed URL with progress
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`GCS upload ${xhr.status}: ${xhr.responseText?.slice(0,200)}`));
    };
    xhr.onerror = () => reject(new Error('GCS upload network error'));
    xhr.send(file);
  });

  return { gsUri, bytesUploaded: file.size };
}

/**
 * 一発関数: File → upload → Gemini → steps
 */
async function uploadAndGenerateSteps(file, hint = '', onProgress = () => {}) {
  onProgress({ phase: 'upload', pct: 0 });
  const { gsUri, bytesUploaded } = await uploadVideoToGcs(file, (pct) => onProgress({ phase: 'upload', pct }));
  onProgress({ phase: 'analyze', pct: 0 });
  const result = await generateStepsFromVideo(gsUri, hint);
  onProgress({ phase: 'done', pct: 100 });
  return { ...result, _upload: { gsUri, bytesUploaded } };
}

window.MisakiyaGemini = {
  generateStepsFromVideo,
  uploadVideoToGcs,
  uploadAndGenerateSteps,
  MAX_UPLOAD_BYTES,
};

// ────────────────────────────────────────────────────────────────
// Firestore CRUD via CF proxy (tenant-scoped)
// tenantId は localStorage 'misakiya-tid' + ?t= URL param override
// ────────────────────────────────────────────────────────────────
const CF_SAVE   = CF_BASE + '/misakiyaSaveWork';
const CF_LIST   = CF_BASE + '/misakiyaListWorks';
const CF_DELETE = CF_BASE + '/misakiyaDeleteWork';
const CF_GET    = CF_BASE + '/misakiyaGetWork';

function getTenantId() {
  const url = new URLSearchParams(location.search);
  const override = url.get('t');
  if (override && /^[a-zA-Z0-9_-]{6,64}$/.test(override)) {
    localStorage.setItem('misakiya-tid', override);
    return override;
  }
  let tid = localStorage.getItem('misakiya-tid');
  if (!tid || !/^[a-zA-Z0-9_-]{6,64}$/.test(tid)) {
    tid = 'demo-' + Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b => b.toString(16).padStart(2,'0')).join('');
    localStorage.setItem('misakiya-tid', tid);
  }
  return tid;
}

async function apiPost(url, body) {
  const r = await fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}

async function saveWork(work) {
  const tenantId = getTenantId();
  return apiPost(CF_SAVE, { tenantId, work });
}
async function listWorks(limit = 200) {
  const tenantId = getTenantId();
  const r = await apiPost(CF_LIST, { tenantId, limit });
  return r.works || [];
}
async function deleteWork(workId) {
  const tenantId = getTenantId();
  return apiPost(CF_DELETE, { tenantId, workId });
}
async function getWork(workId) {
  const tenantId = getTenantId();
  const r = await apiPost(CF_GET, { tenantId, workId });
  return r.work;
}

window.MisakiyaStore = { saveWork, listWorks, deleteWork, getWork, getTenantId };

// ────────────────────────────────────────────────────────────────
// RBAC / Audit / Support (tenant meta 経由)
// ────────────────────────────────────────────────────────────────
const CF_TCFG_GET  = CF_BASE + '/misakiyaGetTenantConfig';
const CF_TCFG_SET  = CF_BASE + '/misakiyaSetTenantConfig';
const CF_AUDITS    = CF_BASE + '/misakiyaListAudits';
const CF_SUPPORT   = CF_BASE + '/misakiyaSubmitSupport';
const CF_CHECKOUT  = CF_BASE + '/misakiyaCreateCheckout';

function getUid() {
  let uid = localStorage.getItem('misakiya-uid');
  if (!uid || uid.length < 8) {
    uid = 'u_' + Array.from(crypto.getRandomValues(new Uint8Array(10))).map(b => b.toString(16).padStart(2,'0')).join('');
    localStorage.setItem('misakiya-uid', uid);
  }
  return uid;
}
async function apiPostUid(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-misakiya-uid': getUid() },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}
async function getTenantConfig() { return apiPostUid(CF_TCFG_GET, { tenantId: getTenantId() }); }
async function setTenantConfig(patch) { return apiPostUid(CF_TCFG_SET, { tenantId: getTenantId(), patch }); }
async function listAudits(limit = 100) { return apiPostUid(CF_AUDITS, { tenantId: getTenantId(), limit }); }
async function submitSupport({ name, email, subject, body }) { return apiPostUid(CF_SUPPORT, { tenantId: getTenantId(), name, email, subject, body }); }
async function createCheckout(plan) { return apiPostUid(CF_CHECKOUT, { tenantId: getTenantId(), plan }); }

Object.assign(window.MisakiyaStore, {
  getUid, getTenantConfig, setTenantConfig, listAudits, submitSupport, createCheckout,
});
