// Dashbaord js file

import { supabase } from "./dataconnect.js";

// ── Auth guard ─────────────────────────────────────────────

const {
  data: { session },
} = await supabase.auth.getSession();
if (!session) {
  window.location.href = "/pages/auth.html?mode=login";
}

const user = session.user;

// ── Helpers ────────────────────────────────────────────────

function fmt(dateStr) {
  if (!dateStr) return "–";
  return new Date(dateStr).toLocaleString("en-JM", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function fmtDate(dateStr) {
  if (!dateStr) return "–";
  return new Date(dateStr).toLocaleDateString("en-JM", { dateStyle: "medium" });
}

function initials(name) {
  if (!name) return "–";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function showToast(msg, isError = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast toast--visible" + (isError ? " toast--error" : "");
  setTimeout(() => {
    t.className = "toast";
  }, 3500);
}

// ── Populate UI ────────────────────────────────────────────

const name = user.user_metadata?.name || user.email.split("@")[0];
const email = user.email;
const init = initials(name);

["sidebar-avatar", "topbar-avatar", "account-avatar"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.textContent = init;
});

document.getElementById("sidebar-name").textContent = name;
document.getElementById("sidebar-email").textContent = email;
document.getElementById("topbar-name").textContent = name;
document.getElementById("account-name").textContent = name;
document.getElementById("account-email").textContent = email;
document.getElementById("account-since").textContent =
  "Since " + fmtDate(user.created_at);

document.getElementById("stat-joined").textContent = fmtDate(user.created_at);
document.getElementById("stat-last-login").textContent = fmt(
  user.last_sign_in_at,
);
document.getElementById("stat-status").textContent = user.confirmed_at
  ? "Confirmed"
  : "Pending";

supabase
  .from("applications")
  .select("id", { count: "exact", head: true })
  .eq("user_id", user.id)
  .then(({ count }) => {
    document.getElementById("stat-apps").textContent = count ?? "0";
  });

// ── Activity log (persistent) ──────────────────────────────

const ICON_MAP = {
  "Signed In": "↗",
  "Signed Out": "↙",
  "Account Created": "★",
  "Email Confirmed": "✓",
  "Password Changed": "⟳",
  "Profile Updated": "✎",
  "Application Submitted": "📄",
  "Renewal Submitted": "🔄",
};

const activityList = document.getElementById("activity-list");
const notifList = document.getElementById("notif-list");
let unread = 0;

// Render a single entry into both the activity list and notification list
function renderEntry(entry, isNew = false) {
  activityList.querySelector(".activity-list__empty")?.remove();
  notifList.querySelector(".notif-list__empty")?.remove();

  const icon = ICON_MAP[entry.label] ?? "·";

  const li = document.createElement("li");
  li.innerHTML = `
    <div class="activity-icon">${icon}</div>
    <div class="activity-body">
      <strong>${entry.label}</strong>
      <span class="activity-time">${fmt(entry.created_at)}</span>
    </div>
  `;
  activityList.prepend(li);

  const ni = document.createElement("li");
  if (isNew) ni.classList.add("notif-item--new");
  ni.innerHTML = `${entry.label}<span class="notif-item__time">${fmt(entry.created_at)}</span>`;
  notifList.prepend(ni);

  if (isNew) {
    unread++;
    updateBadges();
    showToast(entry.label);
  }
}

// Write a new event to Supabase then render it
async function logEvent(label) {
  const { data, error } = await supabase
    .from("activity_log")
    .insert({ user_id: user.id, label, icon: ICON_MAP[label] ?? "·" })
    .select()
    .single();

  if (!error && data) renderEntry(data, true);
}

// Load all past entries from Supabase on page load
async function loadLog() {
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data?.length) return;

  activityList.innerHTML = "";
  notifList.innerHTML = "";

  // Render oldest first so prepend builds the list correctly
  [...data].reverse().forEach((entry) => renderEntry(entry, false));
}

function updateBadges() {
  ["bell-badge", "sidebar-badge"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = unread;
    el.dataset.count = unread;
    el.style.display = unread > 0 ? "" : "none";
  });
}

// Load existing history first
await loadLog();

// ── Log sign-in once per browser session ──────────────────
// sessionStorage is cleared when the tab/browser closes.
// This prevents tab switches and token refreshes from
// adding duplicate "Signed In" entries.

const SESSION_KEY = `signed_in_logged_${user.id}`;
if (!sessionStorage.getItem(SESSION_KEY)) {
  sessionStorage.setItem(SESSION_KEY, "1");
  await logEvent("Signed In");
}

// ── Seed one-time account events ──────────────────────────
// Only insert "Account Created" / "Email Confirmed" if they
// don't already exist in the log for this user.

const { count: createdCount } = await supabase
  .from("activity_log")
  .select("id", { count: "exact", head: true })
  .eq("user_id", user.id)
  .eq("label", "Account Created");

if (createdCount === 0 && user.created_at) {
  await supabase.from("activity_log").insert({
    user_id: user.id,
    label: "Account Created",
    icon: "★",
    created_at: user.created_at,
  });
}

const { count: confirmedCount } = await supabase
  .from("activity_log")
  .select("id", { count: "exact", head: true })
  .eq("user_id", user.id)
  .eq("label", "Email Confirmed");

if (confirmedCount === 0 && user.email_confirmed_at) {
  await supabase.from("activity_log").insert({
    user_id: user.id,
    label: "Email Confirmed",
    icon: "✓",
    created_at: user.email_confirmed_at,
  });
}

// Reload after seeding so new entries appear
await loadLog();

// ── Live auth state listener ───────────────────────────────
// TOKEN_REFRESHED  → fires on every tab switch, skip it
// SIGNED_IN        → fires on page load, skip it (handled above)
// INITIAL_SESSION  → fires on page load, skip it

const IGNORED_EVENTS = new Set([
  "INITIAL_SESSION",
  "TOKEN_REFRESHED",
  "SIGNED_IN",
]);

const EVENT_LABEL_MAP = {
  SIGNED_OUT: "Signed Out",
  PASSWORD_RECOVERY: "Password Changed",
  USER_UPDATED: "Profile Updated",
};

supabase.auth.onAuthStateChange(async (event) => {
  if (IGNORED_EVENTS.has(event)) return;
  const label = EVENT_LABEL_MAP[event];
  if (label) await logEvent(label);
});

// ── Notification drawer ────────────────────────────────────

const drawer = document.getElementById("notif-drawer");
const overlay = document.getElementById("notif-overlay");
const bellBtn = document.getElementById("bell-btn");
const notifTrigger = document.getElementById("notif-trigger");
const notifClose = document.getElementById("notif-close");

function openDrawer() {
  drawer.classList.add("open");
  overlay.classList.add("open");
  unread = 0;
  updateBadges();
  notifList
    .querySelectorAll(".notif-item--new")
    .forEach((el) => el.classList.remove("notif-item--new"));
}

function closeDrawer() {
  drawer.classList.remove("open");
  overlay.classList.remove("open");
}

bellBtn?.addEventListener("click", openDrawer);
notifTrigger?.addEventListener("click", (e) => {
  e.preventDefault();
  openDrawer();
});
notifClose?.addEventListener("click", closeDrawer);
overlay?.addEventListener("click", closeDrawer);

// Clear only clears the UI — comment in the delete line to also wipe from Supabase
document.getElementById("clear-log")?.addEventListener("click", async () => {
  // await supabase.from("activity_log").delete().eq("user_id", user.id);
  activityList.innerHTML =
    '<li class="activity-list__empty">No recent activity</li>';
  notifList.innerHTML = '<li class="notif-list__empty">No notifications</li>';
  unread = 0;
  updateBadges();
});

// ── Sign out ───────────────────────────────────────────────

document.getElementById("signout-btn")?.addEventListener("click", async () => {
  await logEvent("Signed Out");
  await supabase.auth.signOut();
  window.location.href = "/pages/auth.html?mode=login";
});
