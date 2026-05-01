class DefaultFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
    <footer class="footer">
    <div class="footer__inner">
      <div class="footer__brand">
        <img src="/public/images/logo.png" style="width: 160px; height: auto" alt="Road Ready JA logo" />
        <p>Digitally Driving Forward</p>
      </div>
      <div class="footer__links">
        <a href="#home">Home</a>
        <a href="#services">Services</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
        <a href="/pages/auth.html">Sign In</a>
        <a href="/pages/dashboard.html">Dashboard</a>
        <a href="/pages/privacy.html">Privacy Policy</a>
        <a href="/pages/eula.html">EULA</a>
      </div>
      <div class="footer__copy">
        &copy; 2026 RoadReady JA. All rights reserved.
      </div>
    </div>
  </footer>`
    ;

    window.rrjaTheme.init();
  }
}

customElements.define('default-footer', DefaultFooter);

