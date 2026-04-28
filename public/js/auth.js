// auth js file

import { supabase } from "./dataconnect.js";

// ── Elements ───────────────────────────────────────────────
const card = document.getElementById("card");
const msgRegister = document.getElementById("msg-register");
const msgLogin = document.getElementById("msg-login");
const formRegister = document.getElementById("form-register");
const formLogin = document.getElementById("form-login");
const goLoginBtn = document.getElementById("go-login");
const goRegBtn = document.getElementById("go-register");
const signupBtn = document.getElementById("signup-btn");

const regName = formRegister.querySelector('input[type="text"]');
const regEmail = formRegister.querySelector('input[type="email"]');
const regPassword = formRegister.querySelectorAll('input[type="password"]')[0];
const regConfirm = formRegister.querySelectorAll('input[type="password"]')[1];
const loginEmail = formLogin.querySelector('input[type="email"]');
const loginPassword = formLogin.querySelector('input[type="password"]');

// ── Panel slide helpers ────────────────────────────────────

function showLogin() {
  card.classList.add("is-login");
  msgRegister.classList.add("panel-msg--hidden");
  msgLogin.classList.remove("panel-msg--hidden");
  formRegister.classList.add("form-wrap--hidden");
  setTimeout(() => formLogin.classList.remove("form-wrap--hidden"), 120);
}

function showRegister() {
  card.classList.remove("is-login");
  msgLogin.classList.add("panel-msg--hidden");
  msgRegister.classList.remove("panel-msg--hidden");
  formLogin.classList.add("form-wrap--hidden");
  setTimeout(() => formRegister.classList.remove("form-wrap--hidden"), 120);
}

goLoginBtn.addEventListener("click", showLogin);
goRegBtn.addEventListener("click", showRegister);

if (new URLSearchParams(window.location.search).get("mode") === "login") {
  card.classList.add("is-login");
  msgRegister.classList.add("panel-msg--hidden");
  msgLogin.classList.remove("panel-msg--hidden");
  formRegister.classList.add("form-wrap--hidden");
  formLogin.classList.remove("form-wrap--hidden");
}

// ── Error helpers ──────────────────────────────────────────

function setError(input, message) {
  const existing = input.parentElement.querySelector(".field-error");
  if (existing) existing.remove();
  input.style.borderColor = message ? "var(--error)" : "";
  if (message) {
    const err = document.createElement("span");
    err.className = "field-error";
    err.textContent = message;
    input.parentElement.appendChild(err);
  }
}

function clearAllErrors() {
  document.querySelectorAll(".field-error").forEach((el) => el.remove());
  document
    .querySelectorAll(".field input")
    .forEach((el) => (el.style.borderColor = ""));
}

function setButtonLoading(btn, loading) {
  btn.disabled = loading;
  btn.textContent = loading ? "Please wait…" : btn.dataset.label;
}

function showToast(message, type = "success") {
  const existing = document.getElementById("toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.id = "toast";
  toast.textContent = message;
  toast.className = `toast toast--${type}`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast--visible"));
  setTimeout(() => {
    toast.classList.remove("toast--visible");
    toast.addEventListener("transitionend", () => toast.remove());
  }, 4000);
}

// ── Registration ───────────────────────────────────────────

signupBtn.dataset.label = signupBtn.textContent;

signupBtn.addEventListener("click", async () => {
  clearAllErrors();

  const name = regName.value.trim();
  const email = regEmail.value.trim();
  const password = regPassword.value;
  const confirm = regConfirm.value;

  let hasError = false;
  if (!name) {
    setError(regName, "Full name is required.");
    hasError = true;
  }
  if (!email) {
    setError(regEmail, "Email is required.");
    hasError = true;
  }
  if (!password) {
    setError(regPassword, "Password is required.");
    hasError = true;
  }
  if (password && password.length < 6) {
    setError(regPassword, "Minimum 6 characters.");
    hasError = true;
  }
  if (password && confirm && password !== confirm) {
    setError(regConfirm, "Passwords do not match.");
    hasError = true;
  }
  if (hasError) return;

  setButtonLoading(signupBtn, true);

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  setButtonLoading(signupBtn, false);

  if (authError) {
    const dup = authError.message.toLowerCase().includes("already registered");
    setError(
      regEmail,
      dup ? "An account with this email already exists." : authError.message,
    );
    return;
  }

  const userId = authData.user?.id;
  if (userId) await supabase.from("users").insert({ id: userId, name, email });

  showToast("Account created — you can now sign in.");
  showLogin();
});

[regName, regEmail, regPassword, regConfirm].forEach((input) => {
  input.addEventListener("input", () => setError(input, ""));
});

// ── Login ──────────────────────────────────────────────────

const signinBtn = formLogin.querySelector(".btn-main");
signinBtn.dataset.label = signinBtn.textContent;

signinBtn.addEventListener("click", async () => {
  clearAllErrors();

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email) {
    setError(loginEmail, "Email is required.");
    return;
  }
  if (!password) {
    setError(loginPassword, "Password is required.");
    return;
  }

  setButtonLoading(signinBtn, true);

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  setButtonLoading(signinBtn, false);

  if (error) {
    setError(loginPassword, "Incorrect email or password.");
    return;
  }

  showToast("Welcome back! Redirecting…");
  setTimeout(() => {
    window.location.href = "/pages/dashboard.html"; // ← fixed from /dashboard
  }, 1200);
});

[loginEmail, loginPassword].forEach((input) => {
  input.addEventListener("input", () => setError(input, ""));
});
