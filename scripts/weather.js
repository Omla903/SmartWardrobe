// ═══════════════════════════════════════════════════
//  weather.js — Open-Meteo integration + outfit context
// ═══════════════════════════════════════════════════

const Weather = (() => {
  let _current = null; // cached weather data

  // WMO weather code → emoji + description
  const WMO_MAP = {
    0:  { icon: "☀️",  desc: "Clear sky" },
    1:  { icon: "🌤️", desc: "Mainly clear" },
    2:  { icon: "⛅",  desc: "Partly cloudy" },
    3:  { icon: "☁️",  desc: "Overcast" },
    45: { icon: "🌫️", desc: "Foggy" },
    48: { icon: "🌫️", desc: "Icy fog" },
    51: { icon: "🌦️", desc: "Light drizzle" },
    53: { icon: "🌦️", desc: "Drizzle" },
    55: { icon: "🌧️", desc: "Heavy drizzle" },
    61: { icon: "🌧️", desc: "Light rain" },
    63: { icon: "🌧️", desc: "Rain" },
    65: { icon: "🌧️", desc: "Heavy rain" },
    71: { icon: "🌨️", desc: "Light snow" },
    73: { icon: "🌨️", desc: "Snow" },
    75: { icon: "❄️",  desc: "Heavy snow" },
    80: { icon: "🌦️", desc: "Rain showers" },
    81: { icon: "🌧️", desc: "Heavy showers" },
    95: { icon: "⛈️",  desc: "Thunderstorm" },
    99: { icon: "⛈️",  desc: "Thunderstorm + hail" },
  };

  function _getWMO(code) {
    return WMO_MAP[code] || { icon: "🌡️", desc: "Unknown" };
  }

  // Derive outfit context from weather data
  function _buildContext(data) {
    const temp    = data.temperature;
    const wmo     = data.weatherCode;
    const isRain  = [51,53,55,61,63,65,80,81].includes(wmo);
    const isSnow  = [71,73,75].includes(wmo);
    const isCold  = temp < 8;
    const isCool  = temp >= 8  && temp < 15;
    const isMild  = temp >= 15 && temp < 22;
    const isWarm  = temp >= 22;

    let warmthNeeded; // 1=light, 2=medium, 3=warm
    if (isCold)      warmthNeeded = 3;
    else if (isCool) warmthNeeded = 2;
    else             warmthNeeded = 1;

    // Current season by month
    const month = new Date().getMonth(); // 0-based
    let season;
    if (month >= 2 && month <= 4)       season = "spring";
    else if (month >= 5 && month <= 7)  season = "summer";
    else if (month >= 8 && month <= 10) season = "autumn";
    else                                season = "winter";

    return {
      temp,
      icon:          data.icon,
      description:   data.description,
      location:      data.location,
      humidity:      data.humidity,
      windSpeed:     data.windSpeed,
      isRain,
      isSnow,
      isCold,
      isCool,
      isMild,
      isWarm,
      warmthNeeded,
      season,
      summary: _buildSummary(temp, isRain, isSnow),
    };
  }

  function _buildSummary(temp, isRain, isSnow) {
    if (isSnow)       return "Snowy, bundle up";
    if (isRain)       return "Rainy, waterproof layers";
    if (temp < 8)     return "Very cold, dress warmly";
    if (temp < 15)    return "Cool, bring a jacket";
    if (temp < 22)    return "Mild, light layers work";
    return "Warm, dress light";
  }

  // Fetch from Open-Meteo (free, no API key)
  async function fetch() {
    try {
      // Try browser geolocation first, fall back to IP-based location
      let latitude, longitude, locName;

      try {
        const pos = await _getPosition();
        latitude  = pos.coords.latitude;
        longitude = pos.coords.longitude;
        locName   = await _reverseGeocode(latitude, longitude);
      } catch {
        // Browser geolocation denied or unavailable — use IP geolocation
        console.warn("Browser geolocation denied, falling back to IP geolocation");
        const ipLoc = await _ipGeolocate();
        latitude  = ipLoc.latitude;
        longitude = ipLoc.longitude;
        locName   = ipLoc.city || "Your location";
      }

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&wind_speed_unit=kmh&temperature_unit=celsius&timezone=auto`;
      const res  = await window.fetch(url);
      const json = await res.json();

      const c   = json.current;
      const wmo = _getWMO(c.weather_code);

      _current = {
        temperature:  Math.round(c.temperature_2m),
        weatherCode:  c.weather_code,
        icon:         wmo.icon,
        description:  wmo.desc,
        humidity:     c.relative_humidity_2m,
        windSpeed:    Math.round(c.wind_speed_10m),
        location:     locName,
      };

      return _buildContext(_current);

    } catch (err) {
      console.warn("Weather fetch failed, using fallback:", err.message);
      return _fallback();
    }
  }

  function _getPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 });
    });
  }

  // IP-based geolocation via ipapi.co — works without browser permission
  async function _ipGeolocate() {
    const key = (typeof CONFIG !== "undefined" && CONFIG.IPAPI_KEY) ? CONFIG.IPAPI_KEY : "";
    const url = key
      ? `https://ipapi.co/json/?key=${key}`
      : "https://ipapi.co/json/";
    try {
      const res  = await window.fetch(url);
      const json = await res.json();
      if (!json.latitude) throw new Error("No coordinates in response");
      return { latitude: json.latitude, longitude: json.longitude, city: json.city };
    } catch (err) {
      console.warn("IP geolocation failed:", err.message);
      // Last resort: default to Barcelona
      return { latitude: 41.3851, longitude: 2.1734, city: "Barcelona" };
    }
  }

  // Reverse geocode via Nominatim
  async function _reverseGeocode(lat, lon) {
    try {
      const res  = await window.fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      const json = await res.json();
      return json.address?.city || json.address?.town || json.address?.village || "Your location";
    } catch {
      return "Your location";
    }
  }

  // Fallback weather when fetch fails or location denied
  function _fallback() {
    _current = {
      temperature:  18,
      weatherCode:  1,
      icon:         "🌤️",
      description:  "Mainly clear",
      humidity:     55,
      windSpeed:    12,
      location:     "Demo mode",
    };
    return _buildContext(_current);
  }

  function getCurrent() {
    return _current ? _buildContext(_current) : null;
  }

  return { fetch, getCurrent };
})();
