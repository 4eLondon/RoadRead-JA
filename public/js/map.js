// map.js — Lazy-loaded Leaflet map with TAJ office sidebar
(function () {
  const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

  // FIX 1: JA_BOUNDS was calling L.latLngBounds with a single array argument.
  // L.latLngBounds expects two separate (sw, ne) arguments.
  // Changed to a plain function that creates the bounds correctly.
  const JA_BOUNDS = () => L.latLngBounds([17.70, -78.40], [18.55, -76.18]);

  let leafletLoaded = false;
  let mapInstance   = null;
  let userMarker    = null;
  let userLatLng    = null; // { lat, lng } once located

  // ── Known TAJ offices ─────────────────────────────────────
  const TAJ_OFFICES = [
    { name: 'Tax Administration Jamaica — Head Office',  address: '116 East Street, Kingston',           lat: 17.9975, lng: -76.7944, phone: '(876) 922-3470' },
    { name: 'Constant Spring Tax Office',                address: '191 Constant Spring Rd, Kingston',    lat: 18.0341, lng: -76.7897, phone: '(876) 619-1111' },
    { name: 'Cross Roads Tax Office',                    address: 'Eureka Rd, Kingston',                 lat: 18.0101, lng: -76.7833, phone: '(876) 960-0097' },
    { name: 'Old Harbour Tax Office',                    address: 'Old Harbour, St. Catherine',          lat: 17.9436, lng: -77.1073, phone: '(876) 983-2237' },
    { name: 'May Pen Tax Office',                        address: 'May Pen, Clarendon',                  lat: 17.9650, lng: -77.2430, phone: '(876) 986-2243' },
    { name: 'Linstead Tax Office',                       address: 'Linstead, St. Catherine',             lat: 18.1347, lng: -77.0293, phone: '(876) 985-2273' },
    { name: 'Montego Bay Tax Office',                    address: 'Montego Bay, St. James',              lat: 18.4762, lng: -77.9195, phone: '(876) 952-5440' },
    { name: 'Ocho Rios Tax Office',                      address: 'Ocho Rios, St. Ann',                  lat: 18.4076, lng: -77.1020, phone: '(876) 974-2882' },
    { name: 'Port Antonio Tax Office',                   address: 'Port Antonio, Portland',              lat: 18.1739, lng: -76.4511, phone: '(876) 993-2518' },
    { name: 'Mandeville Tax Office',                     address: 'Mandeville, Manchester',              lat: 18.0411, lng: -77.5076, phone: '(876) 962-2571' },
    { name: 'Black River Tax Office',                    address: 'Black River, St. Elizabeth',          lat: 18.0252, lng: -77.8484, phone: '(876) 965-2228' },
    { name: 'Savanna-la-Mar Tax Office',                 address: 'Savanna-la-Mar, Westmoreland',        lat: 18.2167, lng: -78.1358, phone: '(876) 955-2262' },
    { name: 'Annotto Bay Tax Office',                    address: 'Annotto Bay, St. Mary',               lat: 18.2706, lng: -76.7687, phone: '(876) 996-2257' },
    { name: 'Santa Cruz Tax Office',                     address: 'Santa Cruz, St. Elizabeth',           lat: 18.0500, lng: -77.7167, phone: '(876) 966-2217' },
    { name: 'Inland Revenue Dept — New Kingston',        address: 'New Kingston, Kingston',              lat: 18.0075, lng: -76.7855, phone: '(876) 754-6400' },
  ];

  // ── Dynamically inject Leaflet JS ─────────────────────────
  function loadLeaflet(callback) {
    if (leafletLoaded) { callback(); return; }
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.onload = () => { leafletLoaded = true; callback(); };
    script.onerror = () => console.error('Failed to load Leaflet');
    document.head.appendChild(script);
  }

  // ── Map init ──────────────────────────────────────────────
  function initMap() {
    if (mapInstance) return;

    // FIX 2: buildSidebar() MUST run before L.map() is called.
    // Previously it ran after, which wiped out the #map div that
    // Leaflet had already bound to, orphaning the map instance entirely.
    buildSidebar();

    const bounds = JA_BOUNDS(); // FIX 1 applied here

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

    placeTAJMarkers();
    initLocation();
  }

  // ── TAJ office icons ──────────────────────────────────────
  const tajIcon = () => L.divIcon({
    className: '',
    html: `<div style="
      width:12px;height:12px;border-radius:50%;
      background:#f3c511;border:2px solid #1a1a1a;
      box-shadow:0 0 0 3px rgba(243,197,17,0.25);
    "></div>`,
    iconSize: [12, 12], iconAnchor: [6, 6],
  });

  const tajIconActive = () => L.divIcon({
    className: '',
    html: `<div style="
      width:16px;height:16px;border-radius:50%;
      background:#f3c511;border:2px solid #fff;
      box-shadow:0 0 0 4px rgba(243,197,17,0.5);
    "></div>`,
    iconSize: [16, 16], iconAnchor: [8, 8],
  });

  let officeMarkers = []; // { marker, office, card, index }

  function placeTAJMarkers() {
    TAJ_OFFICES.forEach((office, i) => {
      const marker = L.marker([office.lat, office.lng], { icon: tajIcon() })
        .addTo(mapInstance)
        .bindPopup(`
          <div style="font-family:monospace;font-size:11px;line-height:1.7;">
            <strong style="font-size:12px;display:block;margin-bottom:2px;">${office.name}</strong>
            ${office.address}<br>
            <span style="color:#aaa;">${office.phone}</span>
          </div>
        `, { className: 'map-popup', maxWidth: 230 });

      marker.on('click', () => activateOffice(i));
      officeMarkers.push({ marker, office, card: null, index: i });
    });
  }

  // ── Sidebar ───────────────────────────────────────────────
  function buildSidebar() {
    const mapWrap = document.querySelector('.map-wrap');
    if (!mapWrap || document.getElementById('taj-sidebar')) return;

    // Clear existing content (the old bare #map div + locate-btn)
    mapWrap.innerHTML = '';

    // Sidebar panel
    const sidebar = document.createElement('div');
    sidebar.id = 'taj-sidebar';
    sidebar.innerHTML = `
      <div class="taj-sidebar__header">
        <span class="taj-sidebar__title">TAJ Offices</span>
        <span class="taj-sidebar__count">${TAJ_OFFICES.length} locations</span>
      </div>
      <div class="taj-sidebar__search">
        <input id="taj-search" type="text" placeholder="Search offices…" autocomplete="off" />
      </div>
      <div class="taj-sidebar__list" id="taj-list"></div>
    `;

    // Map panel (re-create the #map div that Leaflet targets)
    const mapPanel = document.createElement('div');
    mapPanel.className = 'map-panel';

    const mapDiv = document.createElement('div');
    mapDiv.id = 'map';
    mapPanel.appendChild(mapDiv);

    // FIX 3: Share button gets a distinct pin/share icon so it's not
    // identical to the Re-centre button, preventing user confusion.
    const shareBtn = document.createElement('button');
    shareBtn.id = 'share-location-btn';
    shareBtn.className = 'map-locate-btn';
    shareBtn.style.top = '52px'; // stack below Re-centre
    shareBtn.title = 'Share my location';
    shareBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="4" r="2.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M8 15 C8 15 3 9.5 3 6.5a5 5 0 0 1 10 0C13 9.5 8 15 8 15Z"
              stroke="currentColor" stroke-width="1.5" fill="none"/>
      </svg>Share Location`;

    const locBtn = document.createElement('button');
    locBtn.id = 'locate-btn';
    locBtn.className = 'map-locate-btn';
    locBtn.title = 'Re-centre on my location';
    locBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/>
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      </svg>Re-centre`;

    mapPanel.appendChild(locBtn);
    mapPanel.appendChild(shareBtn);

    mapWrap.appendChild(sidebar);
    mapWrap.appendChild(mapPanel);

    renderCards(TAJ_OFFICES);
    bindEvents();
  }

  function renderCards(offices) {
    const list = document.getElementById('taj-list');
    if (!list) return;
    list.innerHTML = '';

    if (offices.length === 0) {
      list.innerHTML = '<p class="taj-sidebar__empty">No offices match your search.</p>';
        officeMarkers.forEach(e => e.card = null);
      return;
    }

    // Sort by distance if user location is known
    let display = offices.map(o => ({
      ...o,
      _dist: userLatLng ? haversine(userLatLng.lat, userLatLng.lng, o.lat, o.lng) : null,
      _origIndex: TAJ_OFFICES.findIndex(x => x.name === o.name),
    }));
    if (userLatLng) display.sort((a, b) => a._dist - b._dist);

    display.forEach(office => {
      const card = document.createElement('div');
      card.className = 'taj-card';
      card.dataset.index = office._origIndex;

      const distBadge = office._dist != null
        ? `<span class="taj-card__dist">${office._dist < 1
            ? (office._dist * 1000).toFixed(0) + ' m'
            : office._dist.toFixed(1) + ' km'}</span>`
        : '';

      card.innerHTML = `
        <div class="taj-card__top">
          <span class="taj-card__dot"></span>
          <span class="taj-card__name">${office.name}</span>
          ${distBadge}
        </div>
        <div class="taj-card__addr">${office.address}</div>
        <div class="taj-card__phone">${office.phone}</div>
        <a class="taj-card__directions"
           href="https://www.google.com/maps/dir/?api=1&destination=${office.lat},${office.lng}"
           target="_blank" rel="noopener">Directions ↗</a>
      `;

      card.addEventListener('click', e => {
        if (e.target.tagName === 'A') return;
        activateOffice(office._origIndex);
      });
if (officeMarkers[office._origIndex]) {
  officeMarkers[office._origIndex].card = card;
}
list.appendChild(card);
    });
  }

  function activateOffice(index) {
    const entry = officeMarkers[index];
    if (!entry || !mapInstance) return;

    officeMarkers.forEach(e => e.marker.setIcon(tajIcon()));
    entry.marker.setIcon(tajIconActive());
    mapInstance.setView([entry.office.lat, entry.office.lng], 13, { animate: true });
    entry.marker.openPopup();

    document.querySelectorAll('.taj-card').forEach(c => c.classList.remove('taj-card--active'));
    if (entry.card) {
      entry.card.classList.add('taj-card--active');
      entry.card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function bindEvents() {
    const searchInput = document.getElementById('taj-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.toLowerCase();
        renderCards(TAJ_OFFICES.filter(o =>
          o.name.toLowerCase().includes(q) || o.address.toLowerCase().includes(q)
        ));
      });
    }

    document.getElementById('locate-btn')?.addEventListener('click', e => {
      e.preventDefault();
      if (!mapInstance) loadLeaflet(initMap);
      else if (userLatLng) locateUser();   // FIX 4: was checking userMarker; use userLatLng
      else buildPrompt();
    });

    document.getElementById('share-location-btn')?.addEventListener('click', e => {
      e.preventDefault();
      if (!mapInstance) loadLeaflet(() => { initMap(); buildPrompt(); });
      else buildPrompt();
    });
  }

  // ── Haversine distance (km) ────────────────────────────────
  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ── User location ─────────────────────────────────────────
  const userIcon = () => L.divIcon({
    className: '',
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:#4a90e2;border:2px solid #fff;
      box-shadow:0 0 0 3px rgba(74,144,226,0.35);
    "></div>`,
    iconSize: [14, 14], iconAnchor: [7, 7],
  });

  const statusDot  = () => document.getElementById('status-dot');
  const statusText = () => document.getElementById('status-text');
  const coordsEl   = () => document.getElementById('map-coords');

  function setStatus(state, text) {
    const dot = statusDot(), txt = statusText();
    if (!dot || !txt) return;
    dot.className = `map-status__dot map-status__dot--${state}`;
    txt.textContent = text;
  }

  function locateUser() {
    if (!navigator.geolocation) { setStatus('error', 'Geolocation not supported.'); return; }
    setStatus('loading', 'Locating…');

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        userLatLng = { lat, lng };

        if (userMarker) {
          userMarker.setLatLng([lat, lng]);
        } else {
          userMarker = L.marker([lat, lng], { icon: userIcon() })
            .addTo(mapInstance)
            .bindPopup('<strong style="font-family:monospace;font-size:12px;">You are here</strong>', { className: 'map-popup' });
        }

        mapInstance.setView([lat, lng], 11, { animate: true });
        userMarker.openPopup();
        setStatus('ok', 'Location found');
        const coords = coordsEl();
        if (coords) coords.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

        // Re-sort sidebar by distance
        const q = document.getElementById('taj-search')?.value?.toLowerCase() || '';
        renderCards(q
          ? TAJ_OFFICES.filter(o => o.name.toLowerCase().includes(q) || o.address.toLowerCase().includes(q))
          : TAJ_OFFICES
        );
      },
      err => {
        const msgs = { 1: 'Location access denied.', 2: 'Location unavailable.', 3: 'Request timed out.' };
        setStatus('error', msgs[err.code] || 'Could not get location.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  function removeOverlay() { document.getElementById('loc-overlay')?.remove(); }

  function buildPrompt() {
    removeOverlay();
    const overlay = document.createElement('div');
    overlay.id = 'loc-overlay';
    overlay.innerHTML = `
      <div id="loc-prompt">
        <div class="loc-prompt__icon">
          <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
          </svg>
        </div>
        <h3>Allow location access?</h3>
        <p>RoadReady JA would like to show your position on the map so you can find the nearest TAJ office. Your location is never stored or shared.</p>
        <div class="loc-prompt__actions">
          <button id="loc-allow">Allow</button>
          <button id="loc-deny">Not now</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('loc-allow').addEventListener('click', () => { removeOverlay(); locateUser(); });
    document.getElementById('loc-deny').addEventListener('click', () => { removeOverlay(); setStatus('error', 'Location access not granted.'); });
  }

  function initLocation() {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        // FIX 5: Previously 'prompt' state was silently ignored, leaving
        // first-time visitors stuck on "Waiting for location…" with no prompt.
        // Now we call buildPrompt() for the 'prompt' state so they see the dialog.
        if (result.state === 'granted')  locateUser();
        else if (result.state === 'prompt') buildPrompt();
        else if (result.state === 'denied') setStatus('error', 'Location blocked. Enable it in browser settings.');

        result.onchange = () => {
          if (result.state === 'granted') locateUser();
          if (result.state === 'denied')  setStatus('error', 'Location blocked.');
        };
      }).catch(() => {
        // Permissions API not available — fall back to showing the prompt
        // so the user still has a way to grant access.
        buildPrompt();
      });
    } else {
      // No Permissions API (e.g. older browsers) — show prompt directly
      buildPrompt();
    }
  }

  // ── Bootstrap ─────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const mapSection = document.getElementById('map-section');
    if (!mapSection) return;

    new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        loadLeaflet(initMap);
      }
    }, { rootMargin: '0px 0px 200px 0px' }).observe(mapSection);
  });
})();
