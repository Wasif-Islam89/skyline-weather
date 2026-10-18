// ============================================================
// Skyline Weather - Interactive Dashboard Logic (Simplified)
// ============================================================

// Configuration & API Key Rotation Pool
const BASE_URL = "https://api.openweathermap.org/data/2.5";
const DEFAULT_KEYS = [
  "YOUR_API_KEY_HERE" // Enter your key here or apply it in Dashboard Settings (⚙️)
];

let apiKeys = [...DEFAULT_KEYS];
try {
  const savedKeys = localStorage.getItem("weather_api_keys");
  if (savedKeys) {
    const parsed = JSON.parse(savedKeys);
    if (Array.isArray(parsed) && parsed.length > 0) apiKeys = parsed;
  } else {
    const singleKey = localStorage.getItem("weather_api_key");
    if (singleKey && !apiKeys.includes(singleKey)) apiKeys.unshift(singleKey);
  }
} catch (e) { }

let currentKeyIndex = 0;

function getActiveApiKey() {
  return apiKeys[currentKeyIndex % apiKeys.length];
}

function rotateApiKey(isManual = false) {
  if (apiKeys.length <= 1 && !isManual) return false;
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  updateApiKeyBadge();
  if (apiKeyInput) apiKeyInput.value = apiKeys.join(", ");
  return true;
}

function updateApiKeyBadge() {
  const badge = document.getElementById("api-key-badge");
  if (badge) {
    badge.textContent = apiKeys.length > 1 ? `(${currentKeyIndex + 1}/${apiKeys.length})` : "";
  }
}

let currentUnit = localStorage.getItem("weather_unit") || "metric"; // 'metric' (°C) or 'imperial' (°F)
let activeController = null;
let toastTimer = null;

// DOM Elements
const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const clearBtn = document.getElementById("clear-btn");
const searchBtn = document.getElementById("search-btn") || searchForm.querySelector(".search-btn");
const dashboardContent = document.getElementById("dashboard-content");
const navCityText = document.getElementById("nav-city-text");
const settingsToggleBtn = document.getElementById("settings-toggle-btn");
const settingsPanel = document.getElementById("settings-panel");
const closeSettingsBtn = document.getElementById("close-settings-btn");
const apiKeyInput = document.getElementById("api-key-input");
const saveApiKeyBtn = document.getElementById("save-api-key-btn");
const rotateApiKeyBtn = document.getElementById("rotate-api-key-btn");
const unitButtons = document.querySelectorAll(".unit-opt");
const chipButtons = document.querySelectorAll(".chip-btn");

// Hero Elements
const heroCityName = document.getElementById("hero-city-name");
const heroDatetime = document.getElementById("hero-datetime");
const heroWeatherIcon = document.getElementById("hero-weather-icon");
const heroTempValue = document.getElementById("hero-temp-value");
const heroTempUnit = document.getElementById("hero-temp-unit");
const heroConditionText = document.getElementById("hero-condition-text");
const heroTempHigh = document.getElementById("hero-temp-high");
const heroTempLow = document.getElementById("hero-temp-low");

// Details & Forecast Elements
const metricFeelsLike = document.getElementById("metric-feels-like");
const metricHumidity = document.getElementById("metric-humidity");
const metricWindSpeed = document.getElementById("metric-wind-speed");
const metricWindDir = document.getElementById("metric-wind-dir");
const metricPressure = document.getElementById("metric-pressure");
const forecastCityLabel = document.getElementById("forecast-city-label");
const forecastContainer = document.getElementById("forecast-cards-container");

// Toast Elements
const toastBanner = document.getElementById("toast-banner");
const toastText = document.getElementById("toast-text");
const toastIconWrap = document.getElementById("toast-icon-wrap");
const toastClose = document.getElementById("toast-close");

// ---------- Weather Icons & Themes ----------
function getIconType(id, icon = "01d") {
  const isNight = icon.endsWith("n");
  if (id >= 200 && id < 300) return "storm";
  if (id >= 300 && id < 500) return "light-rain";
  if (id >= 500 && id < 600) return "rain";
  if (id >= 600 && id < 700) return "snow";
  if (id >= 700 && id < 800) return "mist";
  if (id === 800) return isNight ? "clear-night" : "sunny";
  if (id === 801 || id === 802) return isNight ? "partly-cloudy-night" : "partly-cloudy-day";
  return "cloudy";
}

function getWeatherTheme(id, icon = "01d") {
  const isNight = icon.endsWith("n");
  if (id >= 200 && id < 300) return "storm";
  if (id >= 300 && id < 600) return "rain";
  if (id >= 600 && id < 700) return "snow";
  if (id >= 700 && id < 800) return "mist";
  if (id === 800) return isNight ? "clear-night" : "clear-day";
  return isNight ? "clouds-night" : "clouds-day";
}

function renderWeatherSvg(type) {
  switch (type) {
    case "sunny":
      return `<svg viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="22" fill="#facc15"/><path d="M50 12V20M50 80V88M12 50H20M80 50H88M23 23L29 29M71 71L77 77M23 77L29 71M71 29L77 23" stroke="#facc15" stroke-width="4.5" stroke-linecap="round"/></svg>`;
    case "clear-night":
      return `<svg viewBox="0 0 100 100" fill="none"><path d="M52 20C52 38.8 67.2 54 86 54C85.5 65.5 73.2 74 59 74C39.7 74 24 58.3 24 39C24 25.8 31.3 14.3 42 8.3C41 12 41 16 52 20Z" fill="#facc15"/><circle cx="22" cy="22" r="2" fill="#fef08a"/><circle cx="78" cy="26" r="2" fill="#fef08a"/></svg>`;
    case "partly-cloudy-day":
      return `<svg viewBox="0 0 100 100" fill="none"><circle cx="64" cy="38" r="16" fill="#facc15"/><path d="M72 74H26C18.3 74 12 67.7 12 60C12 52.9 17.3 47 24.2 46.1C26.1 36.5 34.6 29 45 29C56.6 29 66 38.4 66 50C69.3 50.5 74.5 53 74.5 57C77.5 61 77.2 67 73.8 70.8C73.3 71.3 72.7 71.7 72 74Z" fill="#38bdf8"/></svg>`;
    case "partly-cloudy-night":
      return `<svg viewBox="0 0 100 100" fill="none"><path d="M54 22C54 36.4 65.6 48 80 48C73.2 59 64.5 59 50.1 59C38.5 59 38.5 47.4 38.5 33C38.5 24.3 43.3 16.7 50.1 12.3C50 19 50 20.5 54 22Z" fill="#facc15"/><path d="M72 74H26C18.3 74 12 67.7 12 60C12 52.9 17.3 47 24.2 46.1C26.1 36.5 34.6 29 45 29C56.6 29 66 38.4 66 50C69.3 50.5 74.5 53 74.5 57C77.5 61 77.2 67 73.8 70.8C73.3 71.3 72.7 71.7 72 74Z" fill="#38bdf8"/></svg>`;
    case "rain":
    case "light-rain":
      return `<svg viewBox="0 0 100 100" fill="none"><path d="M72 60H26C18.3 60 12 53.7 12 46C12 38.9 17.3 33 24.2 32.1C26.1 22.5 34.6 15 45 15C56.6 15 66 24.4 66 36C69.3 36.5 74.5 39 74.5 43C77.5 47 77.2 53 73.8 56.8C73.3 57.3 72.7 57.7 72 60Z" fill="#64748b"/><g stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round"><line x1="32" y1="68" x2="28" y2="78"/><line x1="48" y1="68" x2="44" y2="78"/><line x1="64" y1="68" x2="60" y2="78"/></g></svg>`;
    case "storm":
      return `<svg viewBox="0 0 100 100" fill="none"><path d="M72 58H26C18.3 58 12 51.7 12 44C12 36.9 17.3 31 24.2 30.1C26.1 20.5 34.6 13 45 13C56.6 13 66 22.4 66 34C69.3 34.5 74.5 37 74.5 41C77.5 45 77.2 51 73.8 54.8C73.3 55.3 72.7 55.7 72 58Z" fill="#334155"/><polygon points="52,48 40,66 49,66 43,86 62,62 52,62" fill="#facc15"/></svg>`;
    case "snow":
      return `<svg viewBox="0 0 100 100" fill="none"><path d="M72 60H26C18.3 60 12 53.7 12 46C12 38.9 17.3 33 24.2 32.1C26.1 22.5 34.6 15 45 15C56.6 15 66 24.4 66 36C69.3 36.5 74.5 39 74.5 43C77.5 47 77.2 53 73.8 56.8C73.3 57.3 72.7 57.7 72 60Z" fill="#cbd5e1"/><g stroke="#7dd3fc" stroke-width="2.5" stroke-linecap="round"><line x1="32" y1="68" x2="32" y2="78"/><line x1="50" y1="70" x2="50" y2="82"/><line x1="68" y1="68" x2="68" y2="78"/></g></svg>`;
    case "mist":
      return `<svg viewBox="0 0 100 100" fill="none" stroke="#7dd3fc" stroke-width="4.5" stroke-linecap="round"><line x1="22" y1="36" x2="78" y2="36"/><line x1="16" y1="48" x2="84" y2="48"/><line x1="26" y1="60" x2="74" y2="60"/><line x1="20" y1="72" x2="80" y2="72"/></svg>`;
    case "cloudy":
    default:
      return `<svg viewBox="0 0 100 100" fill="none"><path d="M74 74H24C16.3 74 10 67.7 10 60C10 52.9 15.3 47 22.2 46.1C24.1 36.5 32.6 29 43 29C54.6 29 64 38.4 64 50C67.3 50.5 72.5 53 72.5 57C75.5 61 75.2 67 71.8 70.8C71.3 71.3 70.7 71.7 74 74Z" fill="#38bdf8"/></svg>`;
  }
}

// Convert wind degrees to cardinal direction
function degreesToCardinal(deg) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round((deg % 360) / 45) % 8];
}

// Format local time using city's timezone offset
function formatDateTime(dt, timezone) {
  const date = new Date((dt + timezone) * 1000);
  const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  const day = date.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });
  const month = date.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
  const year = date.toLocaleDateString("en-US", { year: "numeric", timeZone: "UTC" });
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" });
  return `${dayOfWeek}, ${day} ${month} ${year} • ${time}`;
}

// ---------- UI Utilities ----------
function showToast(msg, isError = false) {
  clearTimeout(toastTimer);
  toastText.textContent = msg;
  toastBanner.classList.toggle("is-error", isError);
  toastBanner.hidden = false;
  if (toastIconWrap) {
    toastIconWrap.innerHTML = `<i data-lucide="${isError ? 'alert-circle' : 'info'}" id="toast-icon"></i>`;
  }
  if (window.lucide) lucide.createIcons();
  toastTimer = setTimeout(() => { toastBanner.hidden = true; }, 4000);
}

function setLoading(isLoading) {
  if (searchBtn) searchBtn.disabled = isLoading;
  if (searchBtn) searchBtn.classList.toggle("is-loading", isLoading);
  if (dashboardContent) dashboardContent.classList.toggle("is-loading", isLoading);
}

// ---------- City & Country Wallpapers ----------
const CITY_WALLPAPERS = {
  // Pakistan cities & country
  karachi: "assets/city_skyline_bg.jpg",
  lahore: "https://images.unsplash.com/photo-1588665555327-a67c73b3cc23?auto=format&fit=crop&w=1600&q=80",
  islamabad: "https://images.unsplash.com/photo-1608686207856-001b95cf60ca?auto=format&fit=crop&w=1600&q=80",
  peshawar: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1600&q=80",
  multan: "https://images.unsplash.com/photo-1627894483216-2138af692e32?auto=format&fit=crop&w=1600&q=80",
  pakistan: "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=1600&q=80",

  // Global major cities & countries
  "new york": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1600&q=80",
  london: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1600&q=80",
  tokyo: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1600&q=80",
  paris: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=80",
  dubai: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1600&q=80",
  delhi: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1600&q=80",
  mumbai: "https://images.unsplash.com/photo-1566552881560-0be862a7c445?auto=format&fit=crop&w=1600&q=80",
  india: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1600&q=80",
  rome: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1600&q=80",
  istanbul: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1600&q=80",
  turkey: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1600&q=80",
  sydney: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1600&q=80",
  australia: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1600&q=80",
  singapore: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1600&q=80",
  toronto: "https://images.unsplash.com/photo-1517090504586-fde19ea6066f?auto=format&fit=crop&w=1600&q=80",
  canada: "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=1600&q=80",
  chicago: "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?auto=format&fit=crop&w=1600&q=80",
  "san francisco": "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1600&q=80",
  "united states": "https://images.unsplash.com/photo-1485738422979-f5c462d49f74?auto=format&fit=crop&w=1600&q=80",
  usa: "https://images.unsplash.com/photo-1485738422979-f5c462d49f74?auto=format&fit=crop&w=1600&q=80",
  "saudi arabia": "https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?auto=format&fit=crop&w=1600&q=80",
  riyadh: "https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?auto=format&fit=crop&w=1600&q=80",
  berlin: "https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=1600&q=80",
  germany: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1600&q=80"
};

const cityImageCache = new Map();

function matchWallpaper(name) {
  if (!name) return null;
  const clean = name.trim().toLowerCase();
  if (CITY_WALLPAPERS[clean]) return CITY_WALLPAPERS[clean];
  for (const [key, url] of Object.entries(CITY_WALLPAPERS)) {
    if (clean === key || clean.startsWith(key) || key.startsWith(clean)) {
      return url;
    }
  }
  return null;
}

async function updateCityBackground(cityName, countryName, searchedQuery) {
  const heroSkylineBg = document.getElementById("hero-skyline-bg");
  if (!cityName && !searchedQuery) return;

  const primary = (searchedQuery || cityName || "").trim();
  const cacheKey = primary.toLowerCase();
  let imgUrl = cityImageCache.get(cacheKey);

  if (!imgUrl) {
    // 1. Priority match on searched query (e.g. "Lahore", "Pakistan", "New York")
    imgUrl = matchWallpaper(searchedQuery);
  }
  if (!imgUrl) {
    // 2. Match city name from API
    imgUrl = matchWallpaper(cityName);
  }
  if (!imgUrl && countryName) {
    // 3. Match country name
    imgUrl = matchWallpaper(countryName);
  }

  // 4. Dynamic Wikipedia lookup for any other city/country worldwide
  if (!imgUrl) {
    const searchTerms = [primary.split(",")[0], cityName?.split(",")[0], countryName].filter(Boolean);
    for (const term of searchTerms) {
      try {
        const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term.trim())}`);
        if (res.ok) {
          const json = await res.json();
          const raw = json.originalimage?.source || json.thumbnail?.source;
          if (raw) {
            imgUrl = raw.replace(/\/\d+px-/, "/1600px-");
            break;
          }
        }
      } catch (e) { }
    }
  }

  if (!imgUrl) imgUrl = "assets/city_skyline_bg.jpg";
  cityImageCache.set(cacheKey, imgUrl);

  if (heroSkylineBg) {
    heroSkylineBg.style.opacity = "0.2";
    heroSkylineBg.style.backgroundImage = `url("${imgUrl}")`;
    setTimeout(() => { heroSkylineBg.style.opacity = "1"; }, 150);
  }

  document.body.style.backgroundImage = `
    radial-gradient(ellipse 90% 60% at 50% 0%, rgba(10, 30, 65, 0.40) 0%, rgba(4, 12, 26, 0.62) 100%),
    url("${imgUrl}")
  `;
}

// ---------- Render UI ----------
function renderWeather(data) {
  updateCityBackground(data.city, data.country, data.searchedQuery);
  document.body.dataset.theme = data.theme;
  navCityText.textContent = `${data.city}, ${data.countryCode}`;
  forecastCityLabel.textContent = `${data.city}, ${data.countryCode}`;

  // Hero card
  heroCityName.textContent = `${data.city}, ${data.country}`;
  heroDatetime.textContent = data.dateTime;
  heroTempValue.textContent = Math.round(data.temp);
  heroTempUnit.textContent = currentUnit === "metric" ? "°C" : "°F";
  heroConditionText.textContent = data.condition;
  heroTempHigh.textContent = `${Math.round(data.tempHigh)}°`;
  heroTempLow.textContent = `${Math.round(data.tempLow)}°`;
  heroWeatherIcon.innerHTML = renderWeatherSvg(data.iconType);

  // Metrics
  metricFeelsLike.textContent = `${Math.round(data.feelsLike)}${currentUnit === "metric" ? "°C" : "°F"}`;
  metricHumidity.textContent = `${data.humidity}%`;
  metricWindSpeed.textContent = currentUnit === "metric" ? `${Math.round(data.windSpeed)} km/h` : `${Math.round(data.windSpeed)} mph`;
  metricWindDir.innerHTML = `${data.windDir} <i data-lucide="arrow-up-right" class="dir-arrow"></i>`;
  metricPressure.textContent = `${data.pressure} hPa`;

  // 5-day forecast
  forecastContainer.innerHTML = data.forecast.map((item, idx) => `
    <div class="forecast-tile ${idx === 0 ? 'active-forecast' : ''}" data-index="${idx}" tabindex="0">
      <span class="forecast-date-str">${item.day}</span>
      <div class="forecast-icon-box">${renderWeatherSvg(item.iconType)}</div>
      <span class="forecast-cond-text">${item.condition}</span>
      <span class="forecast-temps">${Math.round(item.high)}° <span class="low-temp">/ ${Math.round(item.low)}°</span></span>
    </div>
  `).join("");

  document.querySelectorAll(".forecast-tile").forEach(tile => {
    tile.addEventListener("click", () => {
      document.querySelectorAll(".forecast-tile").forEach(t => t.classList.remove("active-forecast"));
      tile.classList.add("active-forecast");
    });
  });

  if (window.lucide) lucide.createIcons();
}

// ---------- Group 5-Day Forecast ----------
function parseForecast(list, timezone, todayKey) {
  const daily = {};
  list.forEach(entry => {
    const key = new Date((entry.dt + timezone) * 1000).toISOString().slice(0, 10);
    const hour = new Date((entry.dt + timezone) * 1000).getUTCHours();
    const tMax = entry.main?.temp_max ?? 0;
    const tMin = entry.main?.temp_min ?? 0;

    if (!daily[key]) {
      daily[key] = { high: tMax, low: tMin, weather: entry.weather?.[0] || {}, gap: Math.abs(hour - 12) };
    } else {
      daily[key].high = Math.max(daily[key].high, tMax);
      daily[key].low = Math.min(daily[key].low, tMin);
      if (Math.abs(hour - 12) < daily[key].gap) {
        daily[key].weather = entry.weather?.[0] || {};
        daily[key].gap = Math.abs(hour - 12);
      }
    }
  });

  return Object.entries(daily).slice(0, 5).map(([key, item], idx) => {
    const isToday = key === todayKey;
    const date = new Date(`${key}T12:00:00Z`);
    const dayStr = isToday ? "Today" : date.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    return {
      day: dayStr,
      condition: item.weather.main || "Clear",
      iconType: getIconType(item.weather.id || 800, item.weather.icon || "01d"),
      high: item.high,
      low: item.low
    };
  });
}

// ---------- API Fetch ----------
async function fetchWeather(city, retryCount = 0) {
  const query = city.trim();
  if (!query) {
    showToast("Please enter a city name.", true);
    return;
  }

  if (activeController) activeController.abort();
  activeController = new AbortController();
  setLoading(true);

  try {
    const encoded = encodeURIComponent(query);
    const activeKey = getActiveApiKey();

    if (!activeKey || activeKey.startsWith("YOUR_")) {
      showToast("Please enter your OpenWeather API key in Settings (⚙️).", true);
      settingsPanel.hidden = false;
      if (apiKeyInput) apiKeyInput.focus();
      return;
    }

    const [currentRes, forecastRes] = await Promise.all([
      fetch(`${BASE_URL}/weather?q=${encoded}&units=${currentUnit}&appid=${activeKey}`, { signal: activeController.signal }),
      fetch(`${BASE_URL}/forecast?q=${encoded}&units=${currentUnit}&appid=${activeKey}`, { signal: activeController.signal })
    ]);

    // Auto-rotate API key if rate limited or key is invalid/exhausted
    if ((currentRes.status === 429 || currentRes.status === 401) && retryCount < apiKeys.length - 1) {
      rotateApiKey();
      showToast(`Key #${currentKeyIndex} limit reached. Rotating to Key #${currentKeyIndex + 1}...`);
      return fetchWeather(city, retryCount + 1);
    }

    if (!currentRes.ok) {
      if (currentRes.status === 404) throw new Error(`City "${query}" not found.`);
      if (currentRes.status === 401) throw new Error("Invalid API key. Try rotating key.");
      if (currentRes.status === 429) throw new Error("Rate limit reached. Try rotating key.");
      throw new Error(`Weather error (${currentRes.status})`);
    }

    const current = await currentRes.json();
    const forecast = forecastRes.ok ? await forecastRes.json() : null;

    const timezone = current.timezone || 0;
    const weather = current.weather?.[0] || {};
    const iconCode = weather.icon || "01d";
    const todayKey = new Date((current.dt + timezone) * 1000).toISOString().slice(0, 10);

    const forecastData = forecast?.list ? parseForecast(forecast.list, timezone, todayKey) : [{
      day: "Today",
      condition: weather.main || "Clear",
      iconType: getIconType(weather.id || 800, iconCode),
      high: current.main?.temp_max ?? current.main?.temp ?? 0,
      low: current.main?.temp_min ?? current.main?.temp ?? 0
    }];

    const todayForecast = forecastData.find(f => f.day === "Today");
    const rawWind = current.wind?.speed || 0;

    const formatted = {
      city: current.name,
      country: current.sys?.country || "",
      countryCode: current.sys?.country || "",
      searchedQuery: query,
      dateTime: formatDateTime(current.dt, timezone),
      temp: current.main?.temp ?? 0,
      tempHigh: todayForecast ? todayForecast.high : (current.main?.temp_max ?? 0),
      tempLow: todayForecast ? todayForecast.low : (current.main?.temp_min ?? 0),
      condition: weather.description ? (weather.description.charAt(0).toUpperCase() + weather.description.slice(1)) : "Clear",
      iconType: getIconType(weather.id || 800, iconCode),
      theme: getWeatherTheme(weather.id || 800, iconCode),
      feelsLike: current.main?.feels_like ?? 0,
      humidity: current.main?.humidity ?? 0,
      windSpeed: currentUnit === "metric" ? rawWind * 3.6 : rawWind,
      windDir: degreesToCardinal(current.wind?.deg || 0),
      pressure: current.main?.pressure ?? 1013,
      forecast: forecastData
    };

    renderWeather(formatted);
    try { localStorage.setItem("last_city", current.name); } catch (e) { }
    cityInput.value = current.name;
    clearBtn.classList.add("visible");
  } catch (err) {
    if (err.name === "AbortError") return;
    showToast(err.message || "Failed to load weather.", true);
  } finally {
    setLoading(false);
  }
}

// ---------- Event Listeners ----------
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  fetchWeather(cityInput.value);
});

cityInput.addEventListener("input", () => {
  clearBtn.classList.toggle("visible", cityInput.value.trim().length > 0);
});

clearBtn.addEventListener("click", () => {
  cityInput.value = "";
  clearBtn.classList.remove("visible");
  cityInput.focus();
});

settingsToggleBtn.addEventListener("click", () => {
  settingsPanel.hidden = !settingsPanel.hidden;
  if (!settingsPanel.hidden) {
    if (apiKeyInput) apiKeyInput.value = apiKeys.join(", ");
    updateApiKeyBadge();
  }
});

closeSettingsBtn.addEventListener("click", () => {
  settingsPanel.hidden = true;
});

if (rotateApiKeyBtn) {
  rotateApiKeyBtn.addEventListener("click", () => {
    rotateApiKey(true);
    showToast(`Switched to API Key #${currentKeyIndex + 1}`);
    fetchWeather(cityInput.value || "Karachi");
  });
}

unitButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    unitButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentUnit = btn.dataset.unit;
    try { localStorage.setItem("weather_unit", currentUnit); } catch (e) { }
    fetchWeather(cityInput.value || "Karachi");
  });
});

saveApiKeyBtn.addEventListener("click", () => {
  const val = apiKeyInput.value.trim();
  if (val) {
    const keys = val.split(/[,\s]+/).map(k => k.trim()).filter(Boolean);
    if (keys.length > 0) {
      apiKeys = keys;
      currentKeyIndex = 0;
      try {
        localStorage.setItem("weather_api_keys", JSON.stringify(keys));
        localStorage.setItem("weather_api_key", keys[0]);
      } catch (e) { }
      showToast(`Saved ${keys.length} API key(s) to rotation pool!`);
      updateApiKeyBadge();
      settingsPanel.hidden = true;
      fetchWeather(cityInput.value || "Karachi");
      return;
    }
  }
  showToast("Please enter a valid API key.", true);
});

chipButtons.forEach(chip => {
  chip.addEventListener("click", () => {
    cityInput.value = chip.dataset.city;
    clearBtn.classList.add("visible");
    settingsPanel.hidden = true;
    fetchWeather(chip.dataset.city);
  });
});

toastClose.addEventListener("click", () => {
  clearTimeout(toastTimer);
  toastBanner.hidden = true;
});

// ---------- Initialization ----------
window.addEventListener("DOMContentLoaded", () => {
  updateApiKeyBadge();
  document.querySelectorAll(".unit-opt").forEach(b => {
    b.classList.toggle("active", b.dataset.unit === currentUnit);
  });

  let savedCity = "Karachi";
  try { savedCity = localStorage.getItem("last_city") || "Karachi"; } catch (e) { }

  cityInput.value = savedCity;
  clearBtn.classList.toggle("visible", savedCity.length > 0);
  fetchWeather(savedCity);
});
