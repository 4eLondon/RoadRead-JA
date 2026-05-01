// form.js

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
  const field = el?.closest(".fgroup");
  const input = field?.querySelector(".finput, .fselect");
  if (input) input.style.borderColor = msg ? "var(--error)" : "";
}

function clearErrs(ids) {
  ids.forEach((id) => setErr(id, ""));
}

// ── Validation functions ───────────────────────────────────

const COMMON_PROVIDERS = [
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com",
  "live.com", "msn.com", "me.com", "aol.com", "protonmail.com",
];

function validateEmail(val) {
  const basic = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val);
  if (!basic) return "Enter a valid email address.";
  const domain = val.split("@")[1].toLowerCase();
  if (!COMMON_PROVIDERS.includes(domain))
    return "Please use a common provider (e.g. Gmail, Yahoo, Outlook).";
  return "";
}

function validateTRN(val) {
  const digits = val.replace(/\D/g, "");
  if (digits.length !== 9) return "TRN must be exactly 9 digits.";
  return "";
}

function validateDOB(val) {
  if (!val) return "Date of birth is required.";
  const today = new Date();
  const dob = new Date(val);
  if (dob > today) return "Date of birth cannot be in the future.";
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  if (age < 18) return "You must be at least 18 years old.";
  if (age > 100) return "Please enter a valid date of birth.";
  return "";
}

function validatePhone(val) {
  const digits = val.replace(/\D/g, "");
  if (digits.length !== 7) return "Enter exactly 7 digits after the area code.";
  return "";
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

function validateAmount(val) {
  const n = parseFloat(val);
  if (!val || isNaN(n)) return "Payment amount is required.";
  if (n <= 0) return "Amount must be greater than 0.";
  return "";
}

function validateRenewDates(issueVal, expiryVal) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const issue = new Date(issueVal);
  const expiry = new Date(expiryVal);

  if (!issueVal)  return { issueErr: "Issue date is required.", expiryErr: "" };
  if (!expiryVal) return { issueErr: "", expiryErr: "Expiry date is required." };
  if (issue > today)
    return { issueErr: "Issue date cannot be in the future.", expiryErr: "" };
  if (expiry <= today)
    return { issueErr: "", expiryErr: "Expiry date must be a future date." };
  if (expiry <= issue)
    return { issueErr: "", expiryErr: "Expiry date must be after the issue date." };

  return { issueErr: "", expiryErr: "" };
}

// ── File validation ────────────────────────────────────────

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_EXT = /\.(png|jpe?g|pdf|docx)$/i;

function validateFile(file, errId, dropId, labelId, inputId) {
  if (!file) {
    setErr(errId, "This document is required.");
    return false;
  }
  if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXT.test(file.name)) {
    setErr(errId, "Invalid format. Only PNG, JPG, PDF, DOCX allowed.");
    document.getElementById(dropId).classList.remove("file-drop--has-file");
    document.getElementById(labelId).textContent =
      "Click to upload or drag & drop — PDF, JPG, PNG, DOCX";
    document.getElementById(inputId).value = "";
    return false;
  }
  setErr(errId, "");
  return true;
}

// ── File upload to Supabase storage ───────────────────────

async function uploadFile(file, folder, appId) {
  const ext  = file.name.split(".").pop();
  const path = `${appId}/${folder}_s2.${ext}`;

  const { error } = await supabase.storage
    .from("documents")
    .upload(path, file, { upsert: true });

  if (error) throw new Error(`Failed to upload ${folder}: ${error.message}`);
  return path;
}

// ── Input formatters & keystroke guards ───────────────────

// TRN auto-format: 000-000-000
document.getElementById("a-trn").addEventListener("input", (e) => {
  let v = e.target.value.replace(/\D/g, "").slice(0, 9);
  if (v.length > 6)      v = `${v.slice(0, 3)}-${v.slice(3, 6)}-${v.slice(6)}`;
  else if (v.length > 3) v = `${v.slice(0, 3)}-${v.slice(3)}`;
  e.target.value = v;
});

document.getElementById("r-trn").addEventListener("input", (e) => {
  let v = e.target.value.replace(/\D/g, "").slice(0, 9);
  if (v.length > 6)      v = `${v.slice(0, 3)}-${v.slice(3, 6)}-${v.slice(6)}`;
  else if (v.length > 3) v = `${v.slice(0, 3)}-${v.slice(3)}`;
  e.target.value = v;
});

// Phone: strip non-digits, max 7
document.getElementById("a-phone").addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/\D/g, "").slice(0, 7);
});

// Keydown guards — digits only, no letters
["a-phone", "a-trn", "r-trn"].forEach((id) => {
  document.getElementById(id)?.addEventListener("keydown", (e) => {
    const allowed = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight"];
    if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
  });
});

// Amount — digits and one decimal point only
document.getElementById("r-amount")?.addEventListener("keydown", (e) => {
  const allowed = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "."];
  if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
});

// ── File input change listeners ────────────────────────────

[
  ["r-file-medical", "label-medical", "drop-medical", "err-r-medical"],
  ["r-file-photo",   "label-photo",   "drop-photo",   "err-r-photo"],
  ["r-file-id",      "label-id",      "drop-id",      "err-r-id"],
].forEach(([inputId, labelId, dropId, errId]) => {
  document.getElementById(inputId)?.addEventListener("change", (e) => {
    const file  = e.target.files[0];
    const drop  = document.getElementById(dropId);
    const label = document.getElementById(labelId);
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXT.test(file.name)) {
      setErr(errId, "Invalid format. Only PNG, JPG, PDF, DOCX allowed.");
      drop.classList.remove("file-drop--has-file");
      label.textContent = "Click to upload or drag & drop — PDF, JPG, PNG, DOCX";
      e.target.value = "";
      return;
    }
    setErr(errId, "");
    label.textContent = file.name;
    drop.classList.add("file-drop--has-file");
  });
});

// ── Toast ──────────────────────────────────────────────────

function showToast(msg, isError = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast toast--visible" + (isError ? " toast--error" : "");
  setTimeout(() => { t.className = "toast"; }, 3500);
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

  // Password
  const pass    = document.getElementById("a-pass").value;
  const confirm = document.getElementById("a-confirm").value;
  const { passErr, confirmErr } = validatePassword(pass, confirm);
  if (passErr)    { setErr("err-a-pass",    passErr);    ok = false; }
  else              setErr("err-a-pass", "");
  if (confirmErr) { setErr("err-a-confirm", confirmErr); ok = false; }
  else              setErr("err-a-confirm", "");

  if (!ok) return;

  // Build full phone number only after validation passes
  const fullPhone = document.getElementById("a-phone-code").value
                  + document.getElementById("a-phone").value;

  const appId  = uuid();
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
  let ok = true;

  // Name
  const rName = document.getElementById("r-name").value.trim();
  if (!rName) { setErr("err-r-name", "Full name is required."); ok = false; }
  else setErr("err-r-name", "");

  // TRN
  const rTrnErr = validateTRN(document.getElementById("r-trn").value.trim());
  if (rTrnErr) { setErr("err-r-trn", rTrnErr); ok = false; }
  else setErr("err-r-trn", "");

  // Licence
  const rLic = document.getElementById("r-licence").value.trim();
  if (!rLic) { setErr("err-r-licence", "Licence number is required."); ok = false; }
  else setErr("err-r-licence", "");

  // Dates
  const { issueErr, expiryErr } = validateRenewDates(
    document.getElementById("r-issue").value,
    document.getElementById("r-expiry").value
  );
  if (issueErr)  { setErr("err-r-issue",  issueErr);  ok = false; }
  else setErr("err-r-issue", "");
  if (expiryErr) { setErr("err-r-expiry", expiryErr); ok = false; }
  else setErr("err-r-expiry", "");

  // Status
  const rStatus = document.getElementById("r-status").value;
  if (!rStatus) { setErr("err-r-status", "Please select a status."); ok = false; }
  else setErr("err-r-status", "");

  // Payment method
  const rPayment = document.getElementById("r-payment").value;
  if (!rPayment) { setErr("err-r-payment", "Please select a payment method."); ok = false; }
  else setErr("err-r-payment", "");

  // Amount
  const amountErr = validateAmount(document.getElementById("r-amount").value);
  if (amountErr) { setErr("err-r-amount", amountErr); ok = false; }
  else setErr("err-r-amount", "");

  // Files — read before validation so they're available for upload too
  const medicalFile = document.getElementById("r-file-medical").files[0];
  const photoFile   = document.getElementById("r-file-photo").files[0];
  const idFile      = document.getElementById("r-file-id").files[0];

  const medOk   = validateFile(medicalFile, "err-r-medical", "drop-medical", "label-medical", "r-file-medical");
  const photoOk = validateFile(photoFile,   "err-r-photo",   "drop-photo",   "label-photo",   "r-file-photo");
  const idOk    = validateFile(idFile,      "err-r-id",      "drop-id",      "label-id",      "r-file-id");

  if (!medOk || !photoOk || !idOk) ok = false;

  if (!ok) return;

  const appId  = uuid();
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
    console.warn("licenses insert:", licErr.message); // non-fatal
  }

  // Insert into payments table
  const { error: payErr } = await supabase.from("payments").insert({
    application_id: appId,
    amount: parseFloat(document.getElementById("r-amount").value) || 0,
    method: document.getElementById("r-payment").value,
    status: "pending",
  });

  if (payErr) {
    console.warn("payments insert:", payErr.message); // non-fatal
  }

  // Upload all three files to Supabase storage
  try {
    await uploadFile(medicalFile, "medical_cert", appId);
    await uploadFile(photoFile,   "photograph",   appId);
    await uploadFile(idFile,      "national_id",  appId);
  } catch (uploadErr) {
    setBtnLoading("renew-btn", false, "Submit Renewal");
    showToast(uploadErr.message, true);
    console.error(uploadErr);
    return;
  }

  setBtnLoading("renew-btn", false, "Submit Renewal");
  showToast("Renewal submitted successfully!");
  showSuccess("Renewal Submitted", appId, userId);
});
