// auth.js — Login / Register page
// Handles: panel slide toggle, role selector, form submit, toast
import { supabase } from "./dataconnect.js";

// ── Theme toggle icon ──────────────────────────────────────
(function syncThemeBtn() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  function update() {
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    btn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    btn.textContent = isDark ? "☀" : "☾";
  }
  update();
  new MutationObserver(update).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
})();

// ── Panel / form toggle ────────────────────────────────────
const card         = document.getElementById("card");
const msgRegister  = document.getElementById("msg-register");
const msgLogin     = document.getElementById("msg-login");
const formRegister = document.getElementById("form-register");
const formLogin    = document.getElementById("form-login");

function showLogin() {
  card.classList.add("is-login");
  msgRegister.classList.add("panel-msg--hidden");
  msgLogin.classList.remove("panel-msg--hidden");
  formRegister.classList.add("form-wrap--hidden");
  formLogin.classList.remove("form-wrap--hidden");
  clearErrs(["err-login-email", "err-login-pass", "err-login-admin-id"]);
}

function showRegister() {
  card.classList.remove("is-login");
  msgLogin.classList.add("panel-msg--hidden");
  msgRegister.classList.remove("panel-msg--hidden");
  formLogin.classList.add("form-wrap--hidden");
  formRegister.classList.remove("form-wrap--hidden");
  const adminIdDisplay = document.getElementById("admin-id-display");
  if (adminIdDisplay) adminIdDisplay.style.display = "none";
  updateStrengthBar(""); // reset strength bar when switching back
  clearErrs([
    "err-reg-name", "err-reg-email", "err-reg-pass", "err-reg-confirm",
    "err-reg-trn", "err-reg-department", "err-reg-job-title", "err-reg-work-phone",
  ]);
}

document.getElementById("go-login")?.addEventListener("click", showLogin);
document.getElementById("go-register")?.addEventListener("click", showRegister);

// ── Register Role Selector ─────────────────────────────────
const adminSection = document.getElementById("admin-section");
document.querySelectorAll('#form-register input[name="role"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    const isAdmin = radio.value === "admin" && radio.checked;
    adminSection?.classList.toggle("admin-section--expanded", isAdmin);
    if (!isAdmin) {
      clearErrs([
        "err-reg-trn", "err-reg-department", "err-reg-job-title", "err-reg-work-phone",
      ]);
    }
  });
});

function getSelectedRole() {
  return document.querySelector('#form-register input[name="role"]:checked')?.value ?? "citizen";
}

// ── Login Role Selector ────────────────────────────────────
const citizenLoginFields = document.getElementById("citizen-login-fields");
const adminLoginFields   = document.getElementById("admin-login-fields");

document.querySelectorAll('#form-login input[name="login-role"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    const isAdmin = radio.value === "admin" && radio.checked;
    if (isAdmin) {
      citizenLoginFields.style.display = "none";
      adminLoginFields.style.display   = "block";
      setErr("err-login-email", "");
    } else {
      citizenLoginFields.style.display = "block";
      adminLoginFields.style.display   = "none";
      setErr("err-login-admin-id", "");
    }
  });
});

// ── Toast ──────────────────────────────────────────────────
function showToast(msg, isError = false) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className = "toast toast--visible" + (isError ? " toast--error" : "");
  setTimeout(() => { t.className = "toast"; }, 3500);
}

// ── Field error helpers ────────────────────────────────────
// FIXED: select queried before input so department border highlight works
function setErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  const field = el.closest(".field");
  const input = field?.querySelector("select") ?? field?.querySelector("input");
  if (input) input.style.borderColor = msg ? "var(--error)" : "";
}

function clearErrs(ids) {
  ids.forEach((id) => setErr(id, ""));
}

// ── Button loading state ───────────────────────────────────
function setBtnLoading(id, loading, label) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled    = loading;
  btn.textContent = loading ? "Please wait…" : label;
}

// ── Password strength ──────────────────────────────────────
const STRENGTH_COLORS = ["", "#e8504a", "#f0a500", "#4a90d9", "var(--accent)"];
const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];

function getStrengthScore(pw) {
  let score = 0;
  if (pw.length >= 8)           score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[0-9]/.test(pw))        score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

function updateStrengthBar(pw) {
  const score = pw ? getStrengthScore(pw) : 0;
  for (let i = 1; i <= 4; i++) {
    const seg = document.getElementById(`reg-seg-${i}`);
    if (seg) seg.style.backgroundColor = i <= score ? STRENGTH_COLORS[score] : "";
  }
  const label = document.getElementById("reg-strength-label");
  if (label) {
    label.textContent = pw ? STRENGTH_LABELS[score] : "";
    label.style.color = STRENGTH_COLORS[score];
  }
}

document.getElementById("reg-pass")?.addEventListener("input", (e) => {
  updateStrengthBar(e.target.value);
  setErr("err-reg-pass", "");
});

// ── Helper: Generate Unique Admin ID ───────────────────────
function generateAdminID() {
  const randomPart  = Math.random().toString(36).substring(2, 6).toUpperCase();
  const randomPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ADM-${randomPart}-${randomPart2}`;
}

// ── Register submit ────────────────────────────────────────
document.getElementById("form-register")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const role    = getSelectedRole();
  const name    = document.getElementById("reg-name")?.value.trim();
  const email   = document.getElementById("reg-email")?.value.trim();
  const pass    = document.getElementById("reg-pass")?.value;
  const confirm = document.getElementById("reg-confirm")?.value;

  // Admin-only fields
  const trn        = document.getElementById("reg-trn")?.value.trim();
  const department = document.getElementById("reg-department")?.value;
  const jobTitle   = document.getElementById("reg-job-title")?.value.trim();
  const workPhone  = document.getElementById("reg-work-phone")?.value.trim();

  let ok = true;

  // ── Common validation ──
  if (!name)  { setErr("err-reg-name",  "Full name is required.");  ok = false; }
  else          setErr("err-reg-name",  "");

  if (!email) { setErr("err-reg-email", "Email is required.");       ok = false; }
  else          setErr("err-reg-email", "");

  if (!pass || pass.length < 8) {
    setErr("err-reg-pass", "Password must be at least 8 characters."); ok = false;
  } else {
    setErr("err-reg-pass", "");
  }

  // FIXED: confirm error only clears when pass is also valid
  if (!confirm) {
    setErr("err-reg-confirm", "Please confirm your password.");      ok = false;
  } else if (pass && pass !== confirm) {
    setErr("err-reg-confirm", "Passwords do not match.");            ok = false;
  } else {
    setErr("err-reg-confirm", "");
  }

  // ── Admin-only validation ──
  if (role === "admin") {
    if (!trn)        { setErr("err-reg-trn",        "TRN is required.");               ok = false; }
    else               setErr("err-reg-trn",        "");

    if (!department) { setErr("err-reg-department", "Please select a department.");    ok = false; }
    else               setErr("err-reg-department", "");

    if (!jobTitle)   { setErr("err-reg-job-title",  "Job title is required.");         ok = false; }
    else               setErr("err-reg-job-title",  "");

    if (!workPhone)  { setErr("err-reg-work-phone", "Work phone is required.");        ok = false; }
    else               setErr("err-reg-work-phone", "");
  }

  if (!ok) return;

  setBtnLoading("signup-btn", true, "Sign Up");

  // ── Supabase Auth sign-up ──
  const { data, error } = await supabase.auth.signUp({ email, password: pass });

  if (error) {
    setBtnLoading("signup-btn", false, "Sign Up");
    showToast(error.message, true);
    return;
  }

  // ── Insert profile row ──
  if (data?.user) {
    let adminId = null;
    if (role === "admin") {
      adminId = generateAdminID();
    }

    const profileRow = {
      id:            data.user.id,
      auth_id:       data.user.id,
      full_name:     name,
      email,
      role,
      status:        role === "admin" ? "pending" : "active",
      date_of_birth: null,
      admin_id:      adminId,
    };

    if (role === "admin") {
      Object.assign(profileRow, {
        TRN:       trn,
        department,
        job_title: jobTitle,
        phone:     workPhone,
      });
    }

    const { error: insertError } = await supabase.from("users").insert(profileRow);

    if (insertError) {
      setBtnLoading("signup-btn", false, "Sign Up");
      showToast("Database Error: " + insertError.message, true);
      console.error("Insert failed:", insertError);
      return;
    }

    // If Admin, show generated ID and lock form
    if (role === "admin" && adminId) {
      const idDisplay = document.getElementById("admin-id-display");
      const idInput   = document.getElementById("generated-admin-id");
      idInput.value         = adminId;
      idDisplay.style.display = "block";

      setBtnLoading("signup-btn", false, "Sign Up");
      showToast("Account created! Save your Admin ID.", false);

      const signupBtn = document.getElementById("signup-btn");
      signupBtn.disabled    = true;
      signupBtn.textContent = "Saved? Go to Login";
      signupBtn.onclick     = showLogin;
      return;
    }
  } else {
    setBtnLoading("signup-btn", false, "Sign Up");
    showToast("User creation failed.", true);
    return;
  }

  setBtnLoading("signup-btn", false, "Sign Up");
  const successMsg = role === "admin"
    ? "Account created! An administrator will review and approve your access."
    : "Account created! Check your email to confirm.";
  showToast(successMsg);

  if (role === "citizen") {
    setTimeout(showLogin, 2000);
  }
});

// ── Login submit ───────────────────────────────────────────
document.getElementById("form-login")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const loginRole = document.querySelector('#form-login input[name="login-role"]:checked')?.value ?? "citizen";
  const pass      = document.getElementById("login-pass")?.value;

  let ok      = true;
  let email   = null;
  let adminId = null;

  if (loginRole === "citizen") {
    email = document.getElementById("login-email")?.value.trim();
    if (!email) { setErr("err-login-email",    "Email is required.");    ok = false; }
    else          setErr("err-login-email",    "");
  } else {
    adminId = document.getElementById("login-admin-id")?.value.trim();
    if (!adminId) { setErr("err-login-admin-id", "Admin ID is required."); ok = false; }
    else            setErr("err-login-admin-id", "");
  }

  if (!pass) { setErr("err-login-pass", "Password is required."); ok = false; }
  else         setErr("err-login-pass", "");

  if (!ok) return;

  setBtnLoading("signin-btn", true, "Sign In");

  try {
    if (loginRole === "admin") {
      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("email, status")
        .eq("admin_id", adminId)
        .single();

      if (fetchError || !userData) throw new Error("Invalid Admin ID.");
      if (userData.status === "pending") throw new Error("Your admin account is pending approval.");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email:    userData.email,
        password: pass,
      });
      if (signInError) throw signInError;

    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (signInError) throw signInError;
    }

    window.location.href = "/pages/dashboard.html";

  } catch (err) {
    setBtnLoading("signin-btn", false, "Sign In");
    showToast(err.message, true);
  }
});
