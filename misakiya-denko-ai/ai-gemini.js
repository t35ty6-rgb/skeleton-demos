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
