class DotNavbar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <nav class="dot-nav">
    <div class="dot-nav__item">
      <a class="dot-nav__dot" href="/"></a>
      <span class="dot-nav__label">Home</span>
    </div>
    <div class="dot-nav__item">
      <a class="dot-nav__dot" href="/#about"></a>
      <span class="dot-nav__label">About Us</span>
    </div>
    <div class="dot-nav__item">
      <a class="dot-nav__dot" href="/#contact"></a>
      <span class="dot-nav__label">Contact</span>
    </div>

    <button id="theme-toggle" class="theme-toggle" aria-label="Switch to light mode">
    </button>

  </nav>
    `;

    window.rrjaTheme.init();
  }
}

customElements.define('dot-navbar', DotNavbar);
