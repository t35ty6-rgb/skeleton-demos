// いろはグループ 会員 教育プラットフォーム · ブラウザ 内 動画 ストア (IndexedDB)
// 実 upload / 実 再生 / 実 削除 / 実 progress を per-browser で 完結。
// 本番 は Firebase Storage に 差替え 予定 (Phase 1 実装)。

(function (global) {
  const DB_NAME = 'iroha-lala-store';
  const DB_VERSION = 1;
  const STORE_VIDEOS = 'videos';

  const CATEGORY_LABELS = {
    '1.1': 'ブラ の 選び方', '1.2': 'ガードル の 選び方', '1.3': 'ボディスーツ の 選び方', '1.4': '補整下着 と 一般下着 の 違い',
    '2.1': 'ブラ 着用 基本', '2.2': 'ガードル 着用 基本', '2.3': 'ボディスーツ の 手順', '2.4': '応用 テクニック',
    '3.1': '骨格 と 姿勢', '3.2': '年代別 の ボディライン', '3.3': 'ライフステージ 別',
    '4.1': '洗い方 の 基本', '4.2': '干し方 · 収納',
    '5.1': 'Grant SCIENCE WATER', '5.2': 'DR LALA Grant シリーズ', '5.3': 'HARITHOTH / HIKARUKO', '5.4': 'LALA SPORTS GRANT',
    '6.1': '社長 講演', '6.2': 'ゲスト講師', '6.3': '会員限定 Q&A', '6.4': '新商品 発表会', '6.5': 'ファッションショー',
    '7.1': '販売員 商品知識', '7.2': '販売員 接客', '7.3': '販売員 新商品 研修'
  };

  const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS);

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_VIDEOS)) {
          const store = db.createObjectStore(STORE_VIDEOS, { keyPath: 'id' });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('uploadedAt', 'uploadedAt', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function tx(mode) {
    return openDB().then(db => {
      const t = db.transaction(STORE_VIDEOS, mode);
      return { store: t.objectStore(STORE_VIDEOS), tx: t, db };
    });
  }

  async function list() {
    const { store } = await tx('readonly');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result.sort((a, b) => b.uploadedAt - a.uploadedAt));
      req.onerror = () => reject(req.error);
    });
  }

  async function get(id) {
    const { store } = await tx('readonly');
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function put(record) {
    const { store, tx: t } = await tx('readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
      t.oncomplete = () => notify();
    });
  }

  async function remove(id) {
    const { store, tx: t } = await tx('readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      t.oncomplete = () => notify();
    });
  }

  async function clear() {
    const { store, tx: t } = await tx('readwrite');
    return new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      t.oncomplete = () => notify();
    });
  }

  async function incrementViews(id) {
    const v = await get(id);
    if (!v) return;
    v.views = (v.views || 0) + 1;
    v.lastViewedAt = Date.now();
    return put(v);
  }

  // ========== VIDEO PROCESSING ==========

  // Read a File / Blob and emit progress via callback
  function readFileWithProgress(file, onProgress) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = e => reject(reader.error);
      reader.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
      reader.readAsArrayBuffer(file);
    });
  }

  // Extract video metadata (duration, dimensions) + first frame thumbnail
  function extractVideoMeta(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.src = url;
      let done = false;
      const finish = (meta) => {
        if (done) return;
        done = true;
        URL.revokeObjectURL(url);
        resolve(meta);
      };
      // fallback timeout — if browser can't decode, still return name-based meta
      const to = setTimeout(() => finish({ duration: 0, width: 0, height: 0, thumbDataUrl: null }), 4000);
      video.onloadedmetadata = () => {
        // seek to 1s or 10% of duration for a stable frame
        const seekTo = Math.min(1, video.duration * 0.1);
        video.currentTime = seekTo;
      };
      video.onseeked = () => {
        clearTimeout(to);
        try {
          const canvas = document.createElement('canvas');
          const maxW = 320;
          const scale = video.videoWidth > 0 ? Math.min(1, maxW / video.videoWidth) : 1;
          canvas.width = Math.round((video.videoWidth || maxW) * scale);
          canvas.height = Math.round((video.videoHeight || 180) * scale);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          finish({ duration: video.duration, width: video.videoWidth, height: video.videoHeight, thumbDataUrl });
        } catch (e) {
          finish({ duration: video.duration || 0, width: 0, height: 0, thumbDataUrl: null });
        }
      };
      video.onerror = () => { clearTimeout(to); finish({ duration: 0, width: 0, height: 0, thumbDataUrl: null }); };
    });
  }

  // High-level upload flow: reads file, extracts meta, stores in IndexedDB
  async function upload(file, meta, onProgress) {
    // Progress phases: 0-70% read, 70-90% meta, 90-100% persist
    const readPromise = readFileWithProgress(file, (p) => { onProgress && onProgress(p * 0.7, 'reading'); });
    const metaPromise = extractVideoMeta(file);

    const buffer = await readPromise;
    onProgress && onProgress(0.72, 'meta');
    const vmeta = await metaPromise;
    onProgress && onProgress(0.9, 'persist');

    const blob = new Blob([buffer], { type: file.type || 'video/mp4' });
    const id = 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const record = {
      id,
      name: meta?.name || file.name,
      title: meta?.title || file.name.replace(/\.[^.]+$/, ''),
      category: meta?.category || '1.1',
      published: meta?.published !== false,
      memberTagIds: meta?.memberTagIds || ['all'],
      description: meta?.description || '',
      duration: vmeta.duration || 0,
      width: vmeta.width || 0,
      height: vmeta.height || 0,
      thumbDataUrl: vmeta.thumbDataUrl,
      videoBlob: blob,
      videoType: file.type || 'video/mp4',
      size: file.size,
      uploadedAt: Date.now(),
      views: 0,
      lastViewedAt: null
    };
    await put(record);
    onProgress && onProgress(1, 'done');
    return record;
  }

  // Create Blob URL for playback (caller responsible for revoking)
  function blobUrl(record) {
    if (!record || !record.videoBlob) return null;
    return URL.createObjectURL(record.videoBlob);
  }

  // Format seconds to mm:ss or h:mm:ss
  function fmtDur(sec) {
    sec = Math.round(sec || 0);
    if (sec < 60) return sec + '秒';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${m}:${String(s).padStart(2,'0')}`;
  }

  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024*1024) return (bytes/1024).toFixed(0) + 'KB';
    if (bytes < 1024*1024*1024) return (bytes/1024/1024).toFixed(1) + 'MB';
    return (bytes/1024/1024/1024).toFixed(2) + 'GB';
  }

  function fmtDate(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  // ========== NOTIFY (cross-tab / same-tab) ==========
  const listeners = new Set();
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function notify() {
    listeners.forEach(fn => { try { fn(); } catch(e){} });
    try { localStorage.setItem('iroha_store_bump', String(Date.now())); } catch(e){}
  }
  // Cross-tab: another tab updates → we get storage event
  window.addEventListener('storage', (e) => {
    if (e.key === 'iroha_store_bump') listeners.forEach(fn => { try { fn(); } catch(_){} });
  });

  global.IrohaStore = {
    list, get, put, remove, clear,
    upload, blobUrl, incrementViews,
    fmtDur, fmtSize, fmtDate,
    subscribe,
    CATEGORY_LABELS, CATEGORY_ORDER
  };
})(window);
