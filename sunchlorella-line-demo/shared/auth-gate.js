/**
 * 認証ゲート — admin / rep 画面の起動前に呼ばれる。
 *
 *   await requireLoggedIn({ role: 'admin' | 'rep' });
 *
 * config.backend === 'local' なら 何もせず即 resolve (デモモード)。
 * 'firebase' なら 未認証時に ログイン画面を DOM に注入し、成功まで await。
 * 認証済みだが role 不足なら 明示エラー。
 */

import { getConfig, autoDetectHosted } from './config.js';
import { onAuthChange, signInWithEmail, currentClaims, signOut } from './auth.js';

const LOGIN_CSS = `
.authgate-bg {
  position: fixed; inset: 0; z-index: 9999;
  background: linear-gradient(160deg, oklch(0.20 0.02 145), oklch(0.28 0.04 145));
  display: grid; place-items: center;
  padding: 20px;
  font-family: var(--font-body, "Noto Sans JP", system-ui, sans-serif);
}
.authgate-card {
  background: #fff; border-radius: 20px;
  max-width: 380px; width: 100%;
  padding: 32px 30px;
  box-shadow: 0 30px 60px -20px rgba(0,0,0,.5);
}
.authgate-card .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 22px; }
.authgate-card .brand-mark {
  width: 34px; height: 34px; border-radius: 10px;
  background: oklch(0.26 0.08 145); color: #fff;
  display: grid; place-items: center;
}
.authgate-card .brand-mark svg { width: 20px; height: 20px; }
.authgate-card .brand-name { font-weight: 900; font-size: 14px; letter-spacing: -.01em; line-height: 1.2; }
.authgate-card .brand-sub  { color: #6b7268; font-size: 11px; letter-spacing: .06em; margin-top: 2px; }
.authgate-card h2 { font-size: 20px; font-weight: 900; letter-spacing: -.02em; margin: 0 0 4px; }
.authgate-card p.sub { color: #6b7268; font-size: 13px; margin: 0 0 22px; }
.authgate-field { margin-bottom: 12px; }
.authgate-field label {
  display: block; font-size: 12px; font-weight: 700; color: #6b7268; margin-bottom: 4px;
}
.authgate-field input {
  width: 100%; border: 1px solid #d8d4ca; border-radius: 10px;
  min-height: 48px; padding: 10px 14px; font-size: 16px;
  font-family: inherit; background: #fff;
}
.authgate-field input:focus {
  outline: 0; border-color: oklch(0.58 0.10 145);
  box-shadow: 0 0 0 3px oklch(0.85 0.10 145 / 0.35);
}
.authgate-btn {
  width: 100%; min-height: 52px; margin-top: 8px;
  background: oklch(0.26 0.08 145); color: #fff; border: 0;
  border-radius: 12px; font: inherit; font-size: 15px; font-weight: 800;
  cursor: pointer; transition: background .18s;
}
.authgate-btn:hover { background: oklch(0.34 0.075 145); }
.authgate-btn:disabled { opacity: .6; cursor: wait; }
.authgate-err {
  background: #fef1ee; color: oklch(0.42 0.16 25);
  border-radius: 8px; padding: 10px 12px; font-size: 12.5px;
  margin: 0 0 12px; display: none;
}
.authgate-err.show { display: block; }
.authgate-foot {
  margin-top: 16px; font-size: 11.5px; color: #94978d; text-align: center; line-height: 1.6;
}
.authgate-foot a { color: oklch(0.34 0.075 145); font-weight: 700; text-decoration: none; }
`;

function injectStyles() {
  if (document.getElementById('authgate-css')) return;
  const s = document.createElement('style'); s.id = 'authgate-css'; s.textContent = LOGIN_CSS;
  document.head.appendChild(s);
}

function loginHtml({ scope }) {
  return `
    <div class="authgate-bg" id="authgate">
      <div class="authgate-card">
        <div class="brand">
          <div class="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c0-6 4-11 10-12-1 6-4 10-10 12z"/><path d="M12 22C6 20 3 16 2 10c6 1 10 5 10 12z"/></svg>
          </div>
          <div>
            <div class="brand-name">サン・クロレラ 統合LINE OS</div>
            <div class="brand-sub">${scope === 'rep' ? '訪問販売員 ログイン' : '本社 管理コンソール ログイン'}</div>
          </div>
        </div>
        <h2>おかえりなさい</h2>
        <p class="sub">${scope === 'rep' ? '販売員IDに紐づくメールアドレスでサインイン' : '管理者メールアドレスとパスワードを入力してください'}</p>
        <div class="authgate-err" id="authErr"></div>
        <form id="authForm">
          <div class="authgate-field">
            <label for="authEmail">メールアドレス</label>
            <input type="email" id="authEmail" required autocomplete="username" placeholder="admin@example.com">
          </div>
          <div class="authgate-field">
            <label for="authPass">パスワード</label>
            <input type="password" id="authPass" required autocomplete="current-password" placeholder="••••••••">
          </div>
          <button class="authgate-btn" type="submit" id="authSubmit">サインイン</button>
        </form>
        <div class="authgate-foot">
          アカウント未発行の場合は運用管理者へお問合せください。<br>
          <a href="../">← 入口に戻る</a>
        </div>
      </div>
    </div>
  `;
}

/**
 * 認証を要求する。 role にマッチしない場合は showError で表示。
 * resolve すると claims オブジェクト (uid/role/tenantId/repId) を返す。
 */
export async function requireLoggedIn({ role = 'admin' } = {}) {
  // Hostingで配信されてる時は自動で firebase backend に上げる (init.json 検出時のみ)
  await autoDetectHosted();
  const cfg = getConfig();
  if (cfg.backend !== 'firebase') {
    return { uid: 'demo', role, tenantId: cfg.tenantId, demo: true };
  }
  injectStyles();

  return new Promise(resolve => {
    let unsub = null;
    unsub = onAuthChange(async user => {
      if (!user) { showLogin(role); return; }
      const claims = await currentClaims();
      if (!claims) { showLogin(role, 'ユーザー情報の取得に失敗しました'); return; }
      if (role === 'admin' && claims.role !== 'admin' && !claims.superadmin) {
        showLogin(role, '管理者権限がありません'); await signOut(); return;
      }
      if (role === 'rep' && !['rep', 'admin'].includes(claims.role) && !claims.superadmin) {
        showLogin(role, '販売員権限がありません'); await signOut(); return;
      }
      hideLogin();
      unsub && unsub();
      resolve(claims);
    });
  });
}

function showLogin(scope, errMsg) {
  let host = document.getElementById('authgate');
  if (!host) {
    const el = document.createElement('div');
    el.innerHTML = loginHtml({ scope });
    document.body.appendChild(el.firstElementChild);
    host = document.getElementById('authgate');
    const form = document.getElementById('authForm');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const email = document.getElementById('authEmail').value.trim();
      const pass  = document.getElementById('authPass').value;
      const btn = document.getElementById('authSubmit');
      btn.disabled = true; btn.textContent = 'サインイン中…';
      try {
        await signInWithEmail(email, pass);
        // onAuthChange が発火して requireLoggedIn 側で resolve
      } catch (e) {
        const err = document.getElementById('authErr');
        err.textContent = e.code === 'auth/invalid-credential'
          ? 'メールアドレスまたはパスワードが違います'
          : (e.message || 'サインインに失敗しました');
        err.classList.add('show');
      } finally {
        btn.disabled = false; btn.textContent = 'サインイン';
      }
    });
  }
  if (errMsg) {
    const err = document.getElementById('authErr');
    if (err) { err.textContent = errMsg; err.classList.add('show'); }
  }
}
function hideLogin() {
  const el = document.getElementById('authgate');
  if (el) el.remove();
}

/** ヘッダに「サインアウト」ボタンを追加するヘルパー */
export function attachSignOutButton(container, opts = {}) {
  const cfg = getConfig();
  if (cfg.backend !== 'firebase') return; // demoでは不要
  const btn = document.createElement('button');
  btn.type = 'button'; btn.textContent = 'サインアウト';
  btn.className = opts.className || 'btn btn-ghost';
  btn.style.marginLeft = 'auto';
  btn.addEventListener('click', async () => {
    if (confirm('サインアウトしますか?')) { await signOut(); location.reload(); }
  });
  container.appendChild(btn);
}
