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

// Tab switcher and role toggle are handled by inline script in application.html
// (kept here as fallback for other pages that may load this module)
if (!window.switchTab) {
  window.switchTab = function (type) {
    const isRenew = type === "renew";
    const outPanel = document.getElementById(isRenew ? "form-apply" : "form-renew");
    const inPanel = document.getElementById(isRenew ? "form-renew" : "form-apply");
    document.getElementById("tab-apply").classList.toggle("active", !isRenew);
    document.getElementById("tab-renew").classList.toggle("active", isRenew);
    document.getElementById("page-title").textContent = isRenew ? "Renew / Replace" : "New Application";
    document.getElementById("success-panel").classList.add("hidden");
    if (outPanel.classList.contains("hidden")) { inPanel.classList.remove("hidden"); return; }
    outPanel.classList.add("hiding");
    outPanel.addEventListener("animationend", () => {
      outPanel.classList.add("hidden");
      outPanel.classList.remove("hiding");
      inPanel.classList.remove("hidden");
    }, { once: true });
  };
}

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

// Role toggle is initialized by inline script in application.html
// These listeners are added only if not already initialized
if (!window._roleToggleInit) {
  window._roleToggleInit = true;
  const cardCitizen = document.getElementById("card-citizen");
  const cardOfficial = document.getElementById("card-official");

  function getApplyRole() {
    return document.querySelector('input[name="apply-role"]:checked')?.value || "citizen";
  }

  function updateApplyRole() {
    const isOfficial = getApplyRole() === "official";
    cardCitizen?.classList.toggle("selected", !isOfficial);
    cardOfficial?.classList.toggle("selected", isOfficial);
    document.getElementById("citizen-fields").classList.toggle("hidden", isOfficial);
    document.getElementById("official-fields").classList.toggle("hidden", !isOfficial);
    document.getElementById("apply-btn").textContent = isOfficial
      ? "Request Official Account"
      : "Submit Application";
  }

  document.querySelectorAll('input[name="apply-role"]').forEach((r) =>
    r.addEventListener("change", updateApplyRole)
  );
  [cardCitizen, cardOfficial].forEach((card) => {
    card?.addEventListener("click", () => {
      const radio = card.querySelector('input[type="radio"]');
      if (radio) { radio.checked = true; updateApplyRole(); }
    });
  });
}

// ── Password strength helper ───────────────────────────────

function attachStrength(inputId, segPrefix, labelId) {
  document.getElementById(inputId)?.addEventListener("input", function () {
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
      const seg = document.getElementById(segPrefix + i);
      if (seg) seg.className = "strength-seg" + (i <= score ? " " + fillClass : "");
    });
    const lbl = document.getElementById(labelId);
    if (lbl) lbl.textContent = p ? labels[score] : "";
  });
}

attachStrength("a-pass", "a-seg-", "a-strength-label");
attachStrength("o-pass", "o-seg-", "o-strength-label");

// ── APPLY form submit ──────────────────────────────────────

document.getElementById("form-apply").addEventListener("submit", async (e) => {
  e.preventDefault();
  const isOfficial = getApplyRole() === "official";

  let ok;
  if (!isOfficial) {
    ok = validate([
      ["a-name",    "err-a-name",    "Full name is required."],
      ["a-email",   "err-a-email",   "Email is required."],
      ["a-trn",     "err-a-trn",     "TRN is required."],
      ["a-dob",     "err-a-dob",     "Date of birth is required."],
      ["a-phone",   "err-a-phone",   "Phone number is required."],
    ]);
    const pass = document.getElementById("a-pass").value;
    const confirm = document.getElementById("a-confirm").value;
    if (!pass || pass.length < 8) { setErr("err-a-pass", "Password must be at least 8 characters."); ok = false; }
    else setErr("err-a-pass", "");
    if (pass && pass !== confirm) { setErr("err-a-confirm", "Passwords do not match."); ok = false; }
    else if (pass) setErr("err-a-confirm", "");
  } else {
    ok = validate([
      ["o-name",      "err-o-name",      "Full name is required."],
      ["o-email",     "err-o-email",     "Email is required."],
      ["o-trn",       "err-o-trn",       "TRN is required."],
      ["o-org",       "err-o-org",       "Organisation is required."],
      ["o-rank",      "err-o-rank",      "Rank / Title is required."],
      ["o-badge",     "err-o-badge",     "Badge / Staff ID is required."],
      ["o-auth-code", "err-o-auth-code", "Authorization code is required."],
    ]);
    const pass = document.getElementById("o-pass").value;
    const confirm = document.getElementById("o-confirm").value;
    if (!pass || pass.length < 8) { setErr("err-o-pass", "Password must be at least 8 characters."); ok = false; }
    else setErr("err-o-pass", "");
    if (pass && pass !== confirm) { setErr("err-o-confirm", "Passwords do not match."); ok = false; }
    else if (pass) setErr("err-o-confirm", "");
  }

  if (!ok) return;

  const appId = uuid();
  const userId = uuid();
  setBtnLoading("apply-btn", true, isOfficial ? "Request Official Account" : "Submit Application");

  if (!isOfficial) {
    // Citizen: insert user + application (existing flow)
    const { error: userErr } = await supabase.from("users").insert({
      id: userId,
      full_name: document.getElementById("a-name").value.trim(),
      email: document.getElementById("a-email").value.trim(),
      TRN: document.getElementById("a-trn").value.trim(),
      date_of_birth: document.getElementById("a-dob").value,
      phone: document.getElementById("a-phone").value.trim(),
      role: "citizen",
      status: "active",
    });
    if (userErr) {
      setBtnLoading("apply-btn", false, "Submit Application");
      showToast("Failed to save user details. Please try again.", true);
      console.error("users insert:", userErr.message);
      return;
    }
    const { error: appErr } = await supabase.from("applications").insert({
      id: appId, user_id: userId, type: "application", status: "pending",
    });
    setBtnLoading("apply-btn", false, "Submit Application");
    if (appErr) { showToast("Failed to create application. Please try again.", true); console.error("applications insert:", appErr.message); return; }
    showToast("Application submitted successfully!");
    showSuccess("Application Submitted", appId, userId);

  } else {
    // Official: insert user record with pending_approval
    const { error: userErr } = await supabase.from("users").insert({
      id: userId,
      full_name: document.getElementById("o-name").value.trim(),
      email: document.getElementById("o-email").value.trim(),
      TRN: document.getElementById("o-trn").value.trim(),
      organisation: document.getElementById("o-org").value,
      rank: document.getElementById("o-rank").value.trim(),
      badge_id: document.getElementById("o-badge").value.trim(),
      department: document.getElementById("o-dept").value.trim(),
      auth_code: document.getElementById("o-auth-code").value.trim(),
      role: "official",
      status: "pending_approval",
    });
    setBtnLoading("apply-btn", false, "Request Official Account");
    if (userErr) { showToast("Failed to submit request. Please try again.", true); console.error("users insert:", userErr.message); return; }
    showToast("Official account request submitted!");
    showSuccess("Request Submitted", appId, userId);
  }
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
