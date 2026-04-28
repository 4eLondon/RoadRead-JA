// map js file

// Map initialization and location handling
document.addEventListener('DOMContentLoaded', function() {
    // ── Map init ───────────────────────────────────────────
    const map = L.map('map', {
        center: [18.1096, -77.2975], // Jamaica default
        zoom: 9,
        zoomControl: false,
    });

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
    }).addTo(map);

    // Move zoom control to bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Custom marker icon matching the site palette
    const userIcon = L.divIcon({
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
    let mapInitialized = false;

    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const coordsEl = document.getElementById('map-coords');
    const locateBtn = document.getElementById('locate-btn');

    function setStatus(state, text) {
        if (!statusDot || !statusText) return;

        // Remove existing status classes
        statusDot.className = 'map-status__dot';
        statusDot.classList.add(`map-status__dot--${state}`);
        statusText.textContent = text;

        console.log(`Location status: ${state} - ${text}`); // Debug log
    }

    function locateUser() {
        console.log('Locate user function called'); // Debug log

        if (!navigator.geolocation) {
            setStatus('error', 'Geolocation not supported by your browser.');
            return;
        }

        setStatus('loading', 'Locating…');

        navigator.geolocation.getCurrentPosition(
            // Success callback
            pos => {
                console.log('Location found:', pos.coords); // Debug log

                const { latitude: lat, longitude: lng } = pos.coords;

                // Drop or move marker
                if (userMarker) {
                    userMarker.setLatLng([lat, lng]);
                } else {
                    userMarker = L.marker([lat, lng], { icon: userIcon })
                        .addTo(map)
                        .bindPopup('<strong style="font-family:monospace;font-size:12px;">You are here</strong>', {
                            className: 'map-popup',
                        });
                }

                map.setView([lat, lng], 13, { animate: true });
                userMarker.openPopup();

                setStatus('ok', 'Location found');
                if (coordsEl) {
                    coordsEl.textContent = lat.toFixed(5) + ', ' + lng.toFixed(5);
                }
            },
            // Error callback
            err => {
                console.error('Geolocation error:', err); // Debug log

                const msgs = {
                    1: 'Location access denied. Please allow location access and try again.',
                    2: 'Location unavailable. Please check your device settings.',
                    3: 'Location request timed out. Please try again.',
                };
                setStatus('error', msgs[err.code] || 'Could not get location.');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }

    // Function to remove overlay if it exists
    function removeOverlay() {
        const existingOverlay = document.getElementById('loc-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
    }

    // Build and show the permission prompt
    function buildPrompt() {
        console.log('Building permission prompt'); // Debug log

        // Remove any existing overlay first
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
                    can find the nearest TAJ office. Your location is never stored
                    or shared.
                </p>
                <div class="loc-prompt__actions">
                    <button id="loc-allow">Allow</button>
                    <button id="loc-deny">Not now</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('loc-allow').addEventListener('click', () => {
            console.log('User clicked Allow'); // Debug log
            removeOverlay();
            locateUser();
        });

        document.getElementById('loc-deny').addEventListener('click', () => {
            console.log('User clicked Deny'); // Debug log
            removeOverlay();
            setStatus('error', 'Location access not granted.');
        });
    }

    // Initialize location handling
    function initLocation() {
        console.log('Initializing location...'); // Debug log

        // Check if we're on HTTPS (required for geolocation in modern browsers)
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            console.warn('Geolocation may require HTTPS'); // Debug log
            setStatus('error', 'Geolocation requires HTTPS connection.');
            return;
        }

        // Check current permission state without triggering the browser dialog
        if (navigator.permissions) {
            navigator.permissions.query({ name: 'geolocation' }).then(result => {
                console.log('Permission state:', result.state); // Debug log

                if (result.state === 'granted') {
                    // Already allowed — locate straight away
                    locateUser();
                } else if (result.state === 'prompt') {
                    // Not yet asked — show our explanation first
                    buildPrompt();
                } else {
                    // 'denied' — tell the user
                    setStatus('error', 'Location blocked. Enable it in browser settings.');
                }

                // React if the user changes the permission while on the page
                result.onchange = () => {
                    console.log('Permission changed to:', result.state); // Debug log
                    if (result.state === 'granted') {
                        locateUser();
                    }
                    if (result.state === 'denied') {
                        setStatus('error', 'Location blocked. Enable it in browser settings.');
                    }
                };
            }).catch(err => {
                console.error('Permissions API error:', err); // Debug log
                // Fallback to prompt
                buildPrompt();
            });
        } else {
            // Permissions API not available — fall back to our prompt
            console.log('Permissions API not available, showing prompt'); // Debug log
            buildPrompt();
        }
    }

    // Make sure map is fully loaded before initializing location
    map.whenReady(() => {
        console.log('Map is ready'); // Debug log
        mapInitialized = true;
        initLocation();
    });

    // Re-centre button click handler
    if (locateBtn) {
        locateBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Re-centre button clicked'); // Debug log
            locateUser();
        });
    }

    // Also try to initialize if map is already ready
    if (map._loaded) {
        console.log('Map already loaded'); // Debug log
        initLocation();
    }
});
