/**
 * Weathrly — Premium Weather Dashboard
 */

/* ─────────────────────────────────────────
   CONSTANTS & CONFIG
───────────────────────────────────────── */
const API_BASE = 'https://php.sujal-subedi96.workers.dev/?cityName=';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in ms
const DEFAULT_CITY = 'Chisapani';

/* ─────────────────────────────────────────
   DOM REFERENCES
───────────────────────────────────────── */
const searchInput   = document.getElementById('search-input');
const searchBtn     = document.getElementById('search-btn');
const refreshBtn    = document.getElementById('refresh-btn');
const currentDate   = document.getElementById('current-date');
const loadingState  = document.getElementById('loading-state');
const errorState    = document.getElementById('error-state');
const weatherContent= document.getElementById('weather-content');

// Left Panel
const windValue      = document.getElementById('wind-value');
const windSub        = document.getElementById('wind-sub');
const humidityValue  = document.getElementById('humidity-value');
const humiditySub    = document.getElementById('humidity-sub');
const uvValue        = document.getElementById('uv-value');
const uvSub          = document.getElementById('uv-sub');
const visibilityValue= document.getElementById('visibility-value');
const visibilitySub  = document.getElementById('visibility-sub');
const dangerPercent  = document.getElementById('danger-percent');
const mapLocation    = document.getElementById('map-location');

// Center Panel
const weatherCondition  = document.getElementById('weather-condition');
const temperature       = document.getElementById('temperature');
const tempHigh          = document.getElementById('temp-high');
const tempLow           = document.getElementById('temp-low');
const weatherDescription= document.getElementById('weather-description');
const cityName          = document.getElementById('city-name');
const forecastRow       = document.getElementById('forecast-row');
const forecastDays      = document.getElementById('forecast-days');

// Right Panel
const windSpeedRight = document.getElementById('wind-speed-right');
const windTime       = document.getElementById('wind-time');
const sunriseTime    = document.getElementById('sunrise-time');
const sunsetTime     = document.getElementById('sunset-time');

/* ─────────────────────────────────────────
   STATE
───────────────────────────────────────── */
let currentCity = DEFAULT_CITY;
let currentData = null;

/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  updateDateDisplay();
  initRainCanvas();
  setupEventListeners();
  fetchWeather(DEFAULT_CITY);
});

/* ─────────────────────────────────────────
   EVENT LISTENERS
───────────────────────────────────────── */
function setupEventListeners() {
  searchBtn.addEventListener('click', handleSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
  refreshBtn.addEventListener('click', () => {
    fetchWeather(currentCity, true); // force bypass cache
  });
}

function handleSearch() {
  const query = searchInput.value.trim();
  if (!query) return;
  fetchWeather(query);
  searchInput.blur();
}

/* ─────────────────────────────────────────
   DATE DISPLAY
───────────────────────────────────────── */
function updateDateDisplay() {
  const now = new Date();
  const opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  currentDate.textContent = now.toLocaleDateString('en-US', opts);
}

/* ─────────────────────────────────────────
   CACHE HELPERS
───────────────────────────────────────── */
function getCached(city) {
  try {
    const raw = localStorage.getItem(`weathrly_${city.toLowerCase()}`);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function setCache(city, data) {
  try {
    localStorage.setItem(`weathrly_${city.toLowerCase()}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch { /* ignore */ }
}

/* ─────────────────────────────────────────
   FETCH WEATHER
───────────────────────────────────────── */
async function fetchWeather(city, forceRefresh = false) {
  currentCity = city;
  showState('loading');

  // Check cache first (unless forced)
  if (!forceRefresh) {
    const cached = getCached(city);
    if (cached) {
      currentData = cached;
      renderWeather(cached);
      return;
    }
  }

  try {
    const res = await fetch(`${API_BASE}${encodeURIComponent(city)}`);
    if (!res.ok) {
      // Attempt stale cache fallback
      const stale = localStorage.getItem(`weathrly_${city.toLowerCase()}`);
      if (stale) {
        const { data } = JSON.parse(stale);
        currentData = data;
        renderWeather(data);
        return;
      }
      throw new Error(res.status === 404 ? 'City not found' : 'Server error');
    }
    const data = await res.json();
    setCache(city, data);
    currentData = data;
    renderWeather(data);
  } catch (err) {
    // Try stale cache as last resort
    const stale = localStorage.getItem(`weathrly_${city.toLowerCase()}`);
    if (stale) {
      try {
        const { data } = JSON.parse(stale);
        currentData = data;
        renderWeather(data);
        return;
      } catch { /* fall through */ }
    }
    showError(err.message);
  }
}

/* ─────────────────────────────────────────
   UI STATE MANAGER
───────────────────────────────────────── */
function showState(state) {
  loadingState.classList.toggle('hidden', state !== 'loading');
  errorState.classList.toggle('hidden', state !== 'error');
  weatherContent.classList.toggle('hidden', state !== 'weather');
}

function showError(msg) {
  document.getElementById('error-title').textContent = msg === 'City not found'
    ? 'City not found'
    : 'Connection error';
  document.getElementById('error-msg').textContent = msg === 'City not found'
    ? 'Please check the city name and try again.'
    : 'Unable to reach the weather service. Please try again.';
  showState('error');
}

/* ─────────────────────────────────────────
   RENDER WEATHER
───────────────────────────────────────── */
function renderWeather(data) {
  showState('weather');

  const tempC = Math.round(data.temp ?? 0);
  const feelsLike = Math.round(data.feels_like ?? data.temp ?? 0);
  const wind = data.wind ?? 0;
  const humidity = data.humidity ?? 0;
  const pressure = data.pressure ?? 1013;
  const vis = Math.round((data.visibility ?? 10000) / 1000);
  const description = data.description ?? 'Clear sky';
  const city = data.city ?? currentCity;
  const country = data.country ?? '';
  const createdAt = data.created_at ? new Date(data.created_at) : new Date();

  // Derived values
  const high = tempC + 5;
  const low  = tempC - 5;
  const windKmh = Math.round(wind * 3.6);

  // ── Left Panel ──
  windValue.textContent = windKmh;
  windSub.textContent   = formatTime(createdAt);
  humidityValue.textContent = humidity;
  humiditySub.textContent   = humidityLabel(humidity);
  uvValue.textContent  = '4.6';
  uvSub.textContent    = 'Moderate UV';
  visibilityValue.textContent = vis;
  visibilitySub.textContent   = vis > 8 ? 'Good visibility' : vis > 4 ? 'Moderate' : 'Low visibility';
  dangerPercent.textContent   = ((humidity / 1000) * 10).toFixed(1) + '%';
  mapLocation.textContent     = `${city}, ${country}`;

  // ── Center Panel ──
  weatherCondition.textContent = buildConditionTitle(description);
  temperature.textContent      = tempC;
  tempHigh.textContent         = `${high}°`;
  tempLow.textContent          = `${low}°`;
  weatherDescription.textContent = buildDescription(description, tempC, feelsLike, wind, humidity);
  cityName.textContent         = `${city}, ${country}`;

  renderForecast(tempC);
  renderWaveChart(tempC, high, low);

  // ── Right Panel ──
  windSpeedRight.textContent = windKmh;
  windTime.textContent       = formatTime(createdAt);
  renderWindChart(windKmh);
  renderSunriseArc(createdAt);
  renderPressureGauge(pressure);
}

/* ─────────────────────────────────────────
   HELPER FUNCTIONS
───────────────────────────────────────── */
function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function humidityLabel(h) {
  if (h < 30) return 'Dry air';
  if (h < 50) return 'Comfortable';
  if (h < 70) return 'Humidity is good';
  if (h < 85) return 'High humidity';
  return 'Very humid';
}

function buildConditionTitle(desc) {
  const d = desc.toLowerCase();
  if (d.includes('thunder')) return 'Stormy with\nHeavy Thunder';
  if (d.includes('heavy rain') || d.includes('shower')) return 'Stormy with\nHeavy Rain';
  if (d.includes('rain') || d.includes('drizzle')) return 'Light Rain\nShowers';
  if (d.includes('snow')) return 'Snowfall\nExpected';
  if (d.includes('mist') || d.includes('fog')) return 'Misty &\nFoggy Skies';
  if (d.includes('cloud')) return 'Overcast\nCloudy Skies';
  if (d.includes('clear')) return 'Clear &\nSunny';
  return capitalizeFirst(desc);
}

function buildDescription(desc, temp, feels, wind, hum) {
  const windKmh = Math.round(wind * 3.6);
  return `${capitalizeFirst(desc)}. Temperature peaks at ${temp}°C, feels like ${feels}°C. ` +
    `Winds around ${windKmh} km/h. Humidity at ${hum}%.`;
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* Weather emojis */
function weatherEmoji(desc) {
  const d = (desc ?? '').toLowerCase();
  if (d.includes('thunder')) return '⛈️';
  if (d.includes('heavy rain')) return '🌧️';
  if (d.includes('rain') || d.includes('drizzle')) return '🌦️';
  if (d.includes('snow')) return '❄️';
  if (d.includes('fog') || d.includes('mist')) return '🌫️';
  if (d.includes('cloud')) return '☁️';
  if (d.includes('clear')) return '☀️';
  return '🌤️';
}

/* ─────────────────────────────────────────
   FORECAST RENDER
───────────────────────────────────────── */
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function renderForecast(baseTemp) {
  const today = new Date();
  const icons = ['🌧️', '⛅', '☁️', '🌤️', '⛈️'];
  const offsets = [0, 2, -1, 4, -2];

  forecastRow.innerHTML = '';
  forecastDays.innerHTML = '';

  for (let i = 0; i < 5; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() + i);
    const t = baseTemp + offsets[i];
    const icon = icons[i];
    const dayName = i === 0 ? 'Today' : DAY_NAMES[day.getDay()];

    const item = document.createElement('div');
    item.className = 'forecast-item';
    item.innerHTML = `
      <span class="forecast-temp">${t}°</span>
      <span class="forecast-icon">${icon}</span>
    `;
    forecastRow.appendChild(item);

    const label = document.createElement('span');
    label.className = 'forecast-day-label';
    label.textContent = dayName;
    forecastDays.appendChild(label);
  }
}

/* ─────────────────────────────────────────
   WAVE CHART
───────────────────────────────────────── */
function renderWaveChart(base, high, low) {
  const svg = document.getElementById('wave-svg');
  const waveLine = document.getElementById('wave-line');
  const waveFill = document.getElementById('wave-fill');
  const waveDot  = document.getElementById('wave-dot');
  const waveVline= document.getElementById('wave-vline');

  const W = 700, H = 80;
  const temps = [low, base - 2, high, base + 1, low + 3, base - 1, base + 2, high - 1, low + 5, base];
  const pts = temps.map((t, i) => {
    const x = (i / (temps.length - 1)) * W;
    const norm = (t - (low - 2)) / ((high + 2) - (low - 2));
    const y = H - norm * (H * 0.75) - H * 0.1;
    return [x, y];
  });

  const path = buildSmoothPath(pts);
  waveLine.setAttribute('d', path);
  waveFill.setAttribute('d', `${path} L ${W} ${H} L 0 ${H} Z`);

  // Dot at midpoint
  const midX = W / 2;
  const midY = pts[Math.floor(pts.length / 2)][1];
  waveDot.setAttribute('cx', midX);
  waveDot.setAttribute('cy', midY);
  waveVline.setAttribute('x1', midX);
  waveVline.setAttribute('x2', midX);

  // Animate path drawing
  const len = waveLine.getTotalLength?.() || 500;
  waveLine.style.strokeDasharray = len;
  waveLine.style.strokeDashoffset = len;
  waveLine.style.transition = 'stroke-dashoffset 1.5s ease';
  requestAnimationFrame(() => {
    setTimeout(() => { waveLine.style.strokeDashoffset = 0; }, 100);
  });
}

function buildSmoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const cpx = (x0 + x1) / 2;
    d += ` C ${cpx} ${y0}, ${cpx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}

/* ─────────────────────────────────────────
   WIND CHART (right panel)
───────────────────────────────────────── */
function renderWindChart(windKmh) {
  const svg = document.getElementById('wind-chart');
  const barsGroup = svg.querySelector('#wind-bars');
  const linePath  = svg.querySelector('#wind-line-path');

  const W = 240, H = 80;
  const count = 20;
  const barW = 6;
  const gap = (W - count * barW) / (count + 1);

  barsGroup.innerHTML = '';

  const vals = Array.from({ length: count }, (_, i) => {
    const wave = Math.sin((i / count) * Math.PI * 2) * 0.4;
    return windKmh * (0.4 + Math.random() * 0.6 + wave * 0.3);
  });

  const maxVal = Math.max(...vals, 1);

  const pts = [];
  vals.forEach((v, i) => {
    const x = gap + i * (barW + gap) + barW / 2;
    const barH = (v / maxVal) * (H * 0.75);
    const y = H - barH;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x - barW / 2);
    rect.setAttribute('y', y);
    rect.setAttribute('width', barW);
    rect.setAttribute('height', barH);
    rect.setAttribute('rx', 3);
    rect.setAttribute('fill', 'url(#barGrad)');
    rect.style.opacity = '0';
    rect.style.transition = `opacity 0.3s ease ${i * 0.05}s, height 0.5s ease`;
    barsGroup.appendChild(rect);
    setTimeout(() => { rect.style.opacity = '1'; }, 50);

    pts.push([x, y + barH / 2]);
  });

  linePath.setAttribute('d', buildSmoothPath(pts));
}

/* ─────────────────────────────────────────
   SUNRISE / SUNSET ARC
───────────────────────────────────────── */
function renderSunriseArc(date) {
  const now = date || new Date();
  const hours = now.getHours() + now.getMinutes() / 60;

  // Fake sunrise 5:50 AM, sunset 8:10 PM
  const sunriseH = 5 + 50 / 60;
  const sunsetH  = 20 + 10 / 60;
  sunriseTime.textContent = '5:50 AM';
  sunsetTime.textContent  = '8:10 PM';

  const clampedH = Math.max(sunriseH, Math.min(sunsetH, hours));
  const progress = (clampedH - sunriseH) / (sunsetH - sunriseH);

  // Arc: from (20,110) to (220,110) radius 100
  // Parametric: center (120, 110), r=100, from 180° to 0°
  const cx = 120, cy = 110, r = 100;

  const startAngle = Math.PI;       // 180°
  const endAngle   = 0;             // 0°
  const currentAngle = startAngle + (endAngle - startAngle) * progress;

  const sunX = cx + r * Math.cos(currentAngle);
  const sunY = cy + r * Math.sin(currentAngle);

  // Active arc path (from start to current)
  const activeArcX = cx + r * Math.cos(currentAngle);
  const activeArcY = cy + r * Math.sin(currentAngle);
  const largeArc = progress > 0.5 ? 1 : 0;
  const activeArc = `M 20 110 A 100 100 0 ${largeArc} 1 ${activeArcX.toFixed(1)} ${activeArcY.toFixed(1)}`;

  document.getElementById('sun-arc-active').setAttribute('d', activeArc);
  document.getElementById('sun-ball').setAttribute('cx', sunX.toFixed(1));
  document.getElementById('sun-ball').setAttribute('cy', sunY.toFixed(1));
  document.getElementById('sun-glow').setAttribute('cx', sunX.toFixed(1));
  document.getElementById('sun-glow').setAttribute('cy', sunY.toFixed(1));
}

/* ─────────────────────────────────────────
   PRESSURE GAUGE
───────────────────────────────────────── */
function renderPressureGauge(pressure) {
  const arc = document.getElementById('pressure-arc');
  const val = document.getElementById('pressure-val');

  val.textContent = pressure;

  // Map 950-1050 to 0–1
  const norm = Math.max(0, Math.min(1, (pressure - 950) / 100));
  const totalLen = 157; // approx half-circle circumference for r50
  const dash = norm * totalLen;

  arc.style.transition = 'stroke-dasharray 1s ease';
  arc.setAttribute('stroke-dasharray', `${dash} ${totalLen}`);
}

/* ─────────────────────────────────────────
   RAIN CANVAS
───────────────────────────────────────── */
function initRainCanvas() {
  const canvas = document.getElementById('rain-canvas');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
  grad.addColorStop(0, '#0a1020');
  grad.addColorStop(0.4, '#141c30');
  grad.addColorStop(1, '#0c1520');

  // Cloud-like blobs
  const blobs = Array.from({ length: 6 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight * 0.6,
    r: 100 + Math.random() * 200,
    opacity: 0.03 + Math.random() * 0.06
  }));

  // Rain drops
  const drops = Array.from({ length: 150 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    len: 10 + Math.random() * 20,
    speed: 4 + Math.random() * 8,
    opacity: 0.05 + Math.random() * 0.15,
    width: 0.5 + Math.random() * 0.8
  }));

  let frame = 0;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Storm clouds (blobs)
    blobs.forEach((b, i) => {
      const pulse = Math.sin(frame * 0.01 + i) * 0.01;
      const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      grd.addColorStop(0, `rgba(30, 45, 70, ${b.opacity + pulse})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Rain drops
    ctx.lineCap = 'round';
    drops.forEach(d => {
      ctx.strokeStyle = `rgba(180, 210, 255, ${d.opacity})`;
      ctx.lineWidth = d.width;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.len * 0.15, d.y + d.len);
      ctx.stroke();

      d.y += d.speed;
      d.x -= d.speed * 0.15;
      if (d.y > canvas.height) {
        d.y = -d.len;
        d.x = Math.random() * canvas.width;
      }
    });

    frame++;
    requestAnimationFrame(draw);
  }

  draw();
}
