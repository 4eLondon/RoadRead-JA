// dashboard.js — Road Ready JA Citizen Profile
import { supabase } from "./dataconnect.js";

// ── Auth guard ─────────────────────────────────────────────
const { data: { session } } = await supabase.auth.getSession();
if (!session) window.location.href = "/pages/auth.html?mode=login";

const user = session.user;

// ── Fetch profile from users table ────────────────────────
const { data: profile, error: profileError } = await supabase
  .from("users")
  .select("*")
  .eq("auth_id", user.id)
  .single();

if (profileError) console.warn("Profile fetch error:", profileError.message);

// ── Helpers ────────────────────────────────────────────────
function fmt(dateStr) {
  if (!dateStr) return "–";
  return new Date(dateStr).toLocaleString("en-JM", { dateStyle: "medium", timeStyle: "short" });
}
function fmtDate(dateStr) {
  if (!dateStr) return "–";
  return new Date(dateStr).toLocaleDateString("en-JM", { dateStyle: "medium" });
}
function initials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}
function showToast(msg, isError = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast toast--visible" + (isError ? " toast--error" : "");
  setTimeout(() => { t.className = "toast"; }, 3500);
}
function setHint(id, msg, isError = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? "var(--error)" : "var(--success)";
}

// ── Populate UI from users table + auth ───────────────────
const name  = profile?.full_name || user.user_metadata?.name || user.email.split("@")[0];
const email = profile?.email     || user.email;
const role  = profile?.role      || "citizen";
const init  = initials(name);

// Avatars
["sidebar-avatar", "topbar-avatar", "hero-avatar"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.textContent = init;
});

// Sidebar + topbar
document.getElementById("sidebar-name").textContent  = name;
document.getElementById("sidebar-email").textContent = email;
document.getElementById("topbar-name").textContent   = name;

// Hero block
document.getElementById("hero-name").textContent  = name;
document.getElementById("hero-email").textContent = email;
document.getElementById("hero-since").textContent = fmtDate(user.created_at);

// Role chip
const roleChipEl = document.querySelector(".chip.citizen");
if (roleChipEl && role) {
  roleChipEl.textContent = role.charAt(0).toUpperCase() + role.slice(1);
  roleChipEl.className = `chip ${role}`;
}

// Status badge
const statusBadge   = document.getElementById("hero-status-badge");
const accountStatus = profile?.status || (user.confirmed_at ? "active" : "pending");
if (accountStatus !== "active") {
  statusBadge.textContent = accountStatus.charAt(0).toUpperCase() + accountStatus.slice(1);
  statusBadge.style.cssText = "background:rgba(224,85,85,0.15);color:var(--error);border-color:rgba(224,85,85,0.3);";
}

// Stat cards
document.getElementById("stat-joined").textContent     = fmtDate(user.created_at);
document.getElementById("stat-last-login").textContent = fmt(user.last_sign_in_at);
document.getElementById("stat-status").textContent     = accountStatus.charAt(0).toUpperCase() + accountStatus.slice(1);

supabase
  .from("applications")
  .select("id", { count: "exact", head: true })
  .eq("user_id", user.id)
  .then(({ count }) => {
    document.getElementById("stat-apps").textContent = count ?? "0";
  });

// Account info panel — from users table where available, auth as fallback
document.getElementById("info-name").textContent     = name;
document.getElementById("info-email").textContent    = email;
document.getElementById("info-uid").textContent      = user.id;
document.getElementById("info-verified").textContent = user.confirmed_at ? "Yes ✓" : "No — check your inbox";
document.getElementById("info-created").textContent  = fmt(user.created_at);
document.getElementById("info-last").textContent     = fmt(user.last_sign_in_at);

// Pre-fill email field
const currentEmailDisplay = document.getElementById("current-email-display");
if (currentEmailDisplay) currentEmailDisplay.value = email;

// ── Activity log ───────────────────────────────────────────
const ICON_MAP = {
  "Signed In":             "↗",
  "Signed Out":            "↙",
  "Account Created":       "★",
  "Email Confirmed":       "✓",
  "Password Changed":      "⟳",
  "Email Changed":         "✉",
  "Application Submitted": "📄",
  "Renewal Submitted":     "🔄",
};

const activityList = document.getElementById("activity-list");

function renderEntry(entry) {
  activityList.querySelector(".activity-list__empty")?.remove();
  const icon = ICON_MAP[entry.label] ?? "·";
  const li = document.createElement("li");
  li.innerHTML = `
    <div class="activity-icon">${icon}</div>
    <div class="activity-body">
      <strong>${entry.label}</strong>
      <span class="activity-time">${fmt(entry.created_at)}</span>
    </div>`;
  activityList.prepend(li);
}

async function logEvent(label) {
  const { data, error } = await supabase
    .from("activity_log")
    .insert({ user_id: user.id, label, icon: ICON_MAP[label] ?? "·" })
    .select()
    .single();
  if (!error && data) renderEntry(data);
}

async function loadLog() {
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data?.length) return;
  activityList.innerHTML = "";
  [...data].reverse().forEach(renderEntry);
}

await loadLog();

// ── Log sign-in once per browser session ──────────────────
const SESSION_KEY = `signed_in_logged_${user.id}`;
if (!sessionStorage.getItem(SESSION_KEY)) {
  sessionStorage.setItem(SESSION_KEY, "1");
  await logEvent("Signed In");
}

// ── Seed one-time account events ──────────────────────────
const { count: createdCount } = await supabase
  .from("activity_log")
  .select("id", { count: "exact", head: true })
  .eq("user_id", user.id)
  .eq("label", "Account Created");

if (createdCount === 0 && user.created_at) {
  await supabase.from("activity_log").insert({
    user_id: user.id, label: "Account Created", icon: "★", created_at: user.created_at,
  });
}

const { count: confirmedCount } = await supabase
  .from("activity_log")
  .select("id", { count: "exact", head: true })
  .eq("user_id", user.id)
  .eq("label", "Email Confirmed");

if (confirmedCount === 0 && user.email_confirmed_at) {
  await supabase.from("activity_log").insert({
    user_id: user.id, label: "Email Confirmed", icon: "✓", created_at: user.email_confirmed_at,
  });
}

await loadLog();

// ── Clear log ──────────────────────────────────────────────
document.getElementById("clear-log")?.addEventListener("click", () => {
  activityList.innerHTML = '<li class="activity-list__empty">No recent activity</li>';
});

// ── Auth state listener ────────────────────────────────────
const IGNORED = new Set(["INITIAL_SESSION", "TOKEN_REFRESHED", "SIGNED_IN"]);
supabase.auth.onAuthStateChange(async (event) => {
  if (IGNORED.has(event)) return;
  if (event === "SIGNED_OUT") window.location.href = "/pages/auth.html?mode=login";
});

// ── Update Email ───────────────────────────────────────────
// Updates BOTH supabase auth AND the users table
document.getElementById("update-email-btn")?.addEventListener("click", async () => {
  const newEmail = document.getElementById("new-email").value.trim();

  if (!newEmail)          return setHint("email-hint", "Please enter a new email address.", true);
  if (newEmail === email)  return setHint("email-hint", "That is already your current email.", true);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail))
                           return setHint("email-hint", "Please enter a valid email address.", true);

  const btn = document.getElementById("update-email-btn");
  btn.disabled = true;
  btn.textContent = "Updating…";

  // 1. Update supabase auth (sends confirmation to new address)
  const { error: authError } = await supabase.auth.updateUser({ email: newEmail });

  if (authError) {
    btn.disabled = false;
    btn.textContent = "Update Email";
    setHint("email-hint", authError.message, true);
    showToast("Failed to update email.", true);
    return;
  }

  // 2. Sync new email into the users table immediately
  const { error: dbError } = await supabase
    .from("users")
    .update({ email: newEmail })
    .eq("auth_id", user.id);

  btn.disabled = false;
  btn.textContent = "Update Email";

  if (dbError) {
    setHint("email-hint", "Auth updated but DB sync failed: " + dbError.message, true);
  } else {
    setHint("email-hint", `Confirmation sent to ${newEmail}. Check your inbox.`);
    showToast("Confirmation email sent!");
    await logEvent("Email Changed");
    document.getElementById("new-email").value                = "";
    document.getElementById("current-email-display").value   = newEmail;
    document.getElementById("info-email").textContent        = newEmail;
    document.getElementById("hero-email").textContent        = newEmail;
    document.getElementById("sidebar-email").textContent     = newEmail;
  }
});

// ── Password strength bar ──────────────────────────────────
function checkStrength(pw) {
  let score = 0;
  if (pw.length >= 8)           score++;
  if (pw.length >= 12)          score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[0-9]/.test(pw))        score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

document.getElementById("new-password")?.addEventListener("input", (e) => {
  const pw    = e.target.value;
  const fill  = document.getElementById("pw-strength-fill");
  const label = document.getElementById("pw-strength-label");
  if (!pw) { fill.style.width = "0"; fill.style.background = ""; label.textContent = ""; return; }
  const levels = [
    { pct: "20%",  color: "var(--error)",   text: "Weak" },
    { pct: "40%",  color: "var(--error)",   text: "Fair" },
    { pct: "60%",  color: "var(--accent)",  text: "Moderate" },
    { pct: "80%",  color: "var(--success)", text: "Strong" },
    { pct: "100%", color: "var(--success)", text: "Very Strong" },
  ];
  const lvl = levels[Math.min(checkStrength(pw) - 1, 4)] ?? levels[0];
  fill.style.width      = lvl.pct;
  fill.style.background = lvl.color;
  label.textContent     = lvl.text;
  label.style.color     = lvl.color;
});

// ── Toggle password visibility ─────────────────────────────
["pw-toggle-1", "pw-toggle-2"].forEach((id, i) => {
  const btn   = document.getElementById(id);
  const input = document.getElementById(i === 0 ? "new-password" : "confirm-password");
  btn?.addEventListener("click", () => {
    input.type = input.type === "password" ? "text" : "password";
  });
});

// ── Update Password ────────────────────────────────────────
// Password lives in supabase auth only — no users table update needed
document.getElementById("update-password-btn")?.addEventListener("click", async () => {
  const pw1 = document.getElementById("new-password").value;
  const pw2 = document.getElementById("confirm-password").value;

  if (!pw1)           return setHint("password-hint", "Please enter a new password.", true);
  if (pw1.length < 8) return setHint("password-hint", "Password must be at least 8 characters.", true);
  if (pw1 !== pw2)    return setHint("password-hint", "Passwords do not match.", true);

  const btn = document.getElementById("update-password-btn");
  btn.disabled = true;
  btn.textContent = "Updating…";

  const { error } = await supabase.auth.updateUser({ password: pw1 });

  btn.disabled = false;
  btn.textContent = "Update Password";

  if (error) {
    setHint("password-hint", error.message, true);
    showToast("Failed to update password.", true);
  } else {
    setHint("password-hint", "Password updated successfully.");
    showToast("Password updated!");
    await logEvent("Password Changed");
    document.getElementById("new-password").value            = "";
    document.getElementById("confirm-password").value        = "";
    document.getElementById("pw-strength-fill").style.width  = "0";
    document.getElementById("pw-strength-label").textContent = "";
  }
});

// ── Sign out ───────────────────────────────────────────────
async function doSignOut() {
  await logEvent("Signed Out");
  await supabase.auth.signOut();
  window.location.href = "/pages/auth.html?mode=login";
}

document.getElementById("signout-btn")?.addEventListener("click", doSignOut);
document.getElementById("signout-btn-2")?.addEventListener("click", doSignOut);
