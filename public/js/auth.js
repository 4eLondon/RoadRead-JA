// auth.js — Login / Register page
// Handles: panel slide toggle, form submit stubs, toast

import { supabase } from "./dataconnect.js";

// ── Theme toggle icon ──────────────────────────────────────
// theme.js sets data-theme; we just keep the button label in sync.
(function syncThemeBtn() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  function update() {
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    btn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    btn.textContent = isDark ? "☀" : "☾";
  }
  update();
  // Re-sync whenever theme.js toggles the attribute
  new MutationObserver(update).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
})();

// ── Panel / form toggle ────────────────────────────────────

const card        = document.getElementById("card");
const msgRegister = document.getElementById("msg-register");
const msgLogin    = document.getElementById("msg-login");
const formRegister = document.getElementById("form-register");
const formLogin    = document.getElementById("form-login");

function showLogin() {
  card.classList.add("is-login");
  msgRegister.classList.add("panel-msg--hidden");
  msgLogin.classList.remove("panel-msg--hidden");
  formRegister.classList.add("form-wrap--hidden");
  formLogin.classList.remove("form-wrap--hidden");
  clearErrs(["err-login-email", "err-login-pass"]);
}

function showRegister() {
  card.classList.remove("is-login");
  msgLogin.classList.add("panel-msg--hidden");
  msgRegister.classList.remove("panel-msg--hidden");
  formLogin.classList.add("form-wrap--hidden");
  formRegister.classList.remove("form-wrap--hidden");
  clearErrs(["err-reg-name", "err-reg-email", "err-reg-pass", "err-reg-confirm"]);
}

document.getElementById("go-login")?.addEventListener("click", showLogin);
document.getElementById("go-register")?.addEventListener("click", showRegister);

// ── Toast ──────────────────────────────────────────────────

function showToast(msg, isError = false) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className = "toast toast--visible" + (isError ? " toast--error" : " toast--success");
  setTimeout(() => { t.className = "toast"; }, 3500);
}

// ── Field error helpers ────────────────────────────────────

function setErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  const input = el.closest(".field")?.querySelector("input");
  if (input) input.style.borderColor = msg ? "var(--error)" : "";
}

function clearErrs(ids) {
  ids.forEach((id) => setErr(id, ""));
}

// ── Button loading state ───────────────────────────────────

function setBtnLoading(id, loading, label) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? "Please wait…" : label;
}

// ── Register submit ────────────────────────────────────────

document.getElementById("form-register")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name    = document.getElementById("reg-name")?.value.trim();
  const email   = document.getElementById("reg-email")?.value.trim();
  const pass    = document.getElementById("reg-pass")?.value;
  const confirm = document.getElementById("reg-confirm")?.value;

  let ok = true;

  if (!name)  { setErr("err-reg-name",  "Full name is required.");   ok = false; }
  else          setErr("err-reg-name",  "");

  if (!email) { setErr("err-reg-email", "Email is required.");        ok = false; }
  else          setErr("err-reg-email", "");

  if (!pass || pass.length < 8) {
    setErr("err-reg-pass", "Password must be at least 8 characters."); ok = false;
  } else setErr("err-reg-pass", "");

  if (pass && pass !== confirm) {
    setErr("err-reg-confirm", "Passwords do not match."); ok = false;
  } else setErr("err-reg-confirm", "");

  if (!ok) return;

  setBtnLoading("signup-btn", true, "Sign Up");

  // Supabase Auth sign-up
  const { data, error } = await supabase.auth.signUp({ email, password: pass });

  if (error) {
    setBtnLoading("signup-btn", false, "Sign Up");
    showToast(error.message, true);
    return;
  }

  // Insert profile row
  if (data?.user) {
    await supabase.from("users").insert({
      id:        data.user.id,
      full_name: name,
      email,
      role:      "citizen",
      status:    "active",
    });
  }

  setBtnLoading("signup-btn", false, "Sign Up");
  showToast("Account created! Check your email to confirm.");
});

// ── Login submit ───────────────────────────────────────────

document.getElementById("form-login")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("login-email")?.value.trim();
  const pass  = document.getElementById("login-pass")?.value;
  let ok = true;

  if (!email) { setErr("err-login-email", "Email is required.");    ok = false; }
  else          setErr("err-login-email", "");

  if (!pass)  { setErr("err-login-pass",  "Password is required."); ok = false; }
  else          setErr("err-login-pass", "");

  if (!ok) return;

  setBtnLoading("signin-btn", true, "Sign In");

  const { error } = await supabase.auth.signInWithPassword({ email, password: pass });

  setBtnLoading("signin-btn", false, "Sign In");

  if (error) {
    showToast(error.message, true);
    return;
  }

  // Redirect after login
  window.location.href = "/pages/dashboard.html";
});
