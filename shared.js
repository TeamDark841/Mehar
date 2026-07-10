/* ============================================================   EarnPkrauf — cloud build. Data lives in Supabase (Postgres),   screenshots are hosted on Cloudinary. All money-affecting   logic (balances, tax, referral bonuses, admin approvals) runs   inside Postgres functions, not in this client-side file.   ============================================================ */window.EARNPKR_CONFIG = {  CURRENCY: "Rs",  DEPOSIT_ACCOUNT: "0300-1234567",  DEPOSIT_ACCOUNT_NAME: "EarnPkrauf",  SUPPORT_URL: "https://t.me/",  MIN_DEPOSIT: 50,  MIN_WITHDRAW: 100,  TAX_VIP_PERCENT: 4,   /* tax % for VIP (paid plan) users on task rewards + withdrawals */  TAX_FREE_PERCENT: 15, /* tax % for free (non-VIP) users on task rewards + withdrawals */};function taxRateFor(profile){ return (profile && profile.vip_level>0) ? EARNPKR_CONFIG.TAX_VIP_PERCENT : EARNPKR_CONFIG.TAX_FREE_PERCENT; }window.addEventListener("error", function(e){  alert("PAGE ERROR:\n" + e.message + "\nat line " + e.lineno + ":" + e.colno);});window.addEventListener("unhandledrejection", function(e){  alert("PROMISE ERROR:\n" + (e.reason && e.reason.message ? e.reason.message : e.reason));});/* ---------------- helpers ---------------- */window.rs = (n) => EARNPKR_CONFIG.CURRENCY + " " + Number(n || 0).toLocaleString();window.qs = (s, r = document) => r.querySelector(s);window.qsa = (s, r = document) => Array.from(r.querySelectorAll(s));function hashParts(){ let h = location.hash.slice(1) || "/"; let [route, query=""] = h.split("?"); return {route, query}; }window.getParam = (k) => new URLSearchParams(hashParts().query).get(k);window.toast = function (msg) {  let t = qs("#toast");  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }  t.textContent = msg; t.classList.add("show");  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("show"), 2400);};window.mount = (html) => { qs("#app").innerHTML = html; };window.loading = () => mount('<div class="spinner"></div>');window.errorBox = (msg) => `<div class="card center"><p class="muted">${msg}</p></div>`;/* shared date formatter (used by notifications, admin panel, etc.) — must be   global, not re-declared locally inside a single page function, otherwise   any other page calling it throws "fmtDate is not defined". */window.fmtDate = function (s) { if (!s) return "—"; const d = new Date(s); return isNaN(d) ? String(s) : d.toLocaleDateString(); };window.header = function ({ title, emoji = "", subtitle = "", back = "" }) {  return `<div class="grad header-block">    ${back ? `<a class="back" href="${back}">← Back</a>` : ""}    <h1 style="margin-top:${back ? "12px" : "0"};font-size:24px;font-weight:800">${emoji} ${title}</h1>    ${subtitle ? `<p style="opacity:.9;margin:6px 0 0;font-size:14px">${subtitle}</p>` : ""}  </div>`;};window.tabbar = function (active) {  const T = [["#/dashboard","🏠","Home"],["#/tasks","📋","Tasks"],["#/deposit","💳","Deposit"],["#/invite","👥","Invite"],["#/vip","👑","VIP"]];  return `<div class="tabbar">${T.map(([h, i, l]) =>    `<a href="${h}" class="${active === h ? "active" : ""}"><span class="ic">${i}</span>${l}</a>`).join("")}</div>`;};window.SUPABASE_URL = "https://nmijxktbnpewuohrwcbz.supabase.co";window.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5taWp4a3RibnBld3VvaHJ3Y2J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMTc2OTAsImV4cCI6MjA5ODc5MzY5MH0.ZhEQ_r-QI54iRmk30FZscmOFPV6fF_LFZeSPuup1_To";window.CLOUDINARY_CLOUD_NAME = "vmphfgnr";window.CLOUDINARY_UPLOAD_PRESET = "Earnpkr";const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);function todayStr(){ return new Date().toISOString().slice(0,10); }async function uploadToCloudinary(file){  const fd = new FormData();  fd.append("file", file);  fd.append("upload_preset", window.CLOUDINARY_UPLOAD_PRESET);  const res = await fetch(`https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: "POST", body: fd });  const data = await res.json();  if (!res.ok) throw new Error((data && data.error && data.error.message) || "Screenshot upload failed. Please try again.");  return data.secure_url;}async function uploadAllToCloudinary(files){  const urls = [];  for (const f of files) { if (f && f.size) urls.push(await uploadToCloudinary(f)); }  return urls;}let _authUser = null;let _isAdmin = false;window.initAuth = async function () {  const bar = document.getElementById("cfgWarnBar");  if (bar) bar.style.display = "none";  const { data: { session } } = await sb.auth.getSession();  _authUser = session ? session.user : null;  if (_authUser) {    try { const p = await rpc("get_profile", {}); _isAdmin = !!p.is_admin; }    catch (e) { _authUser = null; _isAdmin = false; }  }  sb.auth.onAuthStateChange((_event, session) => {    _authUser = session ? session.user : null;    if (!_authUser) _isAdmin = false;  });};window.isLoggedIn = () => !!_authUser;window.currentUserId = () => (_authUser ? _authUser.id : null);window.isCurrentUserAdmin = () => _isAdmin;window.requireAuth = function () { if (!isLoggedIn()) { location.href = "auth.html#/login"; return false; } return true; };window.redirectIfAuthed = function () { if (isLoggedIn()) location.href = "app.html#/dashboard"; };window.logout = async function () { await sb.auth.signOut(); _authUser = null; _isAdmin = false; location.href = "index.html#/"; };window.showWelcomePopup = function(title, text){  const el=document.createElement("div");  el.className="modal-overlay";  el.innerHTML=`<div class="modal-box"><div style="font-size:40px;margin-bottom:10px">🎉</div>    <h2 style="margin-bottom:8px">${title}</h2><p class="muted" style="margin-bottom:18px">${text}</p>    <button class="btn btn-primary" id="wp-close">Got it!</button></div>`;  document.body.appendChild(el);  el.querySelector("#wp-close").onclick=()=>el.remove();};const VIP_PLANS = [  { level:1, price:500, referral_bonus:"+5% referral bonus", perks:["Priority tasks","5% referral bonus","Faster withdrawals","VIP support"] },];async function rpc(name, params){  const { data, error } = await sb.rpc(name, params || {});  if (error) throw new Error(error.message || "Something went wrong. Please try again.");  return data;}window.api = async function (path, { method = "GET", body = {}, form } = {}) {  if (path === "/public/settings") return await rpc("get_public_settings");  if (path === "/public/home") return await rpc("get_public_home");  if (path === "/auth/register" && method === "POST") {    const { data, error } = await sb.auth.signUp({      email: body.email, password: body.password,      options: { data: { name: body.name || "", username: body.username || "", phone: body.phone || "", ref: body.ref || "" } }    });    if (error) throw new Error(error.message);    _authUser = data.user;    let profile = null;    try { profile = await rpc("get_profile", {}); _isAdmin = !!(profile && profile.is_admin); }    catch (e) { }    return { token: data.user ? data.user.id : null, user: profile };  }  if (path === "/auth/login" && method === "POST") {    const { data, error } = await sb.auth.signInWithPassword({ email: body.email, password: body.password });    if (error) throw new Error(error.message === "Invalid login credentials" ? "Invalid email or password" : error.message);    _authUser = data.user;    const profile = await rpc("get_profile", {});    _isAdmin = !!profile.is_admin;    return { token: data.user.id, user: profile };  }  if (path === "/auth/logout") { await sb.auth.signOut(); _authUser = null; _isAdmin = false; return { ok:true }; }  if (path === "/dashboard") {    const r = await rpc("get_dashboard", {});    _isAdmin = !!r.isAdmin;    return r;  }  if (path === "/profile" && method === "POST") {    const profile = await rpc("update_profile", { p_name: body.name ?? null, p_username: body.username ?? null,      p_phone: body.phone ?? null, p_payment_method: body.payment_method ?? null,      p_payment_account_number: body.payment_account_number ?? null, p_payment_account_title: body.payment_account_title ?? null });    return { profile };  }  if (path === "/notifications") return await rpc("get_notifications", {});  if (path === "/notifications/seen" && method === "POST") return await rpc("mark_notifications_seen", {});  if (path === "/invite") return await rpc("get_invite", {});  if (path === "/invite/claim" && method === "POST") return await rpc("claim_referral_bonus", {});  if (path === "/tasks" && method === "GET") return await rpc("list_tasks", {});  if (path === "/tasks" && method === "POST") {    const files = form ? form.getAll("screenshots") : [];    const screenshots = await uploadAllToCloudinary(files);    return await rpc("create_task", { p_title: body.title, p_description: body.description || "",      p_link: body.link || "", p_reward: Number(body.reward), p_total_slots: Number(body.total_slots),      p_min_vip_level: Number(body.min_vip_level)||0, p_screenshots: screenshots });  }  if (path.match(/^\/tasks\/[^/]+\/start$/) && method === "POST") {    const taskId = path.split("/")[2];    return await rpc("start_task", { p_task_id: taskId });  }  if (path.startsWith("/tasks/") && path.endsWith("/proof") && method === "POST") {    const taskId = path.split("/")[2];    const files = form ? form.getAll("proof") : [];    if (!files.length) throw new Error("Please choose at least one screenshot");    const urls = await uploadAllToCloudinary(files);    return await rpc("submit_proof", { p_task_id: taskId, p_proof_urls: urls });  }  if (path === "/proofs") return await rpc("get_my_proofs", {});  if (path === "/manage") return await rpc("get_manage", {});  if (path.match(/^\/proofs\/.+\/review$/) && method === "POST") {    const id = path.split("/")[2];    return await rpc("review_proof", { p_proof_id: id, p_approve: !!body.approve });  }  if (path.match(/^\/tasks\/[^/]+$/) && method === "GET") {    const id = path.split("/")[2];    return await rpc("get_task", { p_task_id: id });  }  if (path === "/deposit" && method === "POST") {    const files = form ? form.getAll("screenshot") : [];    if (!files.length || !files[0].size) throw new Error("Deposit screenshot is required");    const screenshotUrl = await uploadToCloudinary(files[0]);    return await rpc("make_deposit", { p_amount: Number(body.amount), p_method: body.method,      p_sender_account: body.sender_account, p_txn_ref: body.txn_ref, p_screenshot_url: screenshotUrl });  }  if (path === "/withdraw" && method === "POST") {    return await rpc("make_withdrawal", { p_amount: Number(body.amount), p_method: body.method, p_account_number: body.account_number });  }  if (path === "/vip") return { plans: VIP_PLANS };  if (path === "/vip/buy" && method === "POST") return await rpc("vip_buy", { p_level: Number(body.level) });  if (path === "/spin" && method === "POST") return await rpc("do_spin", {});  if (path === "/streak" && method === "POST") return await rpc("do_streak", {});  if (path === "/coupon" && method === "POST") return await rpc("redeem_coupon", { p_code: body.code });  if (path === "/admin/overview") return await rpc("admin_overview", {});  if (path === "/admin/usage") return await rpc("get_usage_overview", { p_days: (body && body.days) || 7 });  if (path === "/admin/usage-users") return await rpc("get_user_usage_list", { p_days: (body && body.days) || 30 });  if (path === "/admin/fraud-watch") return await rpc("get_flagged_signups", {});  if (path === "/auth/fraud-check" && method === "POST") return await rpc("log_signup_fraud_check", { p_ip: body.ip || null, p_device_fp: body.device_fp || null, p_is_vpn: !!body.is_vpn });  if (path === "/public/broadcast") return await rpc("get_active_broadcast", {});  if (path === "/admin/broadcast-info") return await rpc("admin_get_broadcast", {});  if (path === "/admin/broadcast" && method === "POST") return await rpc("admin_set_broadcast", { p_active: !!body.on, p_title: body.title || "", p_message: body.message || "" });  if (path === "/admin/users") return await rpc("admin_users", {});  if (path.match(/^\/admin\/user\/.+\/earnings$/)) {    const id = path.split("/")[3];    return await rpc("admin_user_earnings", { p_target_id: id });  }  if (path.match(/^\/admin\/user\/.+\/block$/) && method === "POST") {    const id = path.split("/")[3];    return await rpc("admin_block_user", { p_target_id: id, p_block: !!body.block });  }  if (path === "/admin/tasks") return await rpc("admin_tasks", {});  if (path === "/admin/proofs") return await rpc("admin_proofs", {});  if (path === "/admin/deposits") return await rpc("admin_deposits", {});  if (path === "/admin/withdrawals") return await rpc("admin_withdrawals", {});  if (path.match(/^\/admin\/deposit\/.+\/review$/) && method === "POST") {    const id = path.split("/")[3];    return await rpc("admin_review_deposit", { p_deposit_id: id, p_approve: !!body.approve });  }  if (path.match(/^\/admin\/withdraw\/.+\/review$/) && method === "POST") {    const id = path.split("/")[3];    return await rpc("admin_review_withdrawal", { p_withdrawal_id: id, p_approve: !!body.approve });  }  if (path.match(/^\/admin\/proof\/.+\/review$/) && method === "POST") {    const id = path.split("/")[3];    return await rpc("admin_review_proof", { p_proof_id: id, p_approve: !!body.approve });  }  if (path.match(/^\/admin\/task\/.+\/toggle$/) && method === "POST") {    const id = path.split("/")[3];    return await rpc("admin_toggle_task", { p_task_id: id, p_active: !!body.active });  }  if (path.match(/^\/admin\/task\/.+\/edit$/) && method === "POST") {    const id = path.split("/")[3];    return await rpc("admin_update_task", { p_task_id: id, p_title: body.title, p_description: body.description || "", p_link: body.link || "", p_slots: Number(body.slots)||0, p_reward: Number(body.reward)||0, p_min_vip_level: Number(body.minvip)||0 });  }  if (path.match(/^\/admin\/task\/.+\/delete$/) && method === "POST") {    const id = path.split("/")[3];    return await rpc("admin_delete_task", { p_task_id: id });  }  if (path === "/admin/coupon" && method === "POST") {    return await rpc("admin_create_coupon", { p_code: body.code, p_amount: Number(body.amount), p_max_uses: Number(body.max_uses) });  }  if (path === "/admin/settings" && method === "GET") return await rpc("admin_get_settings", {});  if (path === "/admin/settings/deposit-account" && method === "POST") {    return await rpc("admin_add_deposit_account", { p_method: body.method, p_number: body.number, p_title: body.title });  }  if (path.match(/^\/admin\/settings\/deposit-account\/\d+$/) && method === "DELETE") {    const idx = Number(path.split("/")[4]);    return await rpc("admin_del_deposit_account", { p_idx: idx });  }  if (path === "/admin/settings/withdrawal-method" && method === "POST") {    return await rpc("admin_add_withdrawal_method", { p_name: body.name });  }  if (path.match(/^\/admin\/settings\/withdrawal-method\/\d+$/) && method === "DELETE") {    const idx = Number(path.split("/")[4]);    return await rpc("admin_del_withdrawal_method", { p_idx: idx });  }  if (path === "/admin/settings/task-approval" && method === "POST") {    return await rpc("admin_save_task_approval", { p_on: !!body.on, p_message: body.message ?? null });  }  if (path === "/admin/settings/maintenance" && method === "POST") {    return await rpc("admin_save_maintenance", { p_on: !!body.on, p_message: body.message ?? null });  }  if (path === "/admin/settings/support-url" && method === "POST") {    return await rpc("admin_save_support_url", { p_url: body.url });  }  throw new Error("Unknown endpoint: " + path);};
function adSlot(id){  return `<div class="soft center" style="margin:0 0 12px;padding:14px" data-ad-slot="${id}">    <div class="muted" style="font-size:10px;letter-spacing:.5px;margin-bottom:6px">ADVERTISEMENT</div>    <!-- TODO: paste ad network embed code here, e.g. Google AdSense <ins class="adsbygoogle"> tag -->    <div style="min-height:80px;display:flex;align-items:center;justify-content:center;border:1px dashed var(--border);border-radius:12px;color:var(--muted);font-size:12px">      Ad Banner (${id})    </div>  </div>`;}
/* ---- Appearance: dark mode + accent color, applied instantly + persisted ---- */
window.setTheme = function (t) {
  try { localStorage.setItem("epk_theme", t); document.documentElement.setAttribute("data-theme", t); } catch (e) {}
};
window.setAccent = function (a) {
  try { localStorage.setItem("epk_accent", a); document.documentElement.setAttribute("data-accent", a); } catch (e) {}
};
window.getTheme = function () { try { return localStorage.getItem("epk_theme") || "light"; } catch (e) { return "light"; } };
window.getAccent = function () { try { return localStorage.getItem("epk_accent") || "blue"; } catch (e) { return "blue"; } };

/* ---- Admin broadcast announcement: shows once as a popup labelled "Message from Administrator" ---- */
window.checkBroadcast = async function () {
  try {
    const data = await rpc("get_active_broadcast", {});
    if (!data || !data.active || !data.updated_at) return;
    const seen = localStorage.getItem("epk_bc_seen");
    if (data.updated_at === seen) return;
    const body = (data.title ? `<b>${data.title}</b><br><br>` : "") + (data.message || "");
    showWelcomePopup("📢 Message from Administrator", body);
    localStorage.setItem("epk_bc_seen", data.updated_at);
  } catch (e) {}
};

/* ---- Fraud detection helpers: device fingerprint + public IP (soft-flag system) ---- */
window.getDeviceFingerprint = function () {
  try {
    const parts = [
      navigator.userAgent, screen.width + "x" + screen.height, screen.colorDepth,
      Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.language,
      navigator.hardwareConcurrency || "", navigator.platform || ""
    ].join("|");
    let hash = 0;
    for (let i = 0; i < parts.length; i++) { hash = ((hash << 5) - hash + parts.charCodeAt(i)) | 0; }
    return "fp_" + Math.abs(hash).toString(36);
  } catch (e) { return "fp_unknown"; }
};
window.getPublicIp = async function () {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const j = await res.json();
    return j.ip || null;
  } catch (e) { return null; }
};
window.checkIsVpn = async function (ip) {
  try {
    if (!ip) return false;
    const res = await fetch("https://iplogs.com/v1/check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ip })
    });
    const j = await res.json();
    return j.verdict === "vpn_detected" || j.verdict === "vpn_likely" || !!j.is_vpn;
  } catch (e) { return false; } // service unreachable — never blocks registration, just skips the VPN flag
};

/* ---- Usage analytics: log each page/route view (fire-and-forget, never blocks the UI) ---- */
let _lastLogAt = 0, _lastLogPage = "";
window.logPageView = function (route) {
  try {
    const page = location.pathname.split("/").pop() + (route || "");
    const now = Date.now();
    // Skip if we just logged this exact page, or logged anything in the last 3s —
    // avoids firing a network request on every rapid tap/navigation.
    if (page === _lastLogPage && now - _lastLogAt < 8000) return;
    if (now - _lastLogAt < 1500) return;
    _lastLogAt = now; _lastLogPage = page;
    let sid = sessionStorage.getItem("epk_sid");
    if (!sid) { sid = "sid_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); sessionStorage.setItem("epk_sid", sid); }
    sb.rpc("log_page_view", { p_session_id: sid, p_page: page }).catch(() => {});
  } catch (e) {}
};

/* ---- PWA: register service worker once, from every page ---- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

/* ---- PWA: floating "Install App" button (Android/Chrome) ---- */
let _deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  _deferredInstallPrompt = e;
  showInstallButton();
});
window.addEventListener("appinstalled", () => {
  _deferredInstallPrompt = null;
  const btn = document.getElementById("pwaInstallBtn");
  if (btn) btn.remove();
});
function showInstallButton() {
  if (document.getElementById("pwaInstallBtn")) return;
  const btn = document.createElement("button");
  btn.id = "pwaInstallBtn";
  btn.textContent = "⬇️ Install App";
  btn.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:96px;z-index:120;background:#1d6cf5;color:#fff;border:none;border-radius:999px;padding:11px 20px;font-weight:700;font-size:13px;box-shadow:0 8px 24px rgba(29,108,245,.35);cursor:pointer";
  btn.onclick = async () => {
    if (!_deferredInstallPrompt) return;
    btn.remove();
    _deferredInstallPrompt.prompt();
    await _deferredInstallPrompt.userChoice;
    _deferredInstallPrompt = null;
  };
  document.body.appendChild(btn);
}
/* ---- shared maintenance check, used by every page's own tiny router ---- */
let _maintCache = null, _maintCacheAt = 0;
window.checkMaintenanceOk = async function (bypass) {
  let settings = null;
  const now = Date.now();
  if (_maintCache && now - _maintCacheAt < 60000) {
    settings = _maintCache;
  } else {
    try { settings = await api("/public/settings"); _maintCache = settings; _maintCacheAt = now; } catch (e) { settings = null; }
  }
  if (settings && settings.maintenanceMode && !isCurrentUserAdmin() && !bypass) {
    mount(`<div class="grad header-block center" style="padding:60px 24px;min-height:100vh">
      <div style="font-size:50px;margin-bottom:14px">🛠️</div>
      <h1 style="font-size:22px;margin-bottom:10px">We'll be right back!</h1>
      <p style="opacity:.9">${settings.maintenanceMessage||"We're doing some quick maintenance. Please check back soon!"}</p>
      <a href="auth.html#/login" style="display:inline-block;margin-top:22px;color:#fff;opacity:.8;font-size:13px;text-decoration:underline">Admin Login</a>
    </div>`);
    return false;
  }
  return true;
};
