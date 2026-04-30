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


function validatePassword(pass, confirm) {
  if (pass.length < 8)
    return { passErr: "Password must be at least 8 characters.", confirmErr: "" };
  if (!/[A-Z]/.test(pass))
    return { passErr: "Password must contain at least one capital letter.", confirmErr: "" };
  if (!/[0-9]/.test(pass))
    return { passErr: "Password must contain at least one number.", confirmErr: "" };
  if (pass !== confirm)
    return { passErr: "", confirmErr: "Passwords do not match." };
  return { passErr: "", confirmErr: "" };
}

document.getElementById("a-phone").addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/\D/g, "").slice(0, 7);
});

function validatePhone(val) {
  const digits = val.replace(/\D/g, "");
  if (digits.length !== 7) return "Enter exactly 7 digits after the area code.";
  return "";
}


function validateDOB(val) {
  if (!val) return "Date of birth is required.";
  const today = new Date();
  const dob   = new Date(val);
  if (dob > today) return "Date of birth cannot be in the future.";
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  if (age < 18)  return "You must be at least 18 years old.";
  if (age > 100) return "Please enter a valid date of birth.";
  return "";
}

document.getElementById("a-trn").addEventListener("input", (e) => {
  let v = e.target.value.replace(/\D/g, "").slice(0, 9);
  if (v.length > 6)      v = `${v.slice(0,3)}-${v.slice(3,6)}-${v.slice(6)}`;
  else if (v.length > 3) v = `${v.slice(0,3)}-${v.slice(3)}`;
  e.target.value = v;
});

function validateTRN(val) {
  const digits = val.replace(/\D/g, "");
  if (digits.length !== 9) return "TRN must be exactly 9 digits.";
  return "";
}

const COMMON_PROVIDERS = [
  "gmail.com","yahoo.com","outlook.com","hotmail.com","icloud.com",
  "live.com","msn.com","me.com","aol.com","protonmail.com"
];

function validateEmail(val) {
  const basic = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val);
  if (!basic) return "Enter a valid email address.";
  const domain = val.split("@")[1].toLowerCase();
  if (!COMMON_PROVIDERS.includes(domain))
    return "Please use a common provider (e.g. Gmail, Yahoo, Outlook).";
  return "";
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


 let ok = true;

  // Name
  const name = document.getElementById("a-name").value.trim();
  if (!name) { setErr("err-a-name", "Full name is required."); ok = false; }
  else setErr("err-a-name", "");

  // Email
  const emailErr = validateEmail(document.getElementById("a-email").value.trim());
  if (emailErr) { setErr("err-a-email", emailErr); ok = false; }
  else setErr("err-a-email", "");

  // TRN
  const trnErr = validateTRN(document.getElementById("a-trn").value.trim());
  if (trnErr) { setErr("err-a-trn", trnErr); ok = false; }
  else setErr("err-a-trn", "");

  // DOB
  const dobErr = validateDOB(document.getElementById("a-dob").value);
  if (dobErr) { setErr("err-a-dob", dobErr); ok = false; }
  else setErr("err-a-dob", "");

  // Phone
  const phoneErr = validatePhone(document.getElementById("a-phone").value);
  if (phoneErr) { setErr("err-a-phone", phoneErr); ok = false; }
  else setErr("err-a-phone", "");
    
  const fullPhone = document.getElementById("a-phone-code").value
                + document.getElementById("a-phone").value;

  // Password
  const pass    = document.getElementById("a-pass").value;
  const confirm = document.getElementById("a-confirm").value;
  const { passErr, confirmErr } = validatePassword(pass, confirm);
  if (passErr)    { setErr("err-a-pass",    passErr);    ok = false; }
  else             setErr("err-a-pass", "");
  if (confirmErr) { setErr("err-a-confirm", confirmErr); ok = false; }
  else             setErr("err-a-confirm", "");

  if (!ok) return;


  const appId = uuid();
  const userId = uuid();
  setBtnLoading("apply-btn", true, "Submit Application");

  const { error: userErr } = await supabase.from("users").insert({
    id: userId,
    full_name: document.getElementById("a-name").value.trim(),
    email: document.getElementById("a-email").value.trim(),
    TRN: document.getElementById("a-trn").value.trim(),
    date_of_birth: document.getElementById("a-dob").value,
    phone: fullPhone,
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
