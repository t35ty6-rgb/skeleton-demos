/**
 * SkelFit client SDK.
 *
 * Firebase compat SDK の 上 に 薄い ラッパ を 置いて、
 * admin (trainer) と LIFF (customer) から 使う。
 *
 * Firebase 未設定 (SKELFIT_IS_CONFIGURED() が false) の 場合、
 * 埋め込み seed data を 返す demo mode に fallback する。
 *
 * ── 依存 ──
 *   - <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>
 *   - <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>
 *   - <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"></script>
 *   - <script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>   (LIFF のみ)
 *   - <script src="firebase-config.js"></script>
 */

(function (global) {
  "use strict";

  // ============================================================
  // Demo data (seed に相当。 Firebase 未設定 時 fallback。)
  // ============================================================
  const DEMO_TENANT = {
    id: "takata-studio",
    name: "高田トレーナー studio",
    plan: "STUDIO",
    planLimits: { maxCustomers: 100, maxTrainers: 5 },
    publicProfile: {
      slug: "takata",
      displayName: "高田 賢一 トレーナー",
      themePalette: "vital",
    },
    stats: {
      activeCustomers: 18,
      monthlyRevenue: 384200,
      retentionRate: 92,
    },
  };

  const DEMO_CUSTOMERS = [
    {
      id: "cust-yamamoto",
      displayName: "山本 美咲",
      initials: "YM",
      age: 32,
      gender: "female",
      goal: "9月末 まで に 体脂肪 -2%、 スクワット 20回 × 3セット を 息切れ せず。",
      planName: "月8回 プラン",
      planPriceYen: 48400,
      ticketBalance: 2,
      ticketMonthly: 8,
      status: "active",
      joinedMonthsAgo: 4,
      measurements: {
        latestWeightKg: 54.8,
        weightTrend: -0.6,
        latestBodyFatPct: 26.4,
        bodyFatTrend: -0.3,
        latestMuscleKg: 37.8,
        muscleTrend: 0.2,
        latestMeasuredAt: "2026-07-06",
      },
      history: [
        { at: "2026-07-06 14:00", kind: "6回目 · 下半身", note: "スクワット 12回 × 3 まで 到達。 膝の 痛み なし。 次回 は 15回 × 3 を 目安 に。" },
        { at: "2026-06-29 14:00", kind: "5回目 · 体幹", note: "プランク 45秒 × 3。 「太もも の 引き締まり を 実感」 と 本人 コメント。" },
        { at: "2026-06-22 14:00", kind: "4回目 · 有酸素", note: "HIIT 20分。 心拍 155 平均。 呼吸法 の 意識付け 継続。" },
      ],
      colorGrad: ["#a4c9ff", "#4a7ee0"],
    },
    {
      id: "cust-sato",
      displayName: "佐藤 直美",
      initials: "SN",
      age: 41,
      gender: "female",
      goal: "体験。 まず 1回 試したい。",
      planName: "体験",
      planPriceYen: 3300,
      ticketBalance: 1,
      status: "trial",
      firstBookingDaysAgo: 2,
      colorGrad: ["#ff9a9e", "#fad0c4"],
      history: [
        { at: "予約時 メモ", kind: "体験", note: "初回、 まず 30分 で 姿勢 と 呼吸 の 現状 を 見て、 続けたい 感触 を 掴んで もらう。" },
      ],
    },
    {
      id: "cust-hasegawa",
      displayName: "長谷川 亜矢",
      initials: "HA",
      age: 45,
      gender: "female",
      goal: "腰痛 予防 と 週2 の 継続 リズム。",
      planName: "月4回 プラン",
      planPriceYen: 26400,
      ticketBalance: 1,
      joinedMonthsAgo: 3,
      status: "active",
      colorGrad: ["#b0f0c4", "#4ac986"],
      history: [
        { at: "2026-07-06 16:30", kind: "13回目 · 腰痛予防", note: "先週より 腰の可動域 明らかに up。 今日 は デッドリフト 軽重量 に 進んで OK。" },
        { at: "2026-06-29 16:30", kind: "12回目 · 呼吸", note: "デスクワーク 由来 の 猫背 が 課題。 呼吸法 継続 で 効果 出てる。" },
      ],
    },
    {
      id: "cust-kaba",
      displayName: "蒲 涼子",
      initials: "RK",
      age: 38,
      gender: "female",
      goal: "産後 の 体力回復 と 骨盤周り。",
      planName: "月4回 プラン",
      planPriceYen: 26400,
      ticketBalance: 3,
      joinedMonthsAgo: 1,
      status: "active",
      colorGrad: ["#d4c5f0", "#8a5cf5"],
      history: [
        { at: "2026-07-06 19:00", kind: "2回目 · 骨盤周り", note: "産後 8ヶ月、 まだ 骨盤 前傾 気味。 無理 せず 段階的に 進める 方針。" },
      ],
    },
    {
      id: "cust-matsumoto",
      displayName: "松本 香奈",
      initials: "MK",
      colorGrad: ["#ffd6a5", "#ff9a55"],
      status: "active",
    },
  ];

  function nowJst() {
    const d = new Date();
    return new Date(d.getTime() + 9 * 3600 * 1000);
  }

  function jstIso(hour, min) {
    // 今日 の JST hour:min を UTC ISO で 返す (demo用)
    const j = nowJst();
    j.setUTCHours(hour - 9, min, 0, 0);
    return j.toISOString();
  }

  const DEMO_SESSIONS_TODAY = [
    {
      id: "sess-today-1000",
      customerId: "cust-sato",
      scheduledAt: jstIso(10, 0),
      durationMin: 50,
      title: "体験セッション (お試し)",
      status: "confirmed",
    },
    {
      id: "sess-today-1400",
      customerId: "cust-yamamoto",
      scheduledAt: jstIso(14, 0),
      durationMin: 50,
      title: "下半身 コンディショニング",
      status: "reminded_day",
      zoom: { joinUrl: "https://zoom.us/j/00000000000?pwd=demo" },
    },
    {
      id: "sess-today-1630",
      customerId: "cust-hasegawa",
      scheduledAt: jstIso(16, 30),
      durationMin: 50,
      title: "腰痛 予防 ストレッチ",
      status: "confirmed",
    },
    {
      id: "sess-today-1900",
      customerId: "cust-kaba",
      scheduledAt: jstIso(19, 0),
      durationMin: 50,
      title: "骨盤周り + 体幹",
      status: "requested",
    },
  ];

  // ============================================================
  // Firebase init (idempotent)
  // ============================================================
  let firebaseApp = null;
  let db = null;
  let auth = null;

  function initFirebase() {
    if (firebaseApp) return firebaseApp;
    if (!global.firebase || typeof global.firebase.initializeApp !== "function") {
      throw new Error("Firebase compat SDK not loaded");
    }
    if (!global.SKELFIT_IS_CONFIGURED || !global.SKELFIT_IS_CONFIGURED()) {
      return null; // demo mode
    }
    firebaseApp = global.firebase.initializeApp(global.SKELFIT_FIREBASE_CONFIG);
    auth = global.firebase.auth();
    db = global.firebase.firestore();
    try {
      db.settings({ experimentalAutoDetectLongPolling: true, merge: true });
    } catch (_) {}
    return firebaseApp;
  }

  function isLive() {
    return !!firebaseApp || (global.SKELFIT_IS_CONFIGURED && global.SKELFIT_IS_CONFIGURED());
  }

  // ============================================================
  // Data access — admin (trainer) 用
  // ============================================================
  async function loadTenant(tenantId) {
    if (!isLive()) return { ...DEMO_TENANT };
    initFirebase();
    const snap = await db.collection("skelfit-tenants").doc(tenantId).get();
    if (!snap.exists) throw new Error(`tenant not found: ${tenantId}`);
    const t = { id: snap.id, ...snap.data() };
    // Security C5: LINE token を client メモリ に 露出 させない (Firestore rules で 客 は tenant 全読み できない が、 admin が XSS 経由 で 抜かれる リスク を さらに 低減)
    if (t.integrations?.line?.channelAccessToken) {
      t.integrations.line = { ...t.integrations.line, channelAccessToken: undefined, tokenRef: '[hidden]' };
    }
    if (t.integrations?.line?.channelSecret) {
      t.integrations.line.channelSecret = undefined;
    }
    return t;
  }

  async function loadCustomers(tenantId) {
    if (!isLive()) return DEMO_CUSTOMERS.map((c) => ({ ...c }));
    initFirebase();
    const snap = await db
      .collection("skelfit-tenants").doc(tenantId)
      .collection("customers")
      .orderBy("joinedAt", "desc")
      .limit(200)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async function loadCustomer(tenantId, customerId) {
    if (!isLive()) {
      return DEMO_CUSTOMERS.find((c) => c.id === customerId) || null;
    }
    initFirebase();
    const snap = await db
      .collection("skelfit-tenants").doc(tenantId)
      .collection("customers").doc(customerId).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }

  function watchSessionsToday(tenantId, callback) {
    if (!isLive()) {
      // demo: 1回 push して終わり
      const out = DEMO_SESSIONS_TODAY.map((s) => ({ ...s }));
      Promise.resolve().then(() => callback(out));
      return () => {};
    }
    initFirebase();
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    return db
      .collection("skelfit-tenants").doc(tenantId)
      .collection("sessions")
      .where("scheduledAt", ">=", start)
      .where("scheduledAt", "<=", end)
      .orderBy("scheduledAt", "asc")
      .onSnapshot(
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          callback(list);
        },
        (err) => {
          console.error("watchSessionsToday error:", err);
          callback([]);
        },
      );
  }

  function watchCustomerNextSession(tenantId, customerId, callback) {
    if (!isLive()) {
      const s = DEMO_SESSIONS_TODAY.find((x) => x.customerId === customerId);
      Promise.resolve().then(() => callback(s || null));
      return () => {};
    }
    initFirebase();
    return db
      .collection("skelfit-tenants").doc(tenantId)
      .collection("sessions")
      .where("customerId", "==", customerId)
      .where("scheduledAt", ">=", new Date())
      .orderBy("scheduledAt", "asc")
      .limit(1)
      .onSnapshot(
        (snap) => {
          const s = snap.docs[0];
          callback(s ? { id: s.id, ...s.data() } : null);
        },
        (err) => {
          console.error("watchCustomerNextSession error:", err);
          callback(null);
        },
      );
  }

  // ============================================================
  // LIFF Auth (客側 login flow)
  // ============================================================
  async function initLiff() {
    if (!global.liff) {
      console.warn("LIFF SDK not loaded");
      return null;
    }
    const liffId = global.SKELFIT_LIFF_ID;
    if (!liffId) {
      console.info("LIFF ID not configured — running in demo mode");
      return null;
    }
    await global.liff.init({ liffId });
    if (!global.liff.isLoggedIn()) {
      global.liff.login();
      return null;
    }
    const profile = await global.liff.getProfile();
    const idToken = global.liff.getIDToken();
    return { profile, idToken };
  }

  async function exchangeLiffTokenForCustomer(tenantId, idToken) {
    if (!global.SKELFIT_FUNCTIONS_BASE) {
      throw new Error("Functions base URL not configured");
    }
    const res = await fetch(`${global.SKELFIT_FUNCTIONS_BASE}/liffAuth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, tenantId }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`liffAuth failed: ${body}`);
    }
    return res.json();
  }

  async function loginLiffCustomer(tenantId) {
    if (!isLive()) {
      // demo mode: pretend logged in as YM
      return { customerId: "cust-yamamoto", tenantId, demo: true };
    }
    const liffInfo = await initLiff();
    if (!liffInfo) return { demo: true };
    const { customToken, customerId } = await exchangeLiffTokenForCustomer(tenantId, liffInfo.idToken);
    initFirebase();
    await auth.signInWithCustomToken(customToken);
    return { customerId, tenantId, liffProfile: liffInfo.profile };
  }

  // ============================================================
  // Admin auth (trainer)
  // ============================================================
  async function loginAdminEmail(email, password) {
    initFirebase();
    if (!isLive()) throw new Error("Firebase not configured");
    const cred = await auth.signInWithEmailAndPassword(email, password);
    return cred.user;
  }

  async function loginAdminGoogle() {
    initFirebase();
    if (!isLive()) throw new Error("Firebase not configured");
    const provider = new global.firebase.auth.GoogleAuthProvider();
    const cred = await auth.signInWithPopup(provider);
    return cred.user;
  }

  async function logoutAdmin() {
    if (!isLive()) return;
    initFirebase();
    await auth.signOut();
  }

  function watchAdminAuth(callback) {
    if (!isLive()) {
      // demo: fake logged-in trainer
      Promise.resolve().then(() =>
        callback({ uid: "seed-owner-uid", email: "takata@example.com", displayName: "高田 賢一" }),
      );
      return () => {};
    }
    initFirebase();
    return auth.onAuthStateChanged((user) => callback(user));
  }

  // ============================================================
  // Session mutations (admin)
  // ============================================================
  async function requestBooking(tenantId, { customerId, scheduledAt, durationMin, title }) {
    if (!isLive()) {
      console.info("[demo] requestBooking", { customerId, scheduledAt });
      return { id: "demo-" + Date.now() };
    }
    initFirebase();
    const doc = db
      .collection("skelfit-tenants").doc(tenantId)
      .collection("sessions").doc();
    await doc.set({
      id: doc.id,
      customerId,
      scheduledAt: global.firebase.firestore.Timestamp.fromDate(new Date(scheduledAt)),
      durationMin: durationMin || 50,
      timezone: "Asia/Tokyo",
      title: title || "セッション",
      status: "requested",
      ticketConsumed: false,
      reminders: { dayBeforeSent: false, fiveMinBeforeSent: false },
      createdAt: global.firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: "customer",
    });
    return { id: doc.id };
  }

  async function confirmSession(tenantId, sessionId) {
    if (!isLive()) {
      console.info("[demo] confirmSession", sessionId);
      return;
    }
    initFirebase();
    await db
      .collection("skelfit-tenants").doc(tenantId)
      .collection("sessions").doc(sessionId)
      .update({
        status: "confirmed",
        updatedAt: global.firebase.firestore.FieldValue.serverTimestamp(),
      });
  }

  async function cancelSession(tenantId, sessionId) {
    if (!isLive()) {
      console.info("[demo] cancelSession", sessionId);
      return;
    }
    initFirebase();
    await db
      .collection("skelfit-tenants").doc(tenantId)
      .collection("sessions").doc(sessionId)
      .update({
        status: "canceled",
        updatedAt: global.firebase.firestore.FieldValue.serverTimestamp(),
      });
  }

  // ============================================================
  // Format helpers
  // ============================================================
  function fmtYen(n) {
    if (typeof n !== "number") return "-";
    return "¥" + n.toLocaleString("ja-JP");
  }

  function fmtDate(isoOrDate) {
    const d = isoOrDate instanceof Date ? isoOrDate : (isoOrDate?.toDate ? isoOrDate.toDate() : new Date(isoOrDate));
    if (isNaN(d.getTime())) return "-";
    const j = new Date(d.getTime() + 9 * 3600 * 1000);
    const y = j.getUTCFullYear();
    const m = String(j.getUTCMonth() + 1).padStart(2, "0");
    const day = String(j.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function fmtTime(isoOrDate) {
    const d = isoOrDate instanceof Date ? isoOrDate : (isoOrDate?.toDate ? isoOrDate.toDate() : new Date(isoOrDate));
    if (isNaN(d.getTime())) return "-";
    const j = new Date(d.getTime() + 9 * 3600 * 1000);
    return `${String(j.getUTCHours()).padStart(2, "0")}:${String(j.getUTCMinutes()).padStart(2, "0")}`;
  }

  function fmtTimeRange(isoOrDate, durationMin) {
    const d = isoOrDate instanceof Date ? isoOrDate : (isoOrDate?.toDate ? isoOrDate.toDate() : new Date(isoOrDate));
    if (isNaN(d.getTime())) return "-";
    const end = new Date(d.getTime() + (durationMin || 50) * 60 * 1000);
    return `${fmtTime(d)}〜${fmtTime(end)}`;
  }

  // ============================================================
  // Security: escapeHtml (保存型 XSS 防止 — security audit CRITICAL #4)
  // ============================================================
  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"'`=/]/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
      "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;',
    }[c]));
  }
  function esc(s) { return escapeHtml(s); }

  // ============================================================
  // Expose
  // ============================================================
  global.SkelFitSDK = {
    escapeHtml, esc,
    initFirebase,
    isLive,
    loadTenant,
    loadCustomers,
    loadCustomer,
    watchSessionsToday,
    watchCustomerNextSession,
    initLiff,
    loginLiffCustomer,
    loginAdminEmail,
    loginAdminGoogle,
    logoutAdmin,
    watchAdminAuth,
    requestBooking,
    confirmSession,
    cancelSession,
    fmtYen,
    fmtDate,
    fmtTime,
    fmtTimeRange,
    _demo: { DEMO_TENANT, DEMO_CUSTOMERS, DEMO_SESSIONS_TODAY },
  };
})(window);
