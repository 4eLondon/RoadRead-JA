class AdminNavbar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <nav class="navbar">
        <div class="nav-left">
          <img src="/public/images/logo.png" style="width: 160px; height: auto" />
        </div>
        <ul class="nav-center">
          <li><a href="./index.html">Home</a></li>
          <li><a href="/pages/verification.html">Verification</a></li>
          <li><a href="/pages/tracking.html">Tracking</a></li>
          <li><a href="/pages/officer-review.html">Officer Review</a></li>
          <li><a href="/pages/admin.html">Admin</a></li>
        </ul>
        <div class="nav-right">
          <button class="login" onclick="window.location.href='/pages/auth.html'">
            Login / Register
          </button>
          <button id="theme-toggle" class="theme-toggle" aria-label="Switch to light mode"></button>
        </div>
      </nav>`;
  }
}

customElements.define('admin-navbar', AdminNavbar);
