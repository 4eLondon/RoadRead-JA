
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
  const isRenew = type === "renew";
  const outPanel = document.getElementById(
    isRenew ? "form-apply" : "form-renew",
  );
  const inPanel = document.getElementById(
    isRenew ? "form-renew" : "form-apply",
  );

  document.getElementById("tab-apply").classList.toggle("active", !isRenew);
  document.getElementById("tab-renew").classList.toggle("active", isRenew);
  document.getElementById("page-title").textContent = isRenew
    ? "Renew / Replace"
    : "New Application";
  document.getElementById("success-panel").classList.add("hidden");

  if (outPanel.classList.contains("hidden")) {
    // Nothing visible yet — just show the target
    inPanel.classList.remove("hidden");
    return;
  }

  // Play out-animation, then swap
  outPanel.classList.add("hiding");
  outPanel.addEventListener(
    "animationend",
    () => {
      outPanel.classList.add("hidden");
      outPanel.classList.remove("hiding");
      inPanel.classList.remove("hidden");
    },
    { once: true },
  );
};

// Open on correct tab from URL: /apply?type=renew
const urlType = new URLSearchParams(window.location.search).get("type");
if (urlType === "renew") switchTab("renew");

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
