class AdminNavbar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <nav class="navbar">
        <div class="nav-left">
          <img src="/public/images/logo.png" style="width: 160px; height: auto" />
        </div>
        <ul class="nav-center">
          <li><a href="index.html">Home</a></li>
          <li><a href="#services">Services</a></li>
          <li><a href="#about">About Us</a></li>
          <li><a href="#contact">Contact</a></li>
          <li><a href="/pages/dashboard.html">Dashboard</a></li>
        </ul>
        <div class="nav-right">
          <button class="login" onclick="window.location.href='/pages/auth.html'">
            Login / Register
          </button>
          <button id="theme-toggle" class="theme-toggle" aria-label="Toggle theme"></button>
        </div>
      </nav>`;

    window.rrjaTheme.init();
  }
}

customElements.define('admin-navbar', AdminNavbar);
