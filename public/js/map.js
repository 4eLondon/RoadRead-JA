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
      minZoom: 8,          // prevent over-zooming out (fewer tiles)
      maxZoom: 16,
      maxBounds: bounds,   // clamps panning to Jamaica only
      maxBoundsViscosity: 0.85,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 16,
      // Cache tiles in the browser for 1 hour
      updateWhenIdle: true,
      keepBuffer: 1,       // only render 1 tile-width buffer outside viewport
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

  function initLocation() {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        if (result.state === 'granted') {
          locateUser();
        } else if (result.state === 'prompt') {
          buildPrompt();
        } else {
          setStatus('error', 'Location blocked. Enable it in browser settings.');
        }
        result.onchange = () => {
          if (result.state === 'granted') locateUser();
          if (result.state === 'denied')  setStatus('error', 'Location blocked. Enable it in browser settings.');
        };
      }).catch(() => buildPrompt());
    } else {
      buildPrompt();
    }
  }

  // ── Re-centre button ──────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const locateBtn = document.getElementById('locate-btn');
    if (locateBtn) {
      locateBtn.addEventListener('click', e => {
        e.preventDefault();
        // If the map hasn't loaded yet (user clicked before scrolling),
        // load Leaflet now and then locate.
        if (!mapInstance) {
          loadLeaflet(initMap);
        } else {
          locateUser();
        }
      });
    }

    // ── IntersectionObserver — lazy init ──────────────────
    // Leaflet JS is not fetched at all until the map section
    // is within 200px of the viewport.
    const mapSection = document.getElementById('map-section');
    if (!mapSection) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          loadLeaflet(initMap);
        }
      },
      { rootMargin: '0px 0px 200px 0px' } // start loading 200px before visible
    );

    observer.observe(mapSection);
  });
})();
