// public/components/defaultNavbar.js
import { supabase } from "/public/js/dataconnect.js";

function initials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

class DefaultNavbar extends HTMLElement {
  async connectedCallback() {
    // Render shell first so the page doesn't wait on auth
    this.innerHTML = `
      <nav class="navbar">
        <div class="nav-left">
          <img src="/public/images/logo.png" style="width:160px;height:auto" />
        </div>
        <ul class="nav-center">
          <li><a href="/index.html">Home</a></li>
          <li><a href="/#services">Services</a></li>
          <li><a href="/#about">About Us</a></li>
          <li><a href="/#contact">Contact</a></li>
          <li><a href="/pages/dashboard.html">Dashboard</a></li>
        </ul>
        <div class="nav-right" id="nav-auth-area">
          <button class="login" onclick="window.location.href='/pages/auth.html'">
            Login / Register
          </button>
          <button id="theme-toggle" class="theme-toggle" aria-label="Toggle theme"></button>
        </div>
      </nav>`;

    window.rrjaTheme?.init();

    // Swap auth area once session resolves
    const { data: { session } } = await supabase.auth.getSession();
    if (session) this._renderUser(session.user);

    // Keep in sync if user signs in/out in another tab
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) this._renderUser(session.user);
      else         this._renderGuest();
    });
  }

  async _renderUser(user) {
    // Try to get full name from users table, fall back to metadata / email
    const { data: profile } = await supabase
      .from("users")
      .select("full_name")
      .eq("auth_id", user.id)
      .single();

    const name = profile?.full_name
      || user.user_metadata?.name
      || user.email.split("@")[0];

    const init = initials(name);

    const area = this.querySelector("#nav-auth-area");
    if (!area) return;

    area.innerHTML = `
      <div class="nav-profile">
        <div class="nav-avatar">${init}</div>
        <span class="nav-profile__name">${name}</span>
      </div>
      <button class="nav-signout" id="nav-signout-btn">Sign Out</button>
      <button id="theme-toggle" class="theme-toggle" aria-label="Toggle theme"></button>`;

    this.querySelector("#nav-signout-btn").addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.href = "/pages/auth.html?mode=login";
    });

    // Re-init theme toggle since we replaced the DOM
    window.rrjaTheme?.init();
  }

  _renderGuest() {
    const area = this.querySelector("#nav-auth-area");
    if (!area) return;
    area.innerHTML = `
      <button class="login" onclick="window.location.href='/pages/auth.html'">
        Login / Register
      </button>
      <button id="theme-toggle" class="theme-toggle" aria-label="Toggle theme"></button>`;
    window.rrjaTheme?.init();
  }
}

customElements.define("default-navbar", DefaultNavbar);
