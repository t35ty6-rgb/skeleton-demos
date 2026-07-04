/**
 * lineMulticast 単体テスト
 * - 実 LINE API を叩かず、 fetch を mock で置換して retry/failure ロジックを検証
 */

// functions/index.js から lineMulticast だけ抜き出して評価 (CommonJS を dynamic 化)
const src = await import('fs').then(fs => fs.readFileSync(
  '/Users/tsukasayoshida/Desktop/skeleton-demos/sunchlorella-line-demo/functions/index.js', 'utf8'
));

// lineMulticast 関数の定義を抽出 (async function lineMulticast(...) { ... } まで)
const start = src.indexOf('async function lineMulticast');
const braceStart = src.indexOf('{', start);
// 対応する } を探す
let depth = 0, end = -1;
for (let i = braceStart; i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
}
const fnSrc = src.slice(start, end + 1);
console.log('extracted lineMulticast source, length:', fnSrc.length);

// eval で 関数化 (fetch/console.error は上書き可能なグローバル)
const lineMulticast = new Function('fetch', 'console', `${fnSrc}; return lineMulticast;`)(globalThis.fetch, console);

let results = [];

// ─── Test 1: 全成功 (200 OK) ───
{
  const calls = [];
  const mockFetch = async (url, opts) => {
    calls.push({ url, opts });
    return { ok: true, status: 200, text: async () => 'OK' };
  };
  const tokens = Array.from({ length: 1234 }, (_, i) => `U${i}`); // 3 chunks (500+500+234)
  const r = await new Function('fetch', 'console', `${fnSrc}; return lineMulticast;`)(mockFetch, console)(tokens, 'accessTok', [{ type: 'text', text: 'hi' }]);
  results.push({ name: '全成功 1234人 (3 chunks)', expect: { ok: 1234, failed: 0, callCount: 3 }, actual: { ok: r.ok, failed: r.failed, callCount: calls.length } });
}

// ─── Test 2: 429 で Retry-After 適用、 3回目に成功 ───
{
  const calls = [];
  let attempt = 0;
  const mockFetch = async () => {
    calls.push(attempt);
    attempt++;
    if (attempt < 3) return { ok: false, status: 429, headers: { get: (k) => k === 'retry-after' ? '0' : null }, text: async () => 'Too Many Requests' };
    return { ok: true, status: 200, text: async () => 'OK' };
  };
  const r = await new Function('fetch', 'console', `${fnSrc}; return lineMulticast;`)(mockFetch, console)(['U1','U2'], 'tok', [{}]);
  results.push({ name: '429×2 後 3回目成功', expect: { ok: 2, failed: 0, callCount: 3 }, actual: { ok: r.ok, failed: r.failed, callCount: calls.length } });
}

// ─── Test 3: 5xx で 3回全部失敗 → retry_exhausted ───
{
  const calls = [];
  const mockFetch = async () => {
    calls.push(1);
    return { ok: false, status: 503, headers: { get: () => null }, text: async () => 'Service Unavailable' };
  };
  const r = await new Function('fetch', 'console', `${fnSrc}; return lineMulticast;`)(mockFetch, {error: () => {}, log: () => {}})(['U1','U2','U3'], 'tok', [{}]);
  results.push({ name: '5xx 3回全滅 → retry_exhausted', expect: { ok: 0, failed: 3, callCount: 3, hasErrors: true }, actual: { ok: r.ok, failed: r.failed, callCount: calls.length, hasErrors: r.errors.length > 0 } });
}

// ─── Test 4: 4xx (署名不正等) は即break、 retry しない ───
{
  const calls = [];
  const mockFetch = async () => {
    calls.push(1);
    return { ok: false, status: 401, headers: { get: () => null }, text: async () => 'Invalid signature' };
  };
  const r = await new Function('fetch', 'console', `${fnSrc}; return lineMulticast;`)(mockFetch, {error: () => {}, log: () => {}})(['U1','U2'], 'tok', [{}]);
  results.push({ name: '4xx 即failed (retryなし)', expect: { ok: 0, failed: 2, callCount: 1 }, actual: { ok: r.ok, failed: r.failed, callCount: calls.length } });
}

// ─── Test 5: 空リスト → { ok:0, failed:0 } ───
{
  const r = await new Function('fetch', 'console', `${fnSrc}; return lineMulticast;`)(async () => ({ ok: true, status: 200 }), console)([], 'tok', [{}]);
  results.push({ name: '空リスト', expect: { ok: 0, failed: 0 }, actual: { ok: r.ok, failed: r.failed } });
}

// ─── Test 6: 部分失敗 (1500人 = 3 chunks、 2 chunk目 だけ 4xx) ───
{
  const calls = [];
  const mockFetch = async () => {
    calls.push(1);
    // 2回目の呼び出し (chunk 2) だけ失敗
    if (calls.length === 2) return { ok: false, status: 400, headers: { get: () => null }, text: async () => 'Bad Request' };
    return { ok: true, status: 200, text: async () => 'OK' };
  };
  const r = await new Function('fetch', 'console', `${fnSrc}; return lineMulticast;`)(mockFetch, {error: () => {}, log: () => {}})(Array.from({length:1500},(_,i)=>`U${i}`), 'tok', [{}]);
  results.push({ name: '部分失敗 1500人 3chunk中2番目失敗', expect: { ok: 1000, failed: 500, callCount: 3 }, actual: { ok: r.ok, failed: r.failed, callCount: calls.length } });
}

// 結果表示
console.log('\n=== Test Results ===');
let pass = 0, fail = 0;
for (const t of results) {
  const ok = JSON.stringify(Object.keys(t.expect).sort().reduce((a,k)=>(a[k]=t.actual[k],a),{})) === JSON.stringify(Object.keys(t.expect).sort().reduce((a,k)=>(a[k]=t.expect[k],a),{}));
  console.log(`${ok ? '✓' : '✗'} ${t.name}`);
  console.log(`   expect: ${JSON.stringify(t.expect)}`);
  console.log(`   actual: ${JSON.stringify(t.actual)}`);
  ok ? pass++ : fail++;
}
console.log(`\n${pass}/${pass+fail} passed`);
process.exit(fail > 0 ? 1 : 0);
