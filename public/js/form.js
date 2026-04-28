// form js file

import { supabase } from "./dataconnect.js";
// ── UUID generator ─────────────────────────────────────────

function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });
}

// ── Tab switcher ───────────────────────────────────────────
// Fade out current panel, then fade in the next one.

window.switchTab = function (type) {
  const tabs = ["apply", "renew", "signup"];
  tabs.forEach((t) => {
    document.getElementById("tab-" + t)?.classList.toggle("active", t === type);
    const panel = document.getElementById("form-" + t);
    if (!panel) return;
    if (t === type) {
      panel.classList.remove("hidden");
    } else {
      if (!panel.classList.contains("hidden")) {
        panel.classList.add("hiding");
        panel.addEventListener(
          "animationend",
          () => {
            panel.classList.add("hidden");
            panel.classList.remove("hiding");
          },
          { once: true }
        );
      }
    }
  });

  const titles = { apply: "New Application", renew: "Renew / Replace", signup: "Sign Up" };
  document.getElementById("page-title").textContent = titles[type] || "New Application";
  document.getElementById("success-panel").classList.add("hidden");
};

// Open on correct tab from URL: /apply?type=renew or ?type=signup
const urlType = new URLSearchParams(window.location.search).get("type");
if (urlType === "renew" || urlType === "signup") switchTab(urlType);

// ── Field error helpers ────────────────────────────────────

function setErr(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
  // Highlight the associated input/select
  const field = el?.closest(".fgroup");
  const input = field?.querySelector(".finput, .fselect");
  if (input) input.style.borderColor = msg ? "var(--error)" : "";
}

function clearErrs(ids) {
  ids.forEach((id) => setErr(id, ""));
}

function validate(rules) {
  let ok = true;
  for (const [id, errId, msg] of rules) {
    const el = document.getElementById(id);
    const val = el?.value?.trim();
    if (!val) {
      setErr(errId, msg);
      ok = false;
    } else setErr(errId, "");
  }
  return ok;
}

// ── Toast ──────────────────────────────────────────────────

function showToast(msg, isError = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast toast--visible" + (isError ? " toast--error" : "");
  setTimeout(() => {
    t.className = "toast";
  }, 3500);
}

// ── Button loading state ───────────────────────────────────

function setBtnLoading(id, loading, label) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? "Submitting…" : label;
}

// ── Show success panel ─────────────────────────────────────

function showSuccess(title, appId, userId) {
  document.getElementById("form-apply").classList.add("hidden");
  document.getElementById("form-renew").classList.add("hidden");

  const panel = document.getElementById("success-panel");
  panel.classList.remove("hidden");
  document.getElementById("success-title").textContent = title;
  document.getElementById("out-app-id").textContent = appId;
  document.getElementById("out-user-id").textContent = userId;
}

// ── APPLY form submit ──────────────────────────────────────

document.getElementById("form-apply").addEventListener("submit", async (e) => {
  e.preventDefault();

  const ok = validate([
    ["a-name", "err-a-name", "Full name is required."],
    ["a-email", "err-a-email", "Email is required."],
    ["a-trn", "err-a-trn", "TRN is required."],
    ["a-dob", "err-a-dob", "Date of birth is required."],
    ["a-phone", "err-a-phone", "Phone number is required."],
  ]);
  if (!ok) return;

  const appId = uuid();
  const userId = uuid();

  setBtnLoading("apply-btn", true, "Submit Application");

  // Insert into users table
  const { error: userErr } = await supabase.from("users").insert({
    id: userId,
    full_name: document.getElementById("a-name").value.trim(),
    email: document.getElementById("a-email").value.trim(),
    TRN: document.getElementById("a-trn").value.trim(),
    date_of_birth: document.getElementById("a-dob").value,
    phone: document.getElementById("a-phone").value.trim(),
  });

  if (userErr) {
    setBtnLoading("apply-btn", false, "Submit Application");
    showToast("Failed to save user details. Please try again.", true);
    console.error("users insert:", userErr.message);
    return;
  }

  // Insert into applications table
  const { error: appErr } = await supabase.from("applications").insert({
    id: appId,
    user_id: userId,
    type: "application",
    status: "pending",
  });

  setBtnLoading("apply-btn", false, "Submit Application");

  if (appErr) {
    showToast("Failed to create application. Please try again.", true);
    console.error("applications insert:", appErr.message);
    return;
  }

  showToast("Application submitted successfully!");
  showSuccess("Application Submitted", appId, userId);
});

// ── RENEW form submit ──────────────────────────────────────

document.getElementById("form-renew").addEventListener("submit", async (e) => {
  e.preventDefault();

  const ok = validate([
    ["r-name", "err-r-name", "Full name is required."],
    ["r-trn", "err-r-trn", "TRN is required."],
    ["r-licence", "err-r-licence", "Licence number is required."],
    ["r-issue", "err-r-issue", "Issue date is required."],
    ["r-expiry", "err-r-expiry", "Expiry date is required."],
    ["r-status", "err-r-status", "Status is required."],
    ["r-payment", "err-r-payment", "Payment method is required."],
    ["r-amount", "err-r-amount", "Payment amount is required."],
  ]);
  if (!ok) return;

  const appId = uuid();
  const userId = uuid();
  const licNum = document.getElementById("r-licence").value.trim();

  setBtnLoading("renew-btn", true, "Submit Renewal");

  // Insert into applications table
  const { error: appErr } = await supabase.from("applications").insert({
    id: appId,
    user_id: userId,
    type: "renewal",
    status: "pending",
    licence_number: licNum,
  });

  if (appErr) {
    setBtnLoading("renew-btn", false, "Submit Renewal");
    showToast("Failed to create application. Please try again.", true);
    console.error("applications insert:", appErr.message);
    return;
  }

  // Insert into licenses table
  const { error: licErr } = await supabase.from("licenses").insert({
    user_id: userId,
    application_id: appId,
    licence_number: licNum,
    issue_date: document.getElementById("r-issue").value,
    expiry_date: document.getElementById("r-expiry").value,
    status: document.getElementById("r-status").value,
  });

  if (licErr) {
    console.warn("licenses insert:", licErr.message); // non-fatal, app already created
  }

  // Insert into payments table
  const { error: payErr } = await supabase.from("payments").insert({
    application_id: appId,
    amount: parseFloat(document.getElementById("r-amount").value) || 0,
    method: document.getElementById("r-payment").value,
    status: "pending",
  });

  setBtnLoading("renew-btn", false, "Submit Renewal");

  if (payErr) {
    console.warn("payments insert:", payErr.message); // non-fatal
  }

  showToast("Renewal submitted successfully!");
  showSuccess("Renewal Submitted", appId, userId);
});

// ── File input label update ────────────────────────────────

document.getElementById("r-file")?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  const label = document.getElementById("file-label");
  const drop = document.getElementById("file-drop");
  if (file) {
    label.textContent = file.name;
    drop.classList.add("file-drop--has-file");
  } else {
    label.textContent = "Click to upload or drag & drop — PDF, JPG, PNG";
    drop.classList.remove("file-drop--has-file");
  }
});

// ── SIGNUP role toggle ─────────────────────────────────────

const cardCitizen = document.getElementById("card-citizen");
const cardOfficial = document.getElementById("card-official");
const officialFields = document.getElementById("official-fields");
const signupBtn = document.getElementById("signup-btn");

function getSignupRole() {
  return document.querySelector('input[name="su-role"]:checked')?.value || "citizen";
}

function updateSignupRole() {
  const isOfficial = getSignupRole() === "official";
  cardCitizen?.classList.toggle("selected", !isOfficial);
  cardOfficial?.classList.toggle("selected", isOfficial);
  if (officialFields) {
    officialFields.classList.toggle("hidden", !isOfficial);
  }
  if (signupBtn) {
    signupBtn.textContent = isOfficial ? "Request Official Account" : "Create Account";
  }
}

document.querySelectorAll('input[name="su-role"]').forEach((r) =>
  r.addEventListener("change", updateSignupRole)
);
[cardCitizen, cardOfficial].forEach((card) => {
  card?.addEventListener("click", () => {
    const radio = card.querySelector('input[type="radio"]');
    if (radio) { radio.checked = true; updateSignupRole(); }
  });
});

// ── Password strength ──────────────────────────────────────

document.getElementById("su-pass")?.addEventListener("input", function () {
  const p = this.value;
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  score = Math.min(4, score);

  const fillClass = ["", "fill-weak", "fill-fair", "fill-good", "fill-strong"][score];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  [1, 2, 3, 4].forEach((i) => {
    const seg = document.getElementById("seg-" + i);
    if (seg) { seg.className = "strength-seg" + (i <= score ? " " + fillClass : ""); }
  });
  const lbl = document.getElementById("strength-label");
  if (lbl) lbl.textContent = p ? labels[score] : "";
});

// ── SIGNUP form submit ─────────────────────────────────────

document.getElementById("form-signup")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const role = getSignupRole();
  const isOfficial = role === "official";

  // Clear all errors
  ["su-name","su-email","su-phone","su-trn","su-dob","su-pass","su-confirm",
   "su-org","su-rank","su-badge","su-auth-code"].forEach((id) => setErr("err-" + id, ""));

  let ok = validate([
    ["su-name",  "err-su-name",  "Full name is required."],
    ["su-email", "err-su-email", "Email is required."],
    ["su-phone", "err-su-phone", "Phone is required."],
    ["su-trn",   "err-su-trn",   "TRN is required."],
    ["su-dob",   "err-su-dob",   "Date of birth is required."],
  ]);

  const pass = document.getElementById("su-pass")?.value || "";
  const confirm = document.getElementById("su-confirm")?.value || "";

  if (!pass || pass.length < 8) {
    setErr("err-su-pass", "Password must be at least 8 characters.");
    ok = false;
  }
  if (pass && pass !== confirm) {
    setErr("err-su-confirm", "Passwords do not match.");
    ok = false;
  }

  if (isOfficial) {
    ok = validate([
      ["su-org",       "err-su-org",       "Organisation is required."],
      ["su-rank",      "err-su-rank",       "Rank / Title is required."],
      ["su-badge",     "err-su-badge",      "Badge / Staff ID is required."],
      ["su-auth-code", "err-su-auth-code",  "Authorization code is required."],
    ]) && ok;
  }

  if (!ok) return;

  setBtnLoading("signup-btn", true, isOfficial ? "Request Official Account" : "Create Account");

  // Supabase auth signup
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: document.getElementById("su-email").value.trim(),
    password: pass,
    options: { data: { full_name: document.getElementById("su-name").value.trim(), role } },
  });

  if (authErr) {
    setBtnLoading("signup-btn", false, isOfficial ? "Request Official Account" : "Create Account");
    showToast(authErr.message, true);
    return;
  }

  const userId = authData?.user?.id || uuid();

  const profilePayload = {
    id: userId,
    full_name: document.getElementById("su-name").value.trim(),
    email: document.getElementById("su-email").value.trim(),
    TRN: document.getElementById("su-trn").value.trim(),
    date_of_birth: document.getElementById("su-dob").value,
    phone: document.getElementById("su-phone").value.trim(),
    role,
    status: isOfficial ? "pending_approval" : "active",
  };

  if (isOfficial) {
    profilePayload.organisation = document.getElementById("su-org").value;
    profilePayload.rank         = document.getElementById("su-rank").value.trim();
    profilePayload.badge_id     = document.getElementById("su-badge").value.trim();
    profilePayload.department   = document.getElementById("su-dept")?.value.trim() || "";
    profilePayload.auth_code    = document.getElementById("su-auth-code").value.trim();
  }

  const { error: profileErr } = await supabase.from("users").insert(profilePayload);
  if (profileErr) console.warn("profile insert:", profileErr.message);

  setBtnLoading("signup-btn", false, isOfficial ? "Request Official Account" : "Create Account");

  showToast(isOfficial ? "Official account request submitted!" : "Account created successfully!");
  showSuccess(
    isOfficial ? "Request Submitted" : "Account Created",
    "—",
    userId
  );

  // Update success panel text for signup context
  const sub = document.getElementById("success-panel")?.querySelector(".success__sub");
  if (sub) sub.textContent = isOfficial
    ? "Your official account is pending supervisor approval. Check your email for updates."
    : "Your account is active. You can now sign in.";
});
