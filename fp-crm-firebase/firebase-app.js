// FP Compass — Magic Link auth + Firestore tenant-scoped client list
// Uses Firebase JS SDK v10 via CDN modular imports.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth, sendSignInLinkToEmail, isSignInWithEmailLink,
  signInWithEmailLink, onAuthStateChanged, signOut,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, collection, getDocs,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAmVAEe9l9e1Yo_dzzJdbTVU35wWKd2sH4",
  authDomain: "skeleton-fp-compass-632026.firebaseapp.com",
  projectId: "skeleton-fp-compass-632026",
  storageBucket: "skeleton-fp-compass-632026.firebasestorage.app",
  messagingSenderId: "833972948597",
  appId: "1:833972948597:web:b7310cc22ce41d9738f23c",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);
const loginEl = $("login");
const appEl = $("app");
const msgEl = $("login-msg");

function msg(kind, text) {
  msgEl.className = "login-msg " + kind;
  msgEl.textContent = text;
}

// ============ Step 1: Magic Link 送信 ============
$("send-link-btn").addEventListener("click", async () => {
  const email = $("email-input").value.trim();
  if (!email || !email.includes("@")) {
    msg("err", "有効なメールアドレスを入力してください。");
    return;
  }
  const btn = $("send-link-btn");
  btn.disabled = true;
  btn.textContent = "送信中…";
  try {
    await sendSignInLinkToEmail(auth, email, {
      url: window.location.href.split("?")[0].split("#")[0],
      handleCodeInApp: true,
    });
    window.localStorage.setItem("fp-compass-pending-email", email);
    msg("ok", `${email} にログインリンクを送信しました。受信トレイ (迷惑メールも) を確認し、リンクをクリックしてください。1時間以内にお願いします。`);
    btn.textContent = "送信済み";
  } catch (e) {
    console.error(e);
    if (e.code === "auth/invalid-email") {
      msg("err", "メールアドレスの形式が正しくありません。");
    } else if (e.code === "auth/unauthorized-continue-uri") {
      msg("err", "このドメインは許可されていません。Skeleton 管理者に連絡してください。");
    } else {
      msg("err", "送信に失敗しました: " + (e.message || e.code));
    }
    btn.disabled = false;
    btn.textContent = "ログインリンクを送信";
  }
});

// ============ Step 2: メール内リンククリックで戻ってきた時 ============
async function handleEmailLinkCallback() {
  if (!isSignInWithEmailLink(auth, window.location.href)) return false;
  let email = window.localStorage.getItem("fp-compass-pending-email");
  if (!email) {
    email = window.prompt("ログイン時に使用したメールアドレスを再入力してください:");
    if (!email) return false;
  }
  try {
    msg("ok", "認証中…");
    await signInWithEmailLink(auth, email, window.location.href);
    window.localStorage.removeItem("fp-compass-pending-email");
    // Clean up the URL (remove the auth params)
    history.replaceState(null, "", window.location.pathname);
    return true;
  } catch (e) {
    console.error(e);
    msg("err", "ログインに失敗しました。リンクが古い、または別の端末から開かれた可能性があります。もう一度メールアドレスを入力して送信してください。");
    return false;
  }
}

// ============ Step 3: 認証状態の監視 ============
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    loginEl.style.display = "";
    appEl.style.display = "none";
    return;
  }
  // ログイン中 → users/{uid} を読んで tenantId を取得
  let userDoc;
  try {
    userDoc = await getDoc(doc(db, "users", user.uid));
  } catch (e) {
    msg("err", "ユーザー情報の取得に失敗: " + e.message);
    return;
  }
  if (!userDoc.exists()) {
    loginEl.style.display = "";
    msg("err", `${user.email} は Skeleton 側にまだ登録されていません。管理者にご連絡ください。`);
    await signOut(auth);
    return;
  }
  const userData = userDoc.data();
  const tenantId = userData.tenantId;
  const role = userData.role;

  loginEl.style.display = "none";
  appEl.style.display = "";

  $("user-email").textContent = user.email;
  $("user-tenant").textContent = tenantId.toUpperCase();
  $("audit-tenant").textContent = tenantId;
  $("audit-uid").textContent = user.uid.slice(0, 12) + "…";

  // テナント情報
  let tenantName = tenantId;
  try {
    if (tenantId && tenantId !== "__skeleton__") {
      const tDoc = await getDoc(doc(db, "tenants", tenantId));
      if (tDoc.exists()) tenantName = tDoc.data().name || tenantId;
    } else {
      tenantName = "Skeleton 管理者";
    }
  } catch (_) {}
  $("welcome").textContent = `ようこそ、${tenantName} の管理画面へ`;

  // 顧客一覧
  if (tenantId === "__skeleton__") {
    $("client-list").innerHTML = `
      <div class="empty">
        <div class="empty-icon">⚙️</div>
        Skeleton 管理者アカウントです。<br>顧客一覧は各テナント (fukuda 等) でログインしてください。
      </div>`;
    $("stat-total").textContent = "—";
    $("stat-active").textContent = "—";
    $("stat-lead").textContent = "—";
    return;
  }

  try {
    const snap = await getDocs(collection(db, "tenants", tenantId, "customers"));
    const clients = [];
    snap.forEach((d) => clients.push({ id: d.id, ...d.data() }));
    renderClients(clients);
  } catch (e) {
    console.error(e);
    $("client-list").innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div>顧客データの取得に失敗: ${e.message}</div>`;
  }
});

function renderClients(clients) {
  $("stat-total").textContent = clients.length;
  $("stat-active").textContent = clients.filter(c => c.stage === "active").length;
  $("stat-lead").textContent = clients.filter(c => c.stage === "lead").length;
  $("client-count").textContent = `${clients.length} 件`;

  if (!clients.length) {
    $("client-list").innerHTML = `<div class="empty"><div class="empty-icon">📋</div>まだ顧客が登録されていません。</div>`;
    return;
  }
  const stageLabel = { lead: "見込み客", active: "アクティブ", followup: "フォロー中", closed: "完了" };
  const html = clients.map(c => {
    const initial = (c.name || "?").slice(0, 1);
    const meta = [];
    if (c.age) meta.push(`${c.age}歳`);
    if (c.kana) meta.push(c.kana);
    return `
      <div class="client">
        <div class="client-avatar">${escapeHtml(initial)}</div>
        <div class="client-info">
          <div class="client-name">${escapeHtml(c.name || "(名前未設定)")}</div>
          <div class="client-meta">${escapeHtml(meta.join(" · "))}</div>
        </div>
        <div class="client-stage">${escapeHtml(stageLabel[c.stage] || c.stage || "—")}</div>
      </div>`;
  }).join("");
  $("client-list").innerHTML = html;
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#39;");
}

// ============ Step 4: ログアウト ============
$("logout-btn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.reload();
});

// Bootstrap: handle email-link callback first, then auth state listener takes over
handleEmailLinkCallback();
