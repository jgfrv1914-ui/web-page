/**
 * app.js — AutoVision 3D Main Application
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsibilities:
 *   • SPA routing (catalog / detail / compare / contact views)
 *   • Fetch car data from the REST API
 *   • Render car cards with search/filter support
 *   • Manage the 3D detail view (loading models, color changes)
 *   • Handle car comparison side-by-side
 *   • Contact/quote form submission
 *   • Dark/light theme toggle
 *   • Toast notification system
 */

let viewer3d = null; // se carga solo cuando se abre un auto con modelo 3D

// ═══════════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════════
const state = {
  cars:         [],    // all cars loaded from API
  filtered:     [],    // currently displayed cars after filters
  currentCar:   null,  // car being viewed in detail
  compareList:  [],    // up to 2 car IDs for comparison
  viewerReady:  false, // has viewer been initialized
  isListView:   false, // grid vs. list view
};

// ═══════════════════════════════════════════════════════════════════════════════
// DOM REFERENCES
// ═══════════════════════════════════════════════════════════════════════════════
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const els = {
  // Views
  views: {
    catalog: $('#view-catalog'),
    detail:  $('#view-detail'),
    compare: $('#view-compare'),
    contact: $('#view-contact'),
  },
  // Nav
  navLinks:    $$('.nav-link'),
  mobileLinks: $$('.mobile-nav__link'),
  hamburger:   $('#hamburger'),
  mobileNav:   $('#mobileNav'),
  navbar:      $('#navbar'),
  themeToggle: $('#themeToggle'),
  // Catalog
  searchInput:      $('#searchInput'),
  searchClear:      $('#searchClear'),
  filterBrand:      $('#filterBrand'),
  filterCategory:   $('#filterCategory'),
  filterYear:       $('#filterYear'),
  filterPrice:      $('#filterPrice'),
  priceDisplay:     $('#priceDisplay'),
  clearFilters:     $('#clearFilters'),
  clearFilters2:    $('#clearFilters2'),
  filterCountBadge: $('#filterCountBadge'),
  activeFilters:    $('#activeFilters'),
  filterBar:        document.querySelector('.filter-bar'),
  resultsCount:   $('#resultsCount'),
  carGrid:        $('#carGrid'),
  noResults:      $('#noResults'),
  gridViewBtn:    $('#gridViewBtn'),
  listViewBtn:    $('#listViewBtn'),
  // Detail
  backToCatalog:    $('#backToCatalog'),
  viewerContainer:  $('#viewerContainer'),
  viewerLoader:     $('#viewerLoader'),
  viewerPlaceholder:$('#viewerPlaceholder'),
  loadProgress:     $('#loadProgress'),
  resetCameraBtn:   $('#resetCameraBtn'),
  colorPicker:      $('#colorPicker'),
  colorSwatches:    $('#colorSwatches'),
  detailBrand:      $('#detailBrand'),
  detailModel:      $('#detailModel'),
  detailYear:       $('#detailYear'),
  detailCategory:   $('#detailCategory'),
  detailRating:     $('#detailRating'),
  detailPrice:      $('#detailPrice'),
  detailDescription:$('#detailDescription'),
  featuresList:     $('#featuresList'),
  requestQuoteBtn:  $('#requestQuoteBtn'),
  testDriveBtn:     $('#testDriveBtn'),
  addToCompareBtn:  $('#addToCompareBtn'),
  // Compare
  compareSlot1: $('#compareSlot1'),
  compareSlot2: $('#compareSlot2'),
  compareTable: $('#compareTable'),
  // Contact
  contactForm:  $('#contactForm'),
  formType:     $('#formType'),
  formCar:      $('#formCar'),
  formTabs:     $$('.form-tab'),
  dateGroup:    $('#dateGroup'),
  formSuccess:  $('#formSuccess'),
  // Hero Video & Controls
  heroVideo:         $('#heroVideo'),
  videoPlayPauseBtn: $('#videoPlayPauseBtn'),
  playPauseIcon:     $('#playPauseIcon'),
  soundToggleBtn:    $('#soundToggleBtn'),
  soundIcon:         $('#soundIcon'),
  heroDiscoverBtn:   $('#heroDiscoverBtn'),
  heroHeadline:      $('#heroHeadline'),
  heroCategoryTag:   $('#heroCategoryTag'),
  carouselDots:      $$('.carousel-dot'),
  // Toast
  toast:        $('#toast'),
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW ROUTING
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Show one of: catalog | detail | compare | contact
 */
function switchView(viewName) {
  // Hide all views
  Object.values(els.views).forEach((v) => v.classList.add('hidden'));
  // Show target
  const target = els.views[viewName];
  if (target) target.classList.remove('hidden');

  // Update active nav link
  [...els.navLinks, ...els.mobileLinks].forEach((link) => {
    link.classList.toggle('active', link.dataset.view === viewName);
  });

  // Close mobile nav
  els.mobileNav.classList.remove('open');

  // Play/pause catalog background video based on visibility
  if (state.catalogBgVideo) {
    if (viewName === 'catalog') state.catalogBgVideo.play().catch(() => {});
    else state.catalogBgVideo.pause();
  }

  // Scroll to top of main content (not full page)
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
// Expose for inline HTML buttons
window.switchView = switchView;

// ═══════════════════════════════════════════════════════════════════════════════
// API LAYER
// ═══════════════════════════════════════════════════════════════════════════════
// Datos del catálogo (sitio de muestra estático: sin servidor). Precios de referencia en dólares.
const BASE = '/portafolio/concesionario';
const CARS = [
  { id: 1, brand: 'Ferrari', model: '488 GTB', year: 2024, category: 'Supercar', price: 280000, rating: 4.9, reviews: 38,
    description: 'Motor V8 biturbo central, aerodinámica de competencia y un sonido inconfundible. Gíralo en la sala 3D (modelo de referencia) y cambia su color.',
    features: ['V8 biturbo de 3,9 L', '0 a 100 km/h en 3,0 s', 'Frenos carbono-cerámicos', 'Modo de manejo en pista'],
    colors: [{ name: 'Rojo', hex: '#9b0f14' }, { name: 'Negro', hex: '#111111' }, { name: 'Amarillo', hex: '#f2c200' }, { name: 'Blanco', hex: '#f1f1f1' }],
    thumbnail: `${BASE}/img/ferrari-488.jpg`, model3d: `${BASE}/modelos/ferrari.glb` },
  { id: 2, brand: 'Lamborghini', model: 'Huracán EVO', year: 2024, category: 'Supercar', price: 261274, rating: 4.8, reviews: 29,
    description: 'V10 atmosférico, tracción total y dirección en las cuatro ruedas para una respuesta inmediata.',
    features: ['V10 de 5,2 L', 'Tracción total', 'Dirección en las 4 ruedas', 'Sistema de manejo predictivo'],
    colors: [{ name: 'Naranja', hex: '#f36b0b' }, { name: 'Verde', hex: '#3aa655' }, { name: 'Gris', hex: '#6b6f74' }],
    thumbnail: `${BASE}/img/lamborghini-huracan.jpg`, model3d: null },
  { id: 3, brand: 'Porsche', model: '911 Carrera S', year: 2023, category: 'Sports', price: 145000, rating: 4.8, reviews: 54,
    description: 'El deportivo de uso diario por excelencia: preciso, cómodo y con motor bóxer trasero.',
    features: ['Bóxer biturbo de 3,0 L', 'Caja PDK de 8 cambios', 'Suspensión adaptativa', 'Modo Sport Plus'],
    colors: [{ name: 'Plata', hex: '#c9ccd1' }, { name: 'Azul', hex: '#1f3a6b' }, { name: 'Negro', hex: '#121212' }],
    thumbnail: `${BASE}/img/porsche-911.jpg`, model3d: null },
  { id: 4, brand: 'BMW', model: 'M4 Competition', year: 2024, category: 'Sports', price: 84900, rating: 4.7, reviews: 61,
    description: 'Coupé de alto desempeño con seis cilindros en línea y tecnología de pista para la calle.',
    features: ['6 cilindros biturbo', '503 hp', 'Tracción xDrive', 'Asientos de carbono'],
    colors: [{ name: 'Verde', hex: '#1f6b3c' }, { name: 'Azul', hex: '#1d4ea8' }, { name: 'Blanco', hex: '#f3f3f3' }],
    thumbnail: `${BASE}/img/bmw-m4.jpg`, model3d: null },
  { id: 5, brand: 'Tesla', model: 'Model S Plaid', year: 2023, category: 'Electric', price: 108990, rating: 4.6, reviews: 47,
    description: 'Sedán eléctrico con tres motores, aceleración extrema y actualizaciones por internet.',
    features: ['Tres motores eléctricos', 'Hasta 600 km de autonomía', 'Carga rápida', 'Pantalla central de 17"'],
    colors: [{ name: 'Blanco', hex: '#f4f4f4' }, { name: 'Negro', hex: '#101010' }, { name: 'Rojo', hex: '#a3161b' }],
    thumbnail: `${BASE}/img/tesla-model-s.jpg`, model3d: null },
];

async function fetchCars() {
  return CARS;
}

// Sitio de muestra: el formulario no envía ni guarda datos personales
async function submitContact() {
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOG: RENDER CARDS
// ═══════════════════════════════════════════════════════════════════════════════
const TIPOS = { Sports: 'Deportivo', Supercar: 'Superdeportivo', Electric: 'Eléctrico', 'Grand Tourer': 'Gran turismo' };
const tipo = (c) => TIPOS[c] || c;

function formatPrice(n) {
  return 'US$' + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n);
}

function renderStars(rating) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

/**
 * Build a car card element from data.
 */
function buildCarCard(car) {
  const inCompare = state.compareList.includes(car.id);
  const card = document.createElement('article');
  card.className = 'car-card';
  card.setAttribute('tabindex', '0');
  card.dataset.carId = car.id;

  card.innerHTML = `
    <span class="car-card__badge">${tipo(car.category)}</span>
    <button class="car-card__compare-toggle ${inCompare ? 'active' : ''}"
            title="${inCompare ? 'Quitar del comparador' : 'Agregar al comparador'}"
            data-id="${car.id}"
            aria-label="Compare toggle">
      ⚖
    </button>

    <div class="car-card__image">
      <img src="${car.thumbnail}" alt="${car.brand} ${car.model}" loading="lazy" />
    </div>

    <div class="car-card__body">
      <div class="car-card__brand">${car.brand}</div>
      <div class="car-card__name">${car.model}</div>
      <div class="car-card__year">${car.year}</div>
      <div class="car-card__rating">
        <span class="stars">${renderStars(car.rating)}</span>
        <span>${car.rating} (${car.reviews} opiniones de muestra)</span>
      </div>
    </div>

    <div class="car-card__colors">
      ${car.colors.slice(0, 5).map(c => `
        <div class="color-dot" style="background:${c.hex}" title="${c.name}"></div>
      `).join('')}
    </div>

    <div class="car-card__footer">
      <div>
        <div class="car-card__price">${formatPrice(car.price)}</div>
        <div class="car-card__price-sub">Precio de referencia</div>
      </div>
      <button class="btn btn--primary btn--sm view3d-btn" data-id="${car.id}">
        ${car.model3d ? 'Ver en 3D' : 'Ver detalle'}
      </button>
    </div>
  `;

  // 3D Perspective Tilt on Mouse Movement
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;
    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.02)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });

  // Open detail view on card click (except button/toggle clicks)
  card.addEventListener('click', (e) => {
    if (e.target.closest('.view3d-btn')) return openCarDetail(car.id);
    if (e.target.closest('.car-card__compare-toggle')) return toggleCompare(car.id);
    openCarDetail(car.id);
  });
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') openCarDetail(car.id);
  });

  return card;
}

/**
 * Generate an SVG placeholder for each car brand (used when no real image/model).
 */
function buildCarSVG(car) {
  const colorMap = {
    Ferrari:       '#cc0000',
    Porsche:       '#8a0000',
    Tesla:         '#e82127',
    Lamborghini:   '#ff6600',
    BMW:           '#0066b1',
    'Mercedes-Benz': '#a0a0a0',
  };
  const bodyColor = colorMap[car.brand] || car.colors[0].hex;

  // Generic sleek car silhouette SVG
  return `
    <svg viewBox="0 0 280 140" xmlns="http://www.w3.org/2000/svg" style="width:85%;height:85%">
      <defs>
        <linearGradient id="body-${car.id}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${bodyColor}" stop-opacity="1"/>
          <stop offset="100%" stop-color="${bodyColor}" stop-opacity="0.6"/>
        </linearGradient>
        <linearGradient id="glass-${car.id}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#aad4f5" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#4a8ab5" stop-opacity="0.5"/>
        </linearGradient>
        <filter id="glow-${car.id}">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      <!-- Shadow -->
      <ellipse cx="140" cy="132" rx="100" ry="8" fill="rgba(0,0,0,0.4)"/>

      <!-- Body -->
      <path d="M30,95 L30,80 Q32,70 55,65 L90,45 Q105,30 140,28 Q175,28 190,30 Q210,32 225,45 L245,65 Q260,72 250,82 L250,95 Z"
            fill="url(#body-${car.id})" filter="url(#glow-${car.id})"/>

      <!-- Roof -->
      <path d="M90,65 L100,42 Q115,28 140,27 Q168,27 182,42 L192,65 Z"
            fill="url(#glass-${car.id})" opacity="0.85"/>

      <!-- Front bumper detail -->
      <path d="M245,68 Q262,72 258,90 L250,90 L248,75 Z"
            fill="${bodyColor}" opacity="0.7"/>
      <!-- Rear bumper detail -->
      <path d="M35,68 Q18,72 22,90 L30,90 L32,75 Z"
            fill="${bodyColor}" opacity="0.7"/>

      <!-- Headlight R -->
      <ellipse cx="246" cy="78" rx="6" ry="3" fill="#fffde7" opacity="0.95"/>
      <ellipse cx="246" cy="78" rx="3" ry="1.5" fill="#fff" opacity="0.9"/>
      <!-- Headlight L -->
      <ellipse cx="34" cy="78" rx="6" ry="3" fill="#ff4444" opacity="0.8"/>

      <!-- Wheel well shapes -->
      <path d="M68,96 Q68,100 80,100 Q92,100 92,96 L90,80 Q80,78 70,80 Z" fill="${bodyColor}" opacity="0.85"/>
      <path d="M188,96 Q188,100 200,100 Q212,100 212,96 L210,80 Q200,78 190,80 Z" fill="${bodyColor}" opacity="0.85"/>

      <!-- Wheels -->
      <circle cx="80" cy="106" r="22" fill="#1a1a1a"/>
      <circle cx="80" cy="106" r="16" fill="#2a2a2a"/>
      <circle cx="80" cy="106" r="8"  fill="#3a3a3a"/>
      <circle cx="80" cy="106" r="3"  fill="#888"/>
      <!-- Rim spokes L -->
      ${[0,60,120,180,240,300].map(a => {
        const rad = a * Math.PI / 180;
        return `<line x1="80" y1="106" x2="${80 + 13*Math.cos(rad)}" y2="${106 + 13*Math.sin(rad)}" stroke="#888" stroke-width="2"/>`;
      }).join('')}

      <circle cx="200" cy="106" r="22" fill="#1a1a1a"/>
      <circle cx="200" cy="106" r="16" fill="#2a2a2a"/>
      <circle cx="200" cy="106" r="8"  fill="#3a3a3a"/>
      <circle cx="200" cy="106" r="3"  fill="#888"/>
      <!-- Rim spokes R -->
      ${[0,60,120,180,240,300].map(a => {
        const rad = a * Math.PI / 180;
        return `<line x1="200" y1="106" x2="${200 + 13*Math.cos(rad)}" y2="${106 + 13*Math.sin(rad)}" stroke="#888" stroke-width="2"/>`;
      }).join('')}

      <!-- Door lines -->
      <line x1="140" y1="65" x2="140" y2="93" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>
      <line x1="108" y1="65" x2="108" y2="93" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
      <line x1="172" y1="65" x2="172" y2="93" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>

      <!-- Door handle -->
      <rect x="120" y="77" width="12" height="3" rx="1.5" fill="rgba(0,0,0,0.4)"/>
      <rect x="152" y="77" width="12" height="3" rx="1.5" fill="rgba(0,0,0,0.4)"/>

      <!-- Roof reflection -->
      <path d="M105,40 Q140,31 175,40 Q165,36 140,34 Q115,36 105,40 Z" fill="white" opacity="0.15"/>

      <!-- Brand text -->
      <text x="140" y="22" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="10" font-family="Inter,sans-serif" font-weight="700" letter-spacing="2">
        ${car.brand.toUpperCase()}
      </text>
    </svg>
  `;
}

/**
 * Render the filtered car list into the grid.
 */
function renderCars(cars) {
  els.carGrid.innerHTML = '';

  if (cars.length === 0) {
    els.noResults.classList.remove('hidden');
    els.resultsCount.textContent = '0 vehículos';
    return;
  }

  els.noResults.classList.add('hidden');
  els.resultsCount.textContent = `${cars.length} vehículo${cars.length !== 1 ? 's' : ''}`;
  els.resultsCount.classList.remove('pulse');
  void els.resultsCount.offsetWidth; // restart animation
  els.resultsCount.classList.add('pulse');
  els.carGrid.classList.toggle('list-view', state.isListView);

  const frag = document.createDocumentFragment();
  cars.forEach((car, i) => {
    const card = buildCarCard(car);
    card.style.setProperty('--card-delay', `${Math.min(i, 12) * 45}ms`);
    frag.appendChild(card);
  });
  els.carGrid.appendChild(frag);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTERS
// ═══════════════════════════════════════════════════════════════════════════════
function applyFilters() {
  const search   = els.searchInput.value.toLowerCase().trim();
  const brand    = els.filterBrand.value;
  const category = els.filterCategory.value;
  const year     = els.filterYear.value;
  const maxPrice = parseInt(els.filterPrice.value);
  const priceMax = parseInt(els.filterPrice.max);

  state.filtered = state.cars.filter((car) => {
    if (brand    && car.brand    !== brand)          return false;
    if (category && car.category !== category)       return false;
    if (year     && car.year     !== parseInt(year)) return false;
    if (car.price > maxPrice)                        return false;
    if (search && !`${car.brand} ${car.model} ${car.description}`.toLowerCase().includes(search)) return false;
    return true;
  });

  els.searchClear.classList.toggle('hidden', !search);
  els.filterBrand.classList.toggle('is-active', !!brand);
  els.filterCategory.classList.toggle('is-active', !!category);
  els.filterYear.classList.toggle('is-active', !!year);

  renderActiveFilters({ search, brand, category, year, maxPrice, priceMax });
  renderCars(state.filtered);
}

function renderActiveFilters({ search, brand, category, year, maxPrice, priceMax }) {
  const chips = [];
  if (search)   chips.push({ key: 'search',   label: `“${els.searchInput.value.trim()}”` });
  if (brand)    chips.push({ key: 'brand',    label: brand });
  if (category) chips.push({ key: 'category', label: tipo(category) });
  if (year)     chips.push({ key: 'year',     label: year });
  if (maxPrice < priceMax) chips.push({ key: 'price', label: `Hasta ${formatPrice(maxPrice)}` });

  els.filterBar.classList.toggle('has-active', chips.length > 0);
  els.filterCountBadge.classList.toggle('hidden', chips.length === 0);
  els.filterCountBadge.textContent = chips.length;

  if (chips.length === 0) {
    els.activeFilters.classList.add('hidden');
    els.activeFilters.innerHTML = '';
    return;
  }

  els.activeFilters.classList.remove('hidden');
  els.activeFilters.innerHTML = chips.map((c) => `
    <span class="filter-chip" data-key="${c.key}">
      ${c.label}
      <button type="button" aria-label="Quitar filtro" data-key="${c.key}">✕</button>
    </span>
  `).join('');

  els.activeFilters.querySelectorAll('button[data-key]').forEach((btn) => {
    btn.addEventListener('click', () => removeFilter(btn.dataset.key));
  });
}

function removeFilter(key) {
  if (key === 'search')   els.searchInput.value = '';
  if (key === 'brand')    els.filterBrand.value = '';
  if (key === 'category') els.filterCategory.value = '';
  if (key === 'year')     els.filterYear.value = '';
  if (key === 'price') {
    els.filterPrice.value = els.filterPrice.max;
    updatePriceSliderFill();
    els.priceDisplay.textContent = formatPrice(parseInt(els.filterPrice.max));
  }
  applyFilters();
}

function updatePriceSliderFill() {
  const min = parseInt(els.filterPrice.min);
  const max = parseInt(els.filterPrice.max);
  const val = parseInt(els.filterPrice.value);
  const pct = ((val - min) / (max - min)) * 100;
  els.filterPrice.style.setProperty('--fill', `${pct}%`);
}

function clearAllFilters() {
  els.searchInput.value    = '';
  els.filterBrand.value    = '';
  els.filterCategory.value = '';
  els.filterYear.value     = '';
  els.filterPrice.value    = els.filterPrice.max;
  els.priceDisplay.textContent = formatPrice(parseInt(els.filterPrice.max));
  updatePriceSliderFill();
  applyFilters();
}

function populateBrandFilter() {
  const brands = [...new Set(state.cars.map((c) => c.brand))].sort();
  brands.forEach((b) => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = b;
    els.filterBrand.appendChild(opt);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAR DETAIL + 3D VIEWER
// ═══════════════════════════════════════════════════════════════════════════════
async function openCarDetail(carId) {
  const car = state.cars.find((c) => c.id === carId);
  if (!car) return;
  state.currentCar = car;

  // ── Populate info panel ──────────────────────────────────────────────────
  els.detailBrand.textContent       = car.brand;
  els.detailModel.textContent       = car.model;
  els.detailYear.textContent        = car.year;
  els.detailCategory.textContent    = tipo(car.category);
  els.detailRating.innerHTML        = `<span class="stars">${renderStars(car.rating)}</span> ${car.rating}/5 · ${car.reviews} opiniones de muestra`;
  els.detailPrice.textContent       = formatPrice(car.price);
  els.detailDescription.textContent = car.description;

  // Features
  els.featuresList.innerHTML = car.features
    .map((f) => `<li>${f}</li>`)
    .join('');

  // Color swatches
  els.colorSwatches.innerHTML = car.colors
    .map((c, i) => `
      <div class="color-swatch ${i === 0 ? 'active' : ''}" data-hex="${c.hex}" data-name="${c.name}">
        <div class="color-swatch__circle" style="background:${c.hex}"></div>
        <span class="color-swatch__name">${c.name}</span>
      </div>
    `).join('');

  // Swatch click handlers
  $$('.color-swatch').forEach((sw) => {
    sw.addEventListener('click', () => {
      $$('.color-swatch').forEach((s) => s.classList.remove('active'));
      sw.classList.add('active');
      viewer3d?.changeColor(sw.dataset.hex);
      showToast(`Color: ${sw.dataset.name}`, 'info');
    });
  });

  // Update add-to-compare button label
  const inCompare = state.compareList.includes(car.id);
  els.addToCompareBtn.textContent = inCompare ? '✓ En el comparador' : '+ Agregar al comparador';

  // ── Switch to detail view ─────────────────────────────────────────────────
  switchView('detail');

  const foto = document.getElementById('viewerFoto');
  if (!car.model3d) {
    els.viewerLoader.classList.add('hidden');
    if (renderer3dCanvas()) renderer3dCanvas().style.display = 'none';
    foto.src = car.thumbnail;
    foto.alt = `${car.brand} ${car.model}`;
    els.viewerPlaceholder.classList.remove('hidden');
    els.colorPicker.style.display = 'none';
    return;
  }
  els.colorPicker.style.display = '';
  if (renderer3dCanvas()) renderer3dCanvas().style.display = '';
  if (!viewer3d) viewer3d = (await import('./viewer3d.js')).default;
  // ── Initialize & load 3D viewer ───────────────────────────────────────────
  if (!state.viewerReady) {
    viewer3d.init(els.viewerContainer);
    state.viewerReady = true;
  }

  // Show loader
  els.viewerLoader.classList.remove('hidden');
  els.viewerPlaceholder.classList.add('hidden');
  els.loadProgress.style.width = '0%';

  try {
    await viewer3d.load(
      car.model3d,
      (pct) => { els.loadProgress.style.width = pct + '%'; },
      (err) => {
        console.warn('[App] 3D model not found – showing placeholder');
        els.viewerLoader.classList.add('hidden');
        els.viewerPlaceholder.classList.remove('hidden');
      }
    );
    els.viewerLoader.classList.add('hidden');
    // Apply first color
    viewer3d.changeColor(car.colors[0].hex);
  } catch {
    // Model not available – placeholder is shown by error callback
  }
}

function renderer3dCanvas() {
  return els.viewerContainer.querySelector('canvas');
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════
function toggleCompare(carId) {
  const idx = state.compareList.indexOf(carId);
  if (idx !== -1) {
    state.compareList.splice(idx, 1);
    showToast('Quitado del comparador', 'info');
  } else {
    if (state.compareList.length >= 2) {
      showToast('Puedes comparar 2 autos. Quita uno primero.', 'error');
      return;
    }
    state.compareList.push(carId);
    showToast('Agregado al comparador ⚖', 'success');
  }
  // Re-render cards so toggle state is reflected
  renderCars(state.filtered);
  updateCompareView();
}

function updateCompareView() {
  const slots = [els.compareSlot1, els.compareSlot2];
  slots.forEach((slot, i) => {
    const carId = state.compareList[i];
    const car   = carId ? state.cars.find((c) => c.id === carId) : null;

    if (car) {
      slot.classList.add('filled');
      slot.innerHTML = `
        <div class="compare-slot__car-preview">
          <img src="${car.thumbnail}" alt="${car.brand} ${car.model}" style="width:100%;height:150px;object-fit:cover;border-radius:12px;margin-bottom:8px;" />
          <strong style="display:block;text-align:center;margin-top:4px">${car.brand} ${car.model}</strong>
          <p style="text-align:center;color:var(--text-secondary);font-size:.85rem">${car.year} · ${formatPrice(car.price)}</p>
          <button class="btn btn--ghost btn--sm" style="margin:8px auto;display:block"
                  onclick="window.toggleCompareById(${car.id})">Quitar ×</button>
        </div>
      `;
    } else {
      slot.classList.remove('filled');
      slot.innerHTML = `
        <div class="compare-slot__placeholder">
          <span>➕</span>
          <p>Elige el auto ${i + 1}</p>
          <button class="btn btn--primary btn--sm" onclick="window.switchView('catalog')">Ver catálogo</button>
        </div>
      `;
    }
  });

  // Build comparison table if 2 cars selected
  if (state.compareList.length === 2) {
    const [a, b] = state.compareList.map((id) => state.cars.find((c) => c.id === id));
    renderCompareTable(a, b);
  } else {
    els.compareTable.innerHTML = '';
  }
}

function renderCompareTable(a, b) {
  const highlight = (va, vb, lowerBetter = false) => {
    if (va === vb) return ['', ''];
    const aWins = lowerBetter ? va < vb : va > vb;
    return [aWins ? 'highlight' : '', aWins ? '' : 'highlight'];
  };

  const [priceClass] = highlight(a.price, b.price, true); // lower price is "better"
  const priceClasses = [
    a.price <= b.price ? 'highlight' : '',
    b.price <= a.price ? 'highlight' : '',
  ];

  els.compareTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th class="row-label">Característica</th>
          <th>${a.brand} ${a.model}</th>
          <th>${b.brand} ${b.model}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="row-label">Año</td>
          <td>${a.year}</td>
          <td>${b.year}</td>
        </tr>
        <tr>
          <td class="row-label">Tipo</td>
          <td>${tipo(a.category)}</td>
          <td>${tipo(b.category)}</td>
        </tr>
        <tr>
          <td class="row-label">Precio de referencia</td>
          <td class="${priceClasses[0]}">${formatPrice(a.price)}</td>
          <td class="${priceClasses[1]}">${formatPrice(b.price)}</td>
        </tr>
        <tr>
          <td class="row-label">Calificación</td>
          <td class="${highlight(a.rating, b.rating)[0]}">${a.rating} ★ (${a.reviews})</td>
          <td class="${highlight(a.rating, b.rating)[1]}">${b.rating} ★ (${b.reviews})</td>
        </tr>
        ${a.features.map((f, i) => `
          <tr>
            <td class="row-label">Destacado ${i + 1}</td>
            <td>${f}</td>
            <td>${b.features[i] || '—'}</td>
          </tr>
        `).join('')}
        <tr>
          <td class="row-label">Colores</td>
          <td>
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              ${a.colors.map(c => `<div class="color-dot" style="background:${c.hex}" title="${c.name}"></div>`).join('')}
            </div>
          </td>
          <td>
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              ${b.colors.map(c => `<div class="color-dot" style="background:${c.hex}" title="${c.name}"></div>`).join('')}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  `;
}

window.toggleCompareById = (id) => toggleCompare(id);

// ═══════════════════════════════════════════════════════════════════════════════
// CONTACT FORM
// ═══════════════════════════════════════════════════════════════════════════════
function populateCarDropdown() {
  state.cars.forEach((car) => {
    const opt = document.createElement('option');
    opt.value = car.id;
    opt.textContent = `${car.brand} ${car.model} (${car.year})`;
    els.formCar.appendChild(opt);
  });
}

function setupContactForm() {
  // Tab switching
  els.formTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      els.formTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      els.formType.value = tab.dataset.type;
      // Show date picker only for test drive
      els.dateGroup.classList.toggle('hidden', tab.dataset.type !== 'test_drive');
    });
  });

  // Form submit
  els.contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateContactForm()) return;

    const btn     = els.submitBtn;
    const btnText = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.btn-spinner');
    btn.disabled  = true;
    btnText.classList.add('hidden');
    spinner.classList.remove('hidden');

    try {
      const selectedOpt = els.formCar.selectedOptions[0];
      await submitContact({
        name:    $('#formName').value.trim(),
        email:   $('#formEmail').value.trim(),
        phone:   $('#formPhone').value.trim(),
        message: $('#formMessage').value.trim(),
        carId:   els.formCar.value || null,
        carName: selectedOpt?.textContent || null,
        type:    els.formType.value,
        date:    $('#formDate')?.value || null,
      });

      els.formSuccess.classList.remove('hidden');
      els.contactForm.reset();
      showToast('Sitio de muestra: no se envió nada 🙂', 'info');
    } catch (err) {
      showToast('No se pudo enviar', 'error');
    } finally {
      btn.disabled = false;
      btnText.classList.remove('hidden');
      spinner.classList.add('hidden');
    }
  });
}

function validateContactForm() {
  let valid = true;
  const name    = $('#formName');
  const email   = $('#formEmail');
  const message = $('#formMessage');

  // Clear previous errors
  $$('.form-error').forEach((el) => (el.textContent = ''));
  [name, email, message].forEach((el) => el.classList.remove('error'));

  if (!name.value.trim()) {
    $('#nameError').textContent = 'Escribe tu nombre.';
    name.classList.add('error');
    valid = false;
  }
  if (!email.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    $('#emailError').textContent = 'Escribe un correo válido.';
    email.classList.add('error');
    valid = false;
  }
  if (!message.value.trim()) {
    $('#messageError').textContent = 'Escribe un mensaje.';
    message.classList.add('error');
    valid = false;
  }

  return valid;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THEME TOGGLE
// ═══════════════════════════════════════════════════════════════════════════════
const THEME_KEY = 'theme_v2';

function setupTheme() {
  let saved = 'dark';
  try { saved = localStorage.getItem(THEME_KEY) || 'dark'; } catch {}
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);

  els.themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next    = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem(THEME_KEY, next); } catch {}
    updateThemeIcon(next);
  });
}

function updateThemeIcon(theme) {
  const label = theme === 'dark' ? 'Modo claro' : 'Modo oscuro';
  els.themeToggle.querySelector('.theme-icon').textContent = label;
  els.themeToggle.setAttribute('aria-label', label);
  els.themeToggle.title = label;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════════════════════════
let toastTimer;
function showToast(msg, type = 'info') {
  clearTimeout(toastTimer);
  els.toast.textContent  = msg;
  els.toast.className    = `toast show ${type}`;
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 3500);
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAVBAR EFFECTS
// ═══════════════════════════════════════════════════════════════════════════════
function setupNavbar() {
  // Scroll effect
  window.addEventListener('scroll', () => {
    els.navbar.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });

  // Hamburger
  els.hamburger.addEventListener('click', () => {
    els.mobileNav.classList.toggle('open');
  });

  // Nav link clicks
  [...els.navLinks, ...els.mobileLinks].forEach((link) => {
    link.addEventListener('click', (e) => {
      const view = link.dataset.view;
      if (view) {
        e.preventDefault();
        switchView(view);
        if (view === 'compare') updateCompareView();
      }
    });
  });

  // Footer links
  $$('.footer__links a[data-view]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(a.dataset.view);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MISC EVENT BINDINGS
// ═══════════════════════════════════════════════════════════════════════════════
function bindMiscEvents() {
  // Hero buttons
  els.heroCatalogBtn?.addEventListener('click', () => switchView('catalog'));
  els.heroContactBtn?.addEventListener('click', () => switchView('contact'));

  // Back button
  els.backToCatalog.addEventListener('click', () => switchView('catalog'));

  // Reset camera
  els.resetCameraBtn.addEventListener('click', () => {
    viewer3d?.resetCamera();
    showToast('Cámara centrada', 'info');
  });

  // Request quote (pre-selects car)
  els.requestQuoteBtn.addEventListener('click', () => {
    if (state.currentCar) {
      els.formCar.value = state.currentCar.id;
    }
    switchView('contact');
  });

  // Test drive (pre-selects car, switches to test drive tab)
  els.testDriveBtn.addEventListener('click', () => {
    if (state.currentCar) {
      els.formCar.value = state.currentCar.id;
    }
    // Activate test drive tab
    els.formTabs.forEach((t) => {
      const isTestDrive = t.dataset.type === 'test_drive';
      t.classList.toggle('active', isTestDrive);
      if (isTestDrive) {
        els.formType.value = 'test_drive';
        els.dateGroup.classList.remove('hidden');
      }
    });
    switchView('contact');
  });

  // Add to compare
  els.addToCompareBtn.addEventListener('click', () => {
    if (state.currentCar) toggleCompare(state.currentCar.id);
  });

  // Filters
  els.searchInput.addEventListener('input',  applyFilters);
  els.searchClear.addEventListener('click', () => {
    els.searchInput.value = '';
    els.searchInput.focus();
    applyFilters();
  });
  els.filterBrand.addEventListener('change', applyFilters);
  els.filterCategory.addEventListener('change', applyFilters);
  els.filterYear.addEventListener('change',  applyFilters);
  els.filterPrice.addEventListener('input', () => {
    els.priceDisplay.textContent = formatPrice(parseInt(els.filterPrice.value));
    updatePriceSliderFill();
    applyFilters();
  });
  els.clearFilters?.addEventListener('click',  clearAllFilters);
  els.clearFilters2?.addEventListener('click', clearAllFilters);

  // View toggle (grid / list)
  els.gridViewBtn.addEventListener('click', () => {
    state.isListView = false;
    els.gridViewBtn.classList.add('active');
    els.listViewBtn.classList.remove('active');
    renderCars(state.filtered);
  });
  els.listViewBtn.addEventListener('click', () => {
    state.isListView = true;
    els.listViewBtn.classList.add('active');
    els.gridViewBtn.classList.remove('active');
    renderCars(state.filtered);
  });
}

// ─── HERO VIDEO & INTERACTIVE CONTROLS ───────────────────────
let audioCtx = null;
let engineOsc1 = null;
let engineOsc2 = null;
let engineGain = null;
let isAudioPlaying = false;

function setupHeroVideo() {
  if (!els.heroVideo) return;

  // 1. Play / Pause video toggle
  els.videoPlayPauseBtn?.addEventListener('click', () => {
    if (els.heroVideo.paused) {
      els.heroVideo.play();
      if (els.playPauseIcon) els.playPauseIcon.textContent = '⏸';
      showToast('Video en reproducción', 'info');
    } else {
      els.heroVideo.pause();
      if (els.playPauseIcon) els.playPauseIcon.textContent = '▶';
      showToast('Video pausado', 'info');
    }
  });

  // Bloque editorial: abre la sala 3D (Ferrari)
  document.getElementById('editorialActionBtn')?.addEventListener('click', () => openCarDetail(1));

  // 2. Discover Button -> scroll smoothly to catalog
  els.heroDiscoverBtn?.addEventListener('click', () => {
    switchView('catalog');
    const catalogEl = document.getElementById('view-catalog');
    if (catalogEl) catalogEl.scrollIntoView({ behavior: 'smooth' });
  });

  // 3. Engine Roar Sound Synthesizer (Web Audio API)
  els.soundToggleBtn?.addEventListener('click', () => {
    if (!isAudioPlaying) {
      startEngineSound();
      isAudioPlaying = true;
      if (els.soundIcon) els.soundIcon.textContent = '🔊';
      showToast('Motor V8 rugiendo 🏎️💨', 'success');
    } else {
      stopEngineSound();
      isAudioPlaying = false;
      if (els.soundIcon) els.soundIcon.textContent = '🔇';
      showToast('Sonido silenciado', 'info');
    }
  });

  // 4. Carousel Dots (Interactive Spotlight Switcher)
  const spotlights = [
    { title: 'ARRANCA EL MOTOR', tag: 'Sports Cars' },
    { title: 'FUERZA PURA V10', tag: 'Supercar' },
    { title: 'PRECISIÓN ALEMANA', tag: 'Track Ready' },
    { title: 'POTENCIA ELÉCTRICA', tag: 'Hyper-EV' },
  ];

  els.carouselDots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      els.carouselDots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');

      const item = spotlights[idx] || spotlights[0];
      if (els.heroHeadline) els.heroHeadline.textContent = item.title;
      if (els.heroCategoryTag) els.heroCategoryTag.textContent = item.tag;

      if (els.heroVideo && els.heroVideo.duration) {
        els.heroVideo.currentTime = (els.heroVideo.duration / 4) * idx;
      }

      if (isAudioPlaying && engineOsc1) revEngine();
    });
  });

  // 5. Interactive Mouse Parallax over Hero
  const heroSection = document.getElementById('hero');
  if (heroSection) {
    heroSection.addEventListener('mousemove', (e) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      const moveX = (clientX - innerWidth / 2) * 0.015;
      const moveY = (clientY - innerHeight / 2) * 0.015;
      if (els.heroVideo) {
        els.heroVideo.style.transform = `scale(1.05) translate(${moveX}px, ${moveY}px)`;
      }
    });
  }
}

function startEngineSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    engineGain = audioCtx.createGain();
    engineGain.gain.setValueAtTime(0.08, audioCtx.currentTime);

    engineOsc1 = audioCtx.createOscillator();
    engineOsc1.type = 'sawtooth';
    engineOsc1.frequency.setValueAtTime(55, audioCtx.currentTime);

    engineOsc2 = audioCtx.createOscillator();
    engineOsc2.type = 'triangle';
    engineOsc2.frequency.setValueAtTime(110, audioCtx.currentTime);

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, audioCtx.currentTime);

    engineOsc1.connect(filter);
    engineOsc2.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(audioCtx.destination);

    engineOsc1.start();
    engineOsc2.start();
    revEngine();
  } catch (err) {
    console.warn('Audio not supported:', err);
  }
}

function revEngine() {
  if (!audioCtx || !engineOsc1) return;
  const now = audioCtx.currentTime;
  engineOsc1.frequency.exponentialRampToValueAtTime(160, now + 0.3);
  engineOsc2.frequency.exponentialRampToValueAtTime(320, now + 0.3);
  engineGain.gain.linearRampToValueAtTime(0.18, now + 0.3);

  engineOsc1.frequency.exponentialRampToValueAtTime(60, now + 1.2);
  engineOsc2.frequency.exponentialRampToValueAtTime(120, now + 1.2);
  engineGain.gain.linearRampToValueAtTime(0.08, now + 1.2);
}

function stopEngineSound() {
  if (engineGain && audioCtx) {
    engineGain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    setTimeout(() => {
      try {
        if (engineOsc1) { engineOsc1.stop(); engineOsc1.disconnect(); engineOsc1 = null; }
        if (engineOsc2) { engineOsc2.stop(); engineOsc2.disconnect(); engineOsc2 = null; }
      } catch (e) {}
    }, 250);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOG INTERACTIVE BACKGROUND (glow parallax + particles)
// ═══════════════════════════════════════════════════════════════════════════════
function setupCatalogBackground() {
  const bg = document.getElementById('catalogBg');
  const canvas = document.getElementById('particlesCanvas');
  if (!bg || !canvas) return;

  const glows = bg.querySelectorAll('.catalog-bg__glow');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Background video: pause when reduced motion, tab hidden, or catalog not visible
  const bgVideo = document.getElementById('catalogBgVideo');
  if (bgVideo) {
    if (reduced) {
      bgVideo.pause();
      bgVideo.removeAttribute('autoplay');
    } else {
      bgVideo.play().catch(() => {});
    }
    document.addEventListener('visibilitychange', () => {
      if (reduced) return;
      if (document.hidden) bgVideo.pause();
      else if (!els.views.catalog.classList.contains('hidden')) bgVideo.play().catch(() => {});
    });
    state.catalogBgVideo = bgVideo;
  }

  // Mouse-follow parallax on the glow blobs
  if (!reduced) {
    bg.addEventListener('mousemove', (e) => {
      const rect = bg.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      glows.forEach((glow, i) => {
        const strength = (i + 1) * 18;
        glow.style.marginLeft = `${px * strength}px`;
        glow.style.marginTop  = `${py * strength}px`;
      });
    });
    bg.addEventListener('mouseleave', () => {
      glows.forEach((glow) => {
        glow.style.marginLeft = '0px';
        glow.style.marginTop  = '0px';
      });
    });
  }

  // Lightweight twinkling particle field
  const ctx = canvas.getContext('2d');
  let particles = [];
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    const rect = bg.getBoundingClientRect();
    canvas.width  = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width  = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.min(70, Math.floor((rect.width * rect.height) / 14000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * rect.width,
      y: Math.random() * rect.height,
      r: Math.random() * 1.8 + 0.4,
      speed: Math.random() * 0.25 + 0.05,
      drift: (Math.random() - 0.5) * 0.15,
      twinkle: Math.random() * Math.PI * 2,
    }));
  }

  function tick() {
    const rect = bg.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    particles.forEach((p) => {
      p.y -= p.speed;
      p.x += p.drift;
      p.twinkle += 0.02;
      if (p.y < -5) { p.y = rect.height + 5; p.x = Math.random() * rect.width; }
      const alpha = 0.35 + Math.sin(p.twinkle) * 0.3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(5, 150, 105, ${Math.max(0, alpha * 0.5)})`;
      ctx.fill();
    });
    if (!reduced) requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener('resize', resize);
  tick();
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOOTSTRAP
// ═══════════════════════════════════════════════════════════════════════════════
async function bootstrap() {
  setupTheme();
  setupNavbar();
  setupHeroVideo();
  bindMiscEvents();
  setupContactForm();
  setupCatalogBackground();

  try {
    state.cars    = await fetchCars();
    state.filtered = [...state.cars];
    populateBrandFilter();
    populateCarDropdown();
    renderCars(state.cars);
    // Update price slider max based on data
    const maxCarPrice = Math.max(...state.cars.map((c) => c.price));
    const roundedMax  = Math.ceil(maxCarPrice / 10000) * 10000;
    els.filterPrice.max   = roundedMax;
    els.filterPrice.value = roundedMax;
    els.priceDisplay.textContent = formatPrice(roundedMax);
    updatePriceSliderFill();
  } catch (err) {
    console.error('[App] Failed to load cars:', err);
    els.carGrid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:4rem;color:var(--text-secondary)">
        <p style="font-size:3rem">⚠️</p>
        <p>No se pudo cargar el catálogo.</p>
      </div>
    `;
  }
}

// Start the app
bootstrap();
