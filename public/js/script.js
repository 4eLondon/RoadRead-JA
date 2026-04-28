//script js file


// ── Smooth scroll ──────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

// ── Active nav on scroll ───────────────────────────────────
const sections = document.querySelectorAll("section[id], footer[id]");
const navLinks = document.querySelectorAll(".nav-center a");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      navLinks.forEach((a) => {
        a.style.color =
          a.getAttribute("href") === "#" + id ? "var(--accent)" : "";
      });
    });
  },
  { threshold: 0.4 },
);

sections.forEach((s) => observer.observe(s));

// ── Contact form ───────────────────────────────────────────

const COMPANY_EMAIL = "roadready.ja@gmail.com";

const form = document.getElementById("contact-form");
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("cf-name").value.trim();
    const email = document.getElementById("cf-email").value.trim();
    const subject = document.getElementById("cf-subject").value.trim();
    const message = document.getElementById("cf-message").value.trim();

    if (!name || !email || !message) {
      showToast("Please fill in all required fields.", true);
      return;
    }

    const mailSubject = subject
      ? `[RoadReady JA] ${subject}`
      : `[RoadReady JA] Message from ${name}`;

    const mailBody = [
      `Name: ${name}`,
      `Email: ${email}`,
      ``,
      `Message:`,
      message,
    ].join("\n");

    window.location.href =
      `mailto:${COMPANY_EMAIL}` +
      `?subject=${encodeURIComponent(mailSubject)}` +
      `&body=${encodeURIComponent(mailBody)}`;

    showToast("Opening your email client…");
    form.reset();
  });
}

function showToast(msg, isError = false) {
  const existing = document.getElementById("hp-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "hp-toast";
  toast.textContent = msg;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "28px",
    left: "50%",
    transform: "translateX(-50%) translateY(16px)",
    padding: "10px 24px",
    borderRadius: "2px",
    fontFamily: "var(--font-mono)",
    fontSize: "0.68rem",
    fontWeight: "600",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#fff",
    background: isError ? "var(--error, #e05555)" : "var(--green, #077333)",
    opacity: "0",
    transition: "opacity 0.3s ease, transform 0.3s ease",
    zIndex: "999",
    whiteSpace: "nowrap",
    pointerEvents: "none",
  });

  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(16px)";
    toast.addEventListener("transitionend", () => toast.remove());
  }, 3500);
}
