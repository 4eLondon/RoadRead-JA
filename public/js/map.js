// map.js — Lazy-loaded Leaflet map with IntersectionObserver
// Leaflet JS is injected dynamically only when the map section
// scrolls into view, so it never blocks the initial page render.

(function () {
  const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

  // Jamaica bounding box — limits tile requests dramatically
  const JA_BOUNDS = L_bounds => L_bounds([
    [17.70, -78.40],
    [18.55, -76.18],
  ]);

  let leafletLoaded = false;
  let mapInstance   = null;

  // ── Dynamically inject Leaflet JS ─────────────────────────
  function loadLeaflet(callback) {
    if (leafletLoaded) { callback(); return; }
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.onload = () => { leafletLoaded = true; callback(); };
    script.onerror = () => console.error('Failed to load Leaflet');
    document.head.appendChild(script);
  }

  // ── Map init (runs only after Leaflet is loaded) ──────────
  function initMap() {
    if (mapInstance) return; // guard against double-init

    const bounds = JA_BOUNDS(L.latLngBounds);

    mapInstance = L.map('map', {
      center: [18.10, -77.30],
      zoom: 9,
      minZoom: 8,
      maxZoom: 16,
      maxBounds: bounds,
      maxBoundsViscosity: 0.85,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 16,
      updateWhenIdle: true,
      keepBuffer: 1,
    }).addTo(mapInstance);

    L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

    initLocation();
  }

  // ── User location marker ───────────────────────────────────
  const userIcon = () => L.divIcon({
    className: '',
    html: `<div style="
      width:14px;height:14px;
      border-radius:50%;
      background:#f3c511;
      border:2px solid #1a1a1a;
      box-shadow:0 0 0 3px rgba(243,197,17,0.35);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  let userMarker = null;

  const statusDot  = () => document.getElementById('status-dot');
  const statusText = () => document.getElementById('status-text');
  const coordsEl   = () => document.getElementById('map-coords');

  function setStatus(state, text) {
    const dot = statusDot();
    const txt = statusText();
    if (!dot || !txt) return;
    dot.className = `map-status__dot map-status__dot--${state}`;
    txt.textContent = text;
  }

  function locateUser() {
    if (!navigator.geolocation) {
      setStatus('error', 'Geolocation not supported by your browser.');
      return;
    }

    setStatus('loading', 'Locating…');

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;

        if (userMarker) {
          userMarker.setLatLng([lat, lng]);
        } else {
          userMarker = L.marker([lat, lng], { icon: userIcon() })
            .addTo(mapInstance)
            .bindPopup('<strong style="font-family:monospace;font-size:12px;">You are here</strong>', {
              className: 'map-popup',
            });
        }

        mapInstance.setView([lat, lng], 13, { animate: true });
        userMarker.openPopup();

        setStatus('ok', 'Location found');
        const coords = coordsEl();
        if (coords) coords.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

        // Hide the share-location button once we have a fix — re-centre takes over
        const shareBtn = document.getElementById('share-location-btn');
        if (shareBtn) shareBtn.style.display = 'none';
      },
      err => {
        const msgs = {
          1: 'Location access denied. Enable it in browser settings.',
          2: 'Location unavailable. Check your device settings.',
          3: 'Location request timed out. Please try again.',
        };
        setStatus('error', msgs[err.code] || 'Could not get location.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  function removeOverlay() {
    document.getElementById('loc-overlay')?.remove();
  }

  // ── Popup (now only shown on explicit user action) ─────────
  function buildPrompt() {
    removeOverlay();
    const overlay = document.createElement('div');
    overlay.id = 'loc-overlay';
    overlay.innerHTML = `
      <div id="loc-prompt">
        <div class="loc-prompt__icon">
          <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2"
                  stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
          </svg>
        </div>
        <h3>Allow location access?</h3>
        <p>
          RoadReady JA would like to show your position on the map so you
          can find the nearest TAJ office. Your location is never stored or shared.
        </p>
        <div class="loc-prompt__actions">
          <button id="loc-allow">Allow</button>
          <button id="loc-deny">Not now</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    document.getElementById('loc-allow').addEventListener('click', () => {
      removeOverlay();
      locateUser();
    });
    document.getElementById('loc-deny').addEventListener('click', () => {
      removeOverlay();
      setStatus('error', 'Location access not granted.');
    });
  }

  // ── Location init — silent, no popup on load ───────────────
  // If permission is already granted: locate automatically.
  // If denied or unknown: do nothing — wait for the user to click the button.
  function initLocation() {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        if (result.state === 'granted') {
          locateUser();
        } else if (result.state === 'denied') {
          setStatus('error', 'Location blocked. Enable it in browser settings.');
        }
        // 'prompt' state: stay quiet — the share button handles this

        result.onchange = () => {
          if (result.state === 'granted') locateUser();
          if (result.state === 'denied')  setStatus('error', 'Location blocked. Enable it in browser settings.');
        };
      }).catch(() => {
        // Permissions API unavailable — stay quiet, button will trigger prompt
      });
    }
    // No permissions API: stay quiet, button will trigger the browser's native prompt
  }

  // ── Inject the "Share Location" map button ─────────────────
  function injectShareButton() {
    const mapWrap = document.querySelector('.map-wrap');
    if (!mapWrap || document.getElementById('share-location-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'share-location-btn';
    btn.className = 'map-locate-btn'; // reuse the same style as Re-centre
    btn.title = 'Share my location';
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/>
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      </svg>
      Share Location`;

    // Position it just above the Re-centre button
    const recentreBtn = document.getElementById('locate-btn');
    if (recentreBtn) {
      mapWrap.insertBefore(btn, recentreBtn);
    } else {
      mapWrap.appendChild(btn);
    }

    btn.addEventListener('click', e => {
      e.preventDefault();
      // Ensure map is loaded first, then show the prompt
      if (!mapInstance) {
        loadLeaflet(() => { initMap(); buildPrompt(); });
      } else {
        buildPrompt();
      }
    });
  }

  // ── Re-centre button ──────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    injectShareButton();

    const locateBtn = document.getElementById('locate-btn');
    if (locateBtn) {
      locateBtn.addEventListener('click', e => {
        e.preventDefault();
        if (!mapInstance) {
          loadLeaflet(initMap);
        } else if (userMarker) {
          // Already have a fix — just re-centre
          locateUser();
        } else {
          // No fix yet — treat as share-location request
          buildPrompt();
        }
      });
    }

    // ── IntersectionObserver — lazy init ──────────────────
    const mapSection = document.getElementById('map-section');
    if (!mapSection) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          loadLeaflet(initMap);
        }
      },
      { rootMargin: '0px 0px 200px 0px' }
    );

    observer.observe(mapSection);
  });
})();
