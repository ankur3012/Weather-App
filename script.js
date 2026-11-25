const cityInput = document.getElementById("city");
const searchForm = document.getElementById("searchForm");
const cityNameEl = document.getElementById("cityName");
const errorAlert = document.getElementById("errorAlert");
const otherCitiesBody = document.getElementById("otherCitiesBody");
const weatherBg = document.getElementById("weatherBg");
const canvas = document.getElementById("weatherCanvas");
const ctx = canvas.getContext("2d");

const gpsBtn = document.getElementById("gpsBtn");
const btnCelsius = document.getElementById("btnCelsius");
const btnFahrenheit = document.getElementById("btnFahrenheit");
const recentSearchesWrapper = document.getElementById("recentSearchesWrapper");
const recentList = document.getElementById("recentList");
const clearRecentBtn = document.getElementById("clearRecentBtn");
const hourlyForecastContainer = document.getElementById("hourlyForecastContainer");
const dailyForecastContainer = document.getElementById("dailyForecastContainer");

const OTHER_CITIES = ["Mumbai", "Gangtok", "Mirzapur", "Dubai", "Bhutan", "Germany"];
const RECENT_STORAGE_KEY = "weather_app_recent_cities";

// App State (taaki °C/°F switch bina dobara API call kiye turant kaam kare)
let isFahrenheit = false;
let currentWeatherState = null;
let otherCitiesState = [];

let animationFrameId = null;
let particles = [];

// ==========================================
// 1. CANVAS & DYNAMIC BACKGROUND ANIMATIONS
// ==========================================
const resizeCanvas = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const stopParticleAnimation = () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  particles = [];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

const startRainAnimation = (isHeavy = false) => {
  stopParticleAnimation();
  const dropCount = isHeavy ? 180 : 110;

  for (let i = 0; i < dropCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      length: Math.random() * 18 + 12,
      speedY: Math.random() * 8 + 11,
      speedX: -1.8,
      opacity: Math.random() * 0.4 + 0.25,
    });
  }

  const drawRain = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";

    for (const drop of particles) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(190, 225, 255, ${drop.opacity})`;
      ctx.lineWidth = 1.4;
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x + drop.speedX, drop.y + drop.length);
      ctx.stroke();

      drop.x += drop.speedX;
      drop.y += drop.speedY;

      if (drop.y > canvas.height) {
        drop.y = -drop.length;
        drop.x = Math.random() * (canvas.width + 100);
      }
    }

    animationFrameId = requestAnimationFrame(drawRain);
  };

  drawRain();
};

const startSnowAnimation = () => {
  stopParticleAnimation();
  for (let i = 0; i < 90; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 3 + 1.5,
      speedY: Math.random() * 1.5 + 0.8,
      drift: Math.random() * 1 - 0.5,
    });
  }

  const drawSnow = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";

    for (const flake of particles) {
      ctx.beginPath();
      ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
      ctx.fill();

      flake.y += flake.speedY;
      flake.x += flake.drift;

      if (flake.y > canvas.height) {
        flake.y = -5;
        flake.x = Math.random() * canvas.width;
      }
    }

    animationFrameId = requestAnimationFrame(drawSnow);
  };

  drawSnow();
};

const updateBackgroundAnimation = (code, isDay = 1) => {
  weatherBg.className = "";
  document.body.classList.remove("dark-sky");

  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) {
    weatherBg.classList.add("theme-rainy");
    document.body.classList.add("dark-sky");
    const isHeavy = [65, 82, 95, 96, 99].includes(code);
    startRainAnimation(isHeavy);
    return;
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    weatherBg.classList.add("theme-cloudy");
    document.body.classList.add("dark-sky");
    startSnowAnimation();
    return;
  }

  if ([1, 2, 3, 45, 48].includes(code)) {
    stopParticleAnimation();
    weatherBg.classList.add("theme-cloudy");
    document.body.classList.add("dark-sky");
    return;
  }

  stopParticleAnimation();
  if (isDay === 1) {
    weatherBg.classList.add("theme-sunny");
  } else {
    weatherBg.classList.add("theme-night");
    document.body.classList.add("dark-sky");
  }
};

// ==========================================
// 2. HELPERS (TEMP UNIT, TIME, ICONS, AQI)
// ==========================================
const formatTemp = (tempC) => {
  if (tempC === null || tempC === undefined || Number.isNaN(Number(tempC))) return "--";
  const val = isFahrenheit ? (tempC * 9) / 5 + 32 : tempC;
  return Math.round(val * 10) / 10;
};

const getUnitSymbol = () => (isFahrenheit ? "°F" : "°C");

const updateUnitLabels = () => {
  const symbol = getUnitSymbol();
  document.querySelectorAll(".temp-unit").forEach((el) => {
    el.textContent = symbol;
  });
};

const formatTime = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatHourLabel = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const formatDayLabel = (isoDateString, index) => {
  if (index === 0) return "Today";
  const date = new Date(isoDateString + "T00:00:00");
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
};

const showError = (message) => {
  errorAlert.textContent = message;
  errorAlert.classList.remove("d-none");
};

const hideError = () => {
  errorAlert.classList.add("d-none");
};

const getWeatherCondition = (code, isDay = 1) => {
  if (code === 0) {
    return {
      text: isDay ? "Clear & Sunny" : "Clear Night",
      icon: isDay ? "bi-sun-fill text-warning" : "bi-moon-stars-fill text-primary",
    };
  }
  if ([1, 2, 3].includes(code)) {
    return {
      text: code === 3 ? "Overcast Clouds" : "Partly Cloudy",
      icon: isDay ? "bi-cloud-sun-fill text-warning" : "bi-clouds-fill text-secondary",
    };
  }
  if ([45, 48].includes(code)) {
    return { text: "Foggy", icon: "bi-cloud-fog2-fill text-secondary" };
  }
  if ([51, 53, 55, 56, 57].includes(code)) {
    return { text: "Drizzle", icon: "bi-cloud-drizzle-fill text-info" };
  }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { text: "Rainy", icon: "bi-cloud-rain-heavy-fill text-primary" };
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return { text: "Snow", icon: "bi-snow text-info" };
  }
  if ([95, 96, 99].includes(code)) {
    return { text: "Thunderstorm", icon: "bi-cloud-lightning-rain-fill text-danger" };
  }
  return { text: "Cloudy", icon: "bi-cloud-fill text-secondary" };
};

const getAqiCategory = (aqi) => {
  if (aqi === null || aqi === undefined) {
    return { label: "N/A", badgeClass: "bg-secondary" };
  }
  if (aqi <= 50) return { label: "Good", badgeClass: "bg-success" };
  if (aqi <= 100) return { label: "Moderate", badgeClass: "bg-warning text-dark" };
  if (aqi <= 150) return { label: "Sensitive", badgeClass: "bg-warning text-dark" };
  if (aqi <= 200) return { label: "Unhealthy", badgeClass: "bg-danger" };
  if (aqi <= 300) return { label: "Very Unhealthy", badgeClass: "bg-dark" };
  return { label: "Hazardous", badgeClass: "bg-danger" };
};

// ==========================================
// 3. RECENT SEARCHES (LOCALSTORAGE)
// ==========================================
const getRecentCities = () => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
};

const saveRecentCity = (cityName) => {
  if (!cityName || cityName === "My Location") return;
  let cities = getRecentCities();
  cities = cities.filter((c) => c.toLowerCase() !== cityName.toLowerCase());
  cities.unshift(cityName);
  cities = cities.slice(0, 5); // Max 5 recent cities
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(cities));
  renderRecentSearches();
};

const renderRecentSearches = () => {
  const cities = getRecentCities();
  if (cities.length === 0) {
    recentSearchesWrapper.classList.add("d-none");
    return;
  }

  recentSearchesWrapper.classList.remove("d-none");
  recentList.innerHTML = "";

  cities.forEach((city) => {
    const badge = document.createElement("span");
    badge.className = "badge rounded-pill text-bg-light border recent-chip px-2 py-1";
    badge.textContent = city;
    badge.addEventListener("click", () => {
      cityInput.value = city;
      getWeather(city);
    });
    recentList.appendChild(badge);
  });
};

clearRecentBtn.addEventListener("click", () => {
  localStorage.removeItem(RECENT_STORAGE_KEY);
  renderRecentSearches();
});

// ==========================================
// 4. DATA FETCHING (BY CITY & BY COORDINATES)
// ==========================================
const fetchWeatherBundleByCoords = async (latitude, longitude) => {
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,cloud_cover,wind_speed_10m,weather_code,is_day&hourly=temperature_2m,weather_code,precipitation_probability,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&timezone=auto`;
  const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi,pm10,pm2_5`;

  const [weatherRes, aqiRes] = await Promise.all([fetch(weatherUrl), fetch(aqiUrl)]);
  const [weatherData, aqiData] = await Promise.all([weatherRes.json(), aqiRes.json()]);

  return {
    weather: weatherData,
    aqi: aqiData.current || {},
  };
};

const fetchCityWeatherAndAqi = async (cityQuery) => {
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery)}&count=1&language=en&format=json`
  );
  const geoData = await geoRes.json();

  if (!geoData.results || geoData.results.length === 0) {
    return null;
  }

  const { name, latitude, longitude, country } = geoData.results[0];
  const bundle = await fetchWeatherBundleByCoords(latitude, longitude);

  return {
    name,
    country,
    ...bundle,
  };
};

// ==========================================
// 5. RENDERING FUNCTIONS (CARDS, HOURLY, 5-DAY, TABLE)
// ==========================================
const renderHourlyForecast = (hourly, currentIsoTime) => {
  hourlyForecastContainer.innerHTML = "";
  if (!hourly || !hourly.time) return;

  const currentTs = new Date(currentIsoTime).getTime();
  let startIndex = hourly.time.findIndex((t) => new Date(t).getTime() >= currentTs);
  if (startIndex === -1) startIndex = 0;

  // Next 24 hours in 3-hour intervals (8 cards)
  for (let i = 0; i < 8; i++) {
    const idx = startIndex + i * 3;
    if (idx >= hourly.time.length) break;

    const timeStr = formatHourLabel(hourly.time[idx]);
    const tempVal = formatTemp(hourly.temperature_2m[idx]);
    const code = hourly.weather_code[idx];
    const isDay = hourly.is_day ? hourly.is_day[idx] : 1;
    const rainChance = hourly.precipitation_probability ? hourly.precipitation_probability[idx] : 0;
    const condition = getWeatherCondition(code, isDay);

    const col = document.createElement("div");
    col.className = "col";
    col.innerHTML = `
      <div class="card h-100 rounded-3 shadow-sm glass-card forecast-card py-2 px-1">
        <div class="small fw-semibold text-secondary">${i === 0 ? "Now" : timeStr}</div>
        <div class="my-2"><i class="bi ${condition.icon} fs-4"></i></div>
        <div class="fw-bold fs-6">${tempVal}${getUnitSymbol()}</div>
        <div class="small text-primary mt-1">
          <i class="bi bi-droplet-fill"></i> ${rainChance ?? 0}%
        </div>
      </div>
    `;
    hourlyForecastContainer.appendChild(col);
  }
};

const renderDailyForecast = (daily) => {
  dailyForecastContainer.innerHTML = "";
  if (!daily || !daily.time) return;

  const daysToShow = Math.min(5, daily.time.length);

  for (let i = 0; i < daysToShow; i++) {
    const dayLabel = formatDayLabel(daily.time[i], i);
    const code = daily.weather_code[i];
    const condition = getWeatherCondition(code, 1);
    const minT = formatTemp(daily.temperature_2m_min[i]);
    const maxT = formatTemp(daily.temperature_2m_max[i]);
    const rainProb = daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : 0;

    const col = document.createElement("div");
    col.className = "col";
    col.innerHTML = `
      <div class="card h-100 rounded-3 shadow-sm glass-card forecast-card p-3">
        <div class="fw-semibold mb-2">${dayLabel}</div>
        <div class="my-1"><i class="bi ${condition.icon} fs-2"></i></div>
        <div class="small text-secondary mb-2">${condition.text}</div>
        <div class="fw-bold">
          <span class="text-danger">${maxT}${getUnitSymbol()}</span>
          <span class="text-muted mx-1">/</span>
          <span class="text-primary">${minT}${getUnitSymbol()}</span>
        </div>
        <div class="small text-info-emphasis mt-2">
          <i class="bi bi-umbrella-fill text-primary me-1"></i>${rainProb ?? 0}% rain
        </div>
      </div>
    `;
    dailyForecastContainer.appendChild(col);
  }
};

const renderMainWeather = () => {
  if (!currentWeatherState) return;

  const { name, country, weather, aqi } = currentWeatherState;
  const current = weather.current;
  const daily = weather.daily;

  cityNameEl.textContent = country && name !== country ? `${name}, ${country}` : name;

  // Dynamic Sky Animation
  updateBackgroundAnimation(current.weather_code, current.is_day);

  // Condition Pill
  const condition = getWeatherCondition(current.weather_code, current.is_day);
  document.getElementById("weatherIcon").className = `bi ${condition.icon} fs-4`;
  document.getElementById("weatherDesc").textContent = condition.text;

  // Card 1: Temperatures
  document.getElementById("temp").textContent = formatTemp(current.temperature_2m);
  document.getElementById("temp2").textContent = formatTemp(current.temperature_2m);
  document.getElementById("min_temp").textContent = formatTemp(daily.temperature_2m_min[0]);
  document.getElementById("max_temp").textContent = formatTemp(daily.temperature_2m_max[0]);

  // Card 2: Humidity & Cloud
  document.getElementById("cloud_pct").textContent = current.cloud_cover;
  document.getElementById("feels_like").textContent = formatTemp(current.apparent_temperature);
  document.getElementById("humidity").textContent = current.relative_humidity_2m;
  document.getElementById("humidity2").textContent = current.relative_humidity_2m;

  // Card 3: Wind & Sun
  document.getElementById("wind_speed").textContent = current.wind_speed_10m;
  document.getElementById("wind_speed2").textContent = current.wind_speed_10m;
  document.getElementById("sunrise").textContent = formatTime(daily.sunrise[0]);
  document.getElementById("sunset").textContent = formatTime(daily.sunset[0]);

  // Card 4: AQI
  const usAqi = aqi.us_aqi ?? "--";
  const aqiInfo = getAqiCategory(aqi.us_aqi);
  document.getElementById("aqi").textContent = usAqi;
  const aqiBadge = document.getElementById("aqiBadge");
  aqiBadge.textContent = aqiInfo.label;
  aqiBadge.className = `badge ${aqiInfo.badgeClass} mb-2`;
  document.getElementById("pm25").textContent = aqi.pm2_5 ?? "--";
  document.getElementById("pm10").textContent = aqi.pm10 ?? "--";

  // Update Unit Symbols
  updateUnitLabels();

  // Render Hourly & 5-Day Forecasts
  renderHourlyForecast(weather.hourly, current.time);
  renderDailyForecast(daily);
};

const renderOtherCitiesTable = () => {
  if (!otherCitiesState.length) return;
  otherCitiesBody.innerHTML = "";
  const unit = getUnitSymbol();

  otherCitiesState.forEach(({ label, data }) => {
    if (!data) return;

    const current = data.weather.current;
    const daily = data.weather.daily;
    const condition = getWeatherCondition(current.weather_code, current.is_day);
    const usAqi = data.aqi.us_aqi ?? "--";
    const aqiInfo = getAqiCategory(data.aqi.us_aqi);

    const tr = document.createElement("tr");
    tr.className = "city-row";
    tr.innerHTML = `
      <th scope="row" class="text-start">${label}</th>
      <td><i class="bi ${condition.icon} me-1"></i> ${condition.text}</td>
      <td><strong>${formatTemp(current.temperature_2m)}${unit}</strong></td>
      <td>${formatTemp(current.apparent_temperature)}${unit}</td>
      <td>${formatTemp(daily.temperature_2m_min[0])}${unit} / ${formatTemp(daily.temperature_2m_max[0])}${unit}</td>
      <td>${current.relative_humidity_2m}%</td>
      <td>${current.wind_speed_10m} km/hr</td>
      <td><span class="badge ${aqiInfo.badgeClass}">${usAqi} (${aqiInfo.label})</span></td>
    `;

    tr.addEventListener("click", () => {
      cityInput.value = label;
      getWeather(label);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    otherCitiesBody.appendChild(tr);
  });
};

// ==========================================
// 6. MAIN CONTROLLERS (SEARCH, GPS, UNIT TOGGLE)
// ==========================================
const getWeather = async (city) => {
  const trimmedCity = city.trim();
  if (!trimmedCity) {
    showError("Please enter a city name.");
    return;
  }

  hideError();
  cityNameEl.textContent = "Loading...";

  try {
    const result = await fetchCityWeatherAndAqi(trimmedCity);

    if (!result) {
      cityNameEl.textContent = trimmedCity;
      showError(`City "${trimmedCity}" not found. Please check the spelling.`);
      return;
    }

    currentWeatherState = result;
    saveRecentCity(result.name);
    renderMainWeather();
  } catch (err) {
    console.error(err);
    showError("Unable to fetch weather data right now. Please try again.");
  }
};

// GPS "My Location" Handler
gpsBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showError("Geolocation is not supported by your browser.");
    return;
  }

  hideError();
  const originalBtnHtml = gpsBtn.innerHTML;
  gpsBtn.disabled = true;
  gpsBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Locating...`;
  cityNameEl.textContent = "Detecting location...";

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        // Reverse geocode coordinates to get city & country name
        let locationName = "My Location";
        let countryName = "";

        try {
          const revRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const revData = await revRes.json();
          locationName = revData.city || revData.locality || revData.principalSubdivision || "My Location";
          countryName = revData.countryName || "";
        } catch {
          // Fallback agar reverse geocoding network issue kare
        }

        const bundle = await fetchWeatherBundleByCoords(latitude, longitude);
        currentWeatherState = {
          name: locationName,
          country: countryName,
          ...bundle,
        };

        cityInput.value = locationName !== "My Location" ? locationName : "";
        saveRecentCity(locationName);
        renderMainWeather();
      } catch (err) {
        console.error(err);
        showError("Unable to fetch weather for your GPS location.");
      } finally {
        gpsBtn.disabled = false;
        gpsBtn.innerHTML = originalBtnHtml;
      }
    },
    (geoError) => {
      gpsBtn.disabled = false;
      gpsBtn.innerHTML = originalBtnHtml;
      cityNameEl.textContent = currentWeatherState ? currentWeatherState.name : "Delhi";

      if (geoError.code === geoError.PERMISSION_DENIED) {
        showError("Location access denied. Please allow location permission in your browser.");
      } else {
        showError("Unable to retrieve your current location.");
      }
    },
    { timeout: 10000 }
  );
});

// °C / °F Unit Switch Handlers
btnCelsius.addEventListener("click", () => {
  if (!isFahrenheit) return;
  isFahrenheit = false;
  btnCelsius.classList.replace("btn-outline-primary", "btn-primary");
  btnCelsius.classList.add("active");
  btnFahrenheit.classList.replace("btn-primary", "btn-outline-primary");
  btnFahrenheit.classList.remove("active");
  renderMainWeather();
  renderOtherCitiesTable();
});

btnFahrenheit.addEventListener("click", () => {
  if (isFahrenheit) return;
  isFahrenheit = true;
  btnFahrenheit.classList.replace("btn-outline-primary", "btn-primary");
  btnFahrenheit.classList.add("active");
  btnCelsius.classList.replace("btn-primary", "btn-outline-primary");
  btnCelsius.classList.remove("active");
  renderMainWeather();
  renderOtherCitiesTable();
});

const loadOtherCities = async () => {
  try {
    const results = await Promise.all(
      OTHER_CITIES.map(async (label) => ({
        label,
        data: await fetchCityWeatherAndAqi(label),
      }))
    );

    otherCitiesState = results;
    renderOtherCitiesTable();
  } catch (err) {
    console.error(err);
    otherCitiesBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-danger py-3">Failed to load comparison table.</td>
      </tr>
    `;
  }
};

// Search & Dropdown Listeners
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  getWeather(cityInput.value);
});

document.querySelectorAll(".city-option").forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();
    const selectedCity = e.target.textContent;
    cityInput.value = selectedCity;
    getWeather(selectedCity);
  });
});

// Initialize App
renderRecentSearches();
getWeather("Delhi");
loadOtherCities();