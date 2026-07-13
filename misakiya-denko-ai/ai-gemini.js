// 三崎屋電工AI — Vertex AI Gemini 2.5 Flash 統合 (client-side)
// 動画URL → misakiyaGenerateStepsFromVideo (Firebase CF, onRequest) → 電気工事 手順書 JSON
// CORS: t35ty6-rgb.github.io + localhost 許可済、 認証不要 (origin allowlist)
// Vertex AI project: skeleton-fp-compass-632026, CF host: skeleton-femoon-saas

const CF_URL = 'https://misakiyageneratestepsfromvideo-bzodn7vcpq-uc.a.run.app';

/**
 * 実 Gemini 2.5 Flash 呼出。 YouTube URL or GCS URI から 電気工事 手順書 JSON を 生成。
 * @param {string} videoUrl - "https://www.youtube.com/watch?v=..." or "gs://bucket/path"
 * @param {string} hint - 任意の追加ヒント (作業カテゴリ、社内表記 等)
 * @returns {Promise<{title,category,estimatedMinutes,safetyLevel,steps,regulatoryRefs,confidenceScore,_meta}>}
 */
async function generateStepsFromVideo(videoUrl, hint = '') {
  if (!videoUrl) throw new Error('videoUrl required');
  const t0 = Date.now();
  const resp = await fetch(CF_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoUrl, hint }),
  });
  if (!resp.ok) {
    const errTxt = await resp.text();
    throw new Error(`CF ${resp.status}: ${errTxt.slice(0, 200)}`);
  }
  const data = await resp.json();
  console.log(`[misakiya-gemini] ${data?.steps?.length || 0} steps in ${((Date.now()-t0)/1000).toFixed(1)}s`);
  return data;
}

// expose to window (non-module 呼出用)
window.MisakiyaGemini = { generateStepsFromVideo };
