// ═══════════════════════════════════════════════════
//  app.js — App init, routing, screen rendering, UI
// ═══════════════════════════════════════════════════

// ── State ──────────────────────────────────────────
let currentScreen   = "dashboard";
let currentWeather  = null;
let onboardingStep  = 0;
let styleProfile    = {};

// ── Onboarding steps ──────────────────────────────
const ONBOARDING_STEPS = [
  {
    title: "Welcome to Garde",
    sub: "Your personal AI wardrobe assistant. Let's set up your style profile, it only takes a minute.",
    type: "info",
  },
  {
    title: "First, what's your name?",
    sub: "We'll use it to personalise your experience.",
    type: "text",
    key: "name",
    placeholder: "Your first name",
  },
  {
    title: "How would you describe your style?",
    sub: "Pick all the vibes that feel like you.",
    type: "multi",
    key: "baseStyle",
    options: [
      { val: "casual",   label: "Casual, relaxed & effortless" },
      { val: "business", label: "Business, clean & polished" },
      { val: "formal",   label: "Formal, sharp & classic" },
      { val: "sport",    label: "Athletic, function meets style" },
    ],
  },
  {
    title: "What's your colour comfort zone?",
    sub: "Select all that apply.",
    type: "multi",
    key: "colorPref",
    options: [
      { val: "neutral",  label: "Neutrals only: black, white, grey, beige" },
      { val: "earthy",   label: "Earthy & muted: navy, brown, olive" },
      { val: "colorful", label: "Bold & expressive, I love colour" },
      { val: "mixed",    label: "Mix it up, depends on the mood" },
    ],
  },
  {
    title: "Where do you spend most of your time?",
    sub: "Select all that apply.",
    type: "multi",
    key: "lifestyle",
    options: [
      { val: "office",   label: "Office or campus, mostly indoors" },
      { val: "outdoor",  label: "On the move, a mix of inside & outside" },
      { val: "social",   label: "Social life, dinners, events, weekends" },
      { val: "home",     label: "Home base, remote or flexible schedule" },
    ],
  },
  {
    title: "How do you feel about sustainable fashion?",
    sub: "We'll adjust our shopping advice to match your priorities.",
    type: "multi",
    key: "sustainPref",
    options: [
      { val: "high",    label: "Big priority, I rewear and buy mindfully" },
      { val: "medium",  label: "Somewhat, I try when it's convenient" },
      { val: "low",     label: "Not really, I just buy what I like" },
    ],
  },
];

// ── Seed icons for demo items that have none ───────
// Runs once at startup — Pollinations URLs load lazily, no blocking
// Clear any stale Unsplash URLs left from a previous version
(function _clearBrokenUrls() {
  wardrobe.getAll().forEach(item => {
    if (item.image && item.image.startsWith("https://source.unsplash")) {
      wardrobe.update(item.id, { image: null });
    }
  });
})();

// ── Boot ───────────────────────────────────────────
window.addEventListener("DOMContentLoaded", async () => {
  // Fetch weather in background immediately
  Weather.fetch().then(ctx => {
    currentWeather = ctx;
    _updateWeatherBadge(ctx);
  });

  // Show splash, then decide: onboarding or app
  setTimeout(() => {
    const splash = document.getElementById("splash");
    splash.classList.add("fade-out");

    setTimeout(() => {
      splash.classList.add("hidden");
      if (Profile.exists()) {
        _showApp();
      } else {
        _showOnboarding();
      }
    }, 500);
  }, 2000);
});

// ── Onboarding ─────────────────────────────────────
function _showOnboarding() {
  document.getElementById("onboarding").classList.remove("hidden");
  _renderOnboardingStep();
  _setupOnboardingNav();
}

function _renderOnboardingStep() {
  const step     = ONBOARDING_STEPS[onboardingStep];
  const total    = ONBOARDING_STEPS.length;
  const progress = Math.round(((onboardingStep + 1) / total) * 100);

  document.getElementById("onboardingProgress").style.width = progress + "%";

  const el = document.getElementById("onboardingStep");
  el.innerHTML = `
    <h2 class="step-title">${step.title}</h2>
    <p class="step-sub">${step.sub}</p>
    ${step.type === "single" || step.type === "multi" ? `
      <div class="step-options">
        ${step.options.map(o => {
          const current = styleProfile[step.key];
          const isSelected = Array.isArray(current)
            ? current.includes(o.val)
            : current === o.val;
          return `
          <button class="step-option ${isSelected ? "selected" : ""}"
                  data-key="${step.key}" data-val="${o.val}">
            ${o.label}
          </button>`;
        }).join("")}
      </div>
    ` : step.type === "text" ? `
      <div class="step-options">
        <input id="onboardingTextInput" type="text" class="onboarding-text-input"
               placeholder="${step.placeholder || ""}"
               value="${styleProfile[step.key] || ""}"
               autocomplete="off" />
      </div>
    ` : ""}
  `;

  // Wire option buttons
  el.querySelectorAll(".step-option").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.key;
      const val = btn.dataset.val;
      if (step.type === "multi") {
        const current = Array.isArray(styleProfile[key]) ? styleProfile[key] : [];
        const idx = current.indexOf(val);
        if (idx === -1) {
          styleProfile[key] = [...current, val];
        } else {
          styleProfile[key] = current.filter(v => v !== val);
        }
        btn.classList.toggle("selected", styleProfile[key].includes(val));
      } else {
        styleProfile[key] = val;
        el.querySelectorAll(".step-option").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
      }
    });
  });

  // Wire text input
  const textInput = el.querySelector("#onboardingTextInput");
  if (textInput) {
    textInput.addEventListener("input", () => {
      styleProfile[step.key] = textInput.value.trim();
    });
    textInput.focus();
  }

  // Show/hide back button
  const backBtn = document.getElementById("onboardingBack");
  backBtn.style.display = onboardingStep === 0 ? "none" : "";

  // Last step label
  const nextBtn = document.getElementById("onboardingNext");
  nextBtn.textContent = onboardingStep === total - 1 ? "Get Started" : "Continue";
}

function _setupOnboardingNav() {
  document.getElementById("onboardingNext").addEventListener("click", () => {
    const step = ONBOARDING_STEPS[onboardingStep];

    // Require a selection or name on choice steps
    if ((step.type === "single" || step.type === "multi") &&
        (!styleProfile[step.key] || (Array.isArray(styleProfile[step.key]) && styleProfile[step.key].length === 0))) {
      showToast("Please pick at least one option to continue", "error");
      return;
    }
    if (step.type === "text" && !styleProfile[step.key]) {
      showToast("Please enter your name to continue", "error");
      return;
    }

    if (onboardingStep < ONBOARDING_STEPS.length - 1) {
      onboardingStep++;
      _renderOnboardingStep();
    } else {
      // Save profile and launch app
      Profile.save({ ...styleProfile, completedAt: new Date().toISOString() });
      document.getElementById("onboarding").classList.add("hidden");
      _showApp();
    }
  });

  document.getElementById("onboardingBack").addEventListener("click", () => {
    if (onboardingStep > 0) {
      onboardingStep--;
      _renderOnboardingStep();
    }
  });
}

// ── App Shell ──────────────────────────────────────
function _showApp() {
  const app = document.getElementById("app");
  app.classList.remove("hidden");
  lucide.createIcons();
  _setupNav();
  _setupAddModal();
  _setupItemDetailModal();
  _setupScrollShadow();
  _updateAvatarBtn();
  navigateTo("dashboard");

  // Show how-to modal on first launch after onboarding
  if (!localStorage.getItem("sw_seen_howto")) {
    setTimeout(_showHowToModal, 800);
  }
}

function _updateAvatarBtn() {
  const name = Profile.get()?.name || "";
  const initial = name.trim() ? name.trim()[0].toUpperCase() : "?";
  document.getElementById("avatarBtn").textContent = initial;
}

// Header drop shadow on scroll
function _setupScrollShadow() {
  const main   = document.getElementById("mainContent");
  const header = document.querySelector(".app-header");
  main.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", main.scrollTop > 4);
  }, { passive: true });
}

// ── Navigation ─────────────────────────────────────
function _setupNav() {
  // Tab buttons
  document.querySelectorAll(".nav-btn[data-screen]").forEach(btn => {
    btn.addEventListener("click", () => navigateTo(btn.dataset.screen));
  });

  // Center "+" button opens add modal
  document.getElementById("nav-add").addEventListener("click", openAddModal);

  // Avatar opens profile
  document.getElementById("avatarBtn").addEventListener("click", () => navigateTo("profile"));
}

function navigateTo(screen) {
  currentScreen = screen;

  // Update nav active state
  document.querySelectorAll(".nav-btn[data-screen]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.screen === screen);
  });

  // Render the screen
  const main = document.getElementById("mainContent");
  switch (screen) {
    case "dashboard": main.innerHTML = _renderDashboard(); break;
    case "wardrobe":  main.innerHTML = _renderWardrobe();  break;
    case "outfits":   main.innerHTML = _renderOutfits();   break;
    case "assistant": main.innerHTML = _renderAssistant(); break;
    case "profile":   main.innerHTML = _renderProfile();   break;
  }

  lucide.createIcons();
  _wireScreen(screen);
  _initLazyImages();
}

function _wireScreen(screen) {
  switch (screen) {
    case "wardrobe":  _wireWardrobe();  break;
    case "outfits":   _wireOutfits();   break;
    case "assistant": _wireAssistant(); break;
    case "profile":   _wireProfile();   break;
    case "dashboard": _startSensors();  break;
  }
}

// ── Sensor Simulation ──────────────────────────────
let _sensorInterval = null;
let _sensorHumidity = 45 + Math.random() * 10; // start in ideal range
let _sensorTemp     = 16 + Math.random() * 4;  // start in ideal range

function _startSensors() {
  _updateSensorDisplay();
  clearInterval(_sensorInterval);
  _sensorInterval = setInterval(() => {
    // Drift slightly each tick — feels like a real sensor
    _sensorHumidity = Math.min(80, Math.max(20, _sensorHumidity + (Math.random() - 0.5) * 1.5));
    _sensorTemp     = Math.min(28, Math.max(10, _sensorTemp     + (Math.random() - 0.5) * 0.5));
    _updateSensorDisplay();
  }, 3000);
}

function _updateSensorDisplay() {
  const hEl  = document.getElementById("sensorHumidity");
  const hSt  = document.getElementById("sensorHumidityStatus");
  const tEl  = document.getElementById("sensorTemp");
  const tSt  = document.getElementById("sensorTempStatus");
  if (!hEl) { clearInterval(_sensorInterval); return; } // navigated away

  const h = Math.round(_sensorHumidity);
  const t = Math.round(_sensorTemp * 10) / 10;

  hEl.textContent = `${h}%`;
  if (h < 40) {
    hSt.textContent  = "Too dry, fibres may weaken";
    hSt.className    = "sensor-status warn";
  } else if (h > 60) {
    hSt.textContent  = "Too damp, mould risk";
    hSt.className    = "sensor-status warn";
  } else {
    hSt.textContent  = "Good, ideal for fabrics";
    hSt.className    = "sensor-status ok";
  }

  tEl.textContent = `${t}°C`;
  if (t < 15) {
    tSt.textContent = "A bit cold, check wool items";
    tSt.className   = "sensor-status warn";
  } else if (t > 22) {
    tSt.textContent = "Too warm, avoid direct sun";
    tSt.className   = "sensor-status warn";
  } else {
    tSt.textContent = "Good, clothes safe";
    tSt.className   = "sensor-status ok";
  }
}

// ── Weather Badge ──────────────────────────────────
function _updateWeatherBadge(ctx) {
  if (!ctx) return;
  document.getElementById("weatherTemp").textContent = `${ctx.temp}°C`;
}

// ══════════════════════════════════════════════════
//  SCREENS
// ══════════════════════════════════════════════════

// ── Dashboard ──────────────────────────────────────
function _renderDashboard() {
  const ctx    = currentWeather;
  const stats  = wardrobe.getStats();
  const outfit = OutfitEngine.todaysOutfit();
  const today  = new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" });

  return `
    <div class="screen">
      <p class="dash-greeting">Good ${_timeOfDay()}, ${Profile.get().name || "there"}</p>
      <p class="dash-date">${today}</p>

      <!-- Weather Card -->
      <div class="weather-card">
        <div class="weather-top">
          <div>
            <div class="weather-temp">${ctx ? ctx.temp + "°" : "--°"}</div>
            <div class="weather-desc">${ctx ? ctx.description : "Loading..."}</div>
            <div class="weather-location">${ctx ? ctx.location : ""}</div>
          </div>
          <div class="weather-icon-big">${ctx ? ctx.description : ""}</div>
        </div>
        <div class="weather-meta">
          <div class="weather-meta-item">
            <span class="weather-meta-label">Humidity</span>
            <span class="weather-meta-val">${ctx ? ctx.humidity + "%" : "--"}</span>
          </div>
          <div class="weather-meta-item">
            <span class="weather-meta-label">Wind</span>
            <span class="weather-meta-val">${ctx ? ctx.windSpeed + " km/h" : "--"}</span>
          </div>
          <div class="weather-meta-item">
            <span class="weather-meta-label">Suggestion</span>
            <span class="weather-meta-val" style="font-size:0.7rem">${ctx ? ctx.summary : "..."}</span>
          </div>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-number">${stats.total}</div>
          <div class="stat-label">Items</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${stats.sustainScore ?? 0}%</div>
          <div class="stat-label">Active</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${Object.keys(stats.categories).length}</div>
          <div class="stat-label">Categories</div>
        </div>
      </div>

      <!-- Today's Outfit -->
      <div class="section-header">
        <span class="section-title">Today's Outfit</span>
        <button class="section-link" onclick="navigateTo('outfits')">See more</button>
      </div>

      ${outfit ? `
        <div class="outfit-preview">
          ${_outfitPieceThumb(outfit.tops, "Top")}
          ${_outfitPieceThumb(outfit.bottoms, "Bottom")}
          ${_outfitPieceThumb(outfit.shoes, "Shoes")}
          ${outfit.outerwear ? _outfitPieceThumb(outfit.outerwear, "Outer") : ""}
        </div>
      ` : `
        <div class="card" style="text-align:center;padding:var(--sp-8)">
          <p style="color:var(--clr-text-2)">Add more items to get outfit suggestions</p>
        </div>
      `}

      <!-- Most worn -->
      ${stats.topWorn ? `
        <div class="section-header" style="margin-top:var(--sp-6)">
          <span class="section-title">Your Favourite</span>
        </div>
        <div class="card" style="display:flex;align-items:center;gap:var(--sp-4)">
          <div style="width:56px;height:56px;flex-shrink:0">${_itemIcon(stats.topWorn, { size: "56px", radius: "var(--radius-md)" })}</div>
          <div>
            <div style="font-weight:700">${stats.topWorn.name || stats.topWorn.category}</div>
            <div style="font-size:var(--text-sm);color:var(--clr-text-2)">Worn ${stats.topWorn.timesWorn} times</div>
          </div>
        </div>
      ` : ""}

      <!-- Wardrobe Sensors -->
      <div class="section-header" style="margin-top:var(--sp-6)">
        <span class="section-title">Wardrobe Sensors</span>
        <span class="sensor-live-dot"></span>
      </div>
      <div class="sensor-card">
        <div class="sensor-item">
          <div class="sensor-icon"><i data-lucide="droplets"></i></div>
          <div class="sensor-info">
            <div class="sensor-label">Humidity</div>
            <div class="sensor-value" id="sensorHumidity">--%</div>
            <div class="sensor-status" id="sensorHumidityStatus"></div>
          </div>
        </div>
        <div class="sensor-divider"></div>
        <div class="sensor-item">
          <div class="sensor-icon"><i data-lucide="thermometer"></i></div>
          <div class="sensor-info">
            <div class="sensor-label">Temperature</div>
            <div class="sensor-value" id="sensorTemp">--°C</div>
            <div class="sensor-status" id="sensorTempStatus"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function _outfitPieceThumb(item, label) {
  if (!item) return "";
  return `
    <div class="outfit-item-card" onclick="openItemDetail('${item.id}')">
      ${_itemIcon(item, { size: "100%", radius: "0" })}
      <div class="outfit-item-label">${label} · ${item.name || item.category}</div>
    </div>
  `;
}

function _timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

// ── Wardrobe Grid ──────────────────────────────────
function _renderWardrobe(activeFilter = "all") {
  const items = wardrobe.getByCategory(activeFilter);
  const cats  = ["all", "tops", "bottoms", "shoes", "outerwear", "dresses", "accessories"];

  return `
    <div class="screen">
      <p class="screen-title">My Wardrobe</p>
      <p class="screen-subtitle">${wardrobe.getAll().length} items</p>

      <div class="filter-bar">
        ${cats.map(c => `
          <button class="filter-chip ${activeFilter === c ? "active" : ""}"
                  data-cat="${c}">
            ${c === "all" ? "All" : c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        `).join("")}
      </div>

      <div class="wardrobe-grid" id="wardrobeGrid">
        ${items.length ? items.map(item => `
          <div class="wardrobe-item" data-id="${item.id}" onclick="openItemDetail('${item.id}')">
            ${_itemIcon(item, { size: "100%", radius: "0" })}
            <div class="item-color-dot" style="background:${COLOR_HEX[item.color] || "#888"};${item.color === "white" ? "border:2px solid #ddd" : ""}"></div>
            <div class="item-badge">${item.name || item.category}</div>
          </div>
        `).join("") : `
          <div class="empty-wardrobe">
            <p>No items in this category yet.<br/>Tap + to add your first piece.</p>
          </div>
        `}
      </div>
    </div>
  `;
}

function _wireWardrobe() {
  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.getElementById("mainContent").innerHTML = _renderWardrobe(chip.dataset.cat);
      lucide.createIcons();
      _wireWardrobe();
    });
  });
}

// ── Looks (Flatlay Builder) ────────────────────────
let _looksOutfit     = { tops: null, bottoms: null, shoes: null, outerwear: null };
let _activeSlot      = "tops";
let _looksOccasion   = "casual";
let _preferredColors = [];

const COLOR_PREF_MAP = {
  neutral:  ["black", "white", "grey", "beige", "navy"],
  earthy:   ["brown", "navy", "green", "beige"],
  colorful: ["red", "pink", "blue", "green"],
  mixed:    [],
};

function _getLooks() {
  try { return JSON.parse(localStorage.getItem("savedLooks") || "[]"); } catch { return []; }
}
function _persistLook(look) {
  const looks = _getLooks();
  looks.unshift(look);
  localStorage.setItem("savedLooks", JSON.stringify(looks.slice(0, 20)));
}
function _deleteLook(id) {
  const looks = _getLooks().filter(l => l.id !== id);
  localStorage.setItem("savedLooks", JSON.stringify(looks));
}

function _renderOutfits() {
  const ctx      = currentWeather;
  const occasions = ["casual", "business", "formal", "sport", "evening", "weekend"];
  const savedLooks = _getLooks();

  return `
    <div class="screen">
      <p class="screen-title">Your Looks</p>
      <p class="screen-subtitle">Build outfits from your wardrobe</p>

      <!-- Weather strip -->
      <div class="outfit-context-bar" style="margin-bottom:var(--sp-4)">
        <div class="context-weather">
          <span>${ctx ? `${ctx.temp}°C · ${ctx.summary}` : "Loading weather..."}</span>
        </div>
      </div>

      <!-- Occasion pills -->
      <div class="occasion-pills" id="occasionPills" style="margin-bottom:var(--sp-5)">
        ${occasions.map(o => `
          <button class="occasion-pill ${o === _looksOccasion ? "active" : ""}" data-occasion="${o}">
            ${o.charAt(0).toUpperCase() + o.slice(1)}
          </button>
        `).join("")}
      </div>

      <!-- Flatlay builder -->
      <div class="flatlay-builder">
        ${_flatlaySlotHTML("outerwear", "Outerwear")}
        ${_flatlaySlotHTML("tops",      "Top")}
        ${_flatlaySlotHTML("bottoms",   "Bottom")}
        ${_flatlaySlotHTML("shoes",     "Shoes")}
      </div>

      <!-- Swapper row -->
      <div class="swapper-scroll" id="swapperRow"></div>

      <!-- Actions -->
      <div class="looks-actions">
        <button class="btn-secondary" id="refreshLookBtn">
          <i data-lucide="refresh-cw"></i> Refresh
        </button>
        <button class="btn-primary" id="wearLookBtn" style="flex:1">
          <i data-lucide="check-circle"></i> Wear today
        </button>
        <button class="btn-secondary" id="saveLookBtn">
          <i data-lucide="bookmark"></i> Save
        </button>
      </div>

      <!-- Saved Looks -->
      <div class="section-header" style="margin-top:var(--sp-7)">
        <span class="section-title">Saved Looks</span>
      </div>

      ${savedLooks.length === 0 ? `
        <div class="card" style="text-align:center;padding:var(--sp-8);color:var(--clr-text-2)">
          Save a built look, or upload an outfit photo via the + button
        </div>
      ` : `
        <div class="saved-looks-grid">
          ${savedLooks.map(l => `
            <div class="saved-look-card" data-look-id="${l.id}">
              ${l.photo
                ? `<img src="${l.photo}" class="saved-look-photo" alt="${l.label}" />`
                : `<div class="saved-look-icons">${l.icons || ""}</div>`
              }
              <div class="saved-look-meta">
                <span class="saved-look-label">${l.label}</span>
                <button class="saved-look-delete" data-delete="${l.id}">✕</button>
              </div>
            </div>
          `).join("")}
        </div>
      `}
    </div>
  `;
}

function _flatlaySlotHTML(cat, label) {
  const item = _looksOutfit[cat];
  const isActive = _activeSlot === cat;
  return `
    <div class="flatlay-slot ${isActive ? "active" : ""}" data-slot="${cat}" id="slot-${cat}">
      <div class="slot-icon">
        ${item
          ? _itemIcon(item, { size: "80px", radius: "var(--radius-lg)" })
          : `<div class="slot-empty-icon"><span>+</span></div>`
        }
      </div>
      <div class="slot-meta">
        <span class="slot-role">${label}</span>
        <span class="slot-name">${item ? (item.name || item.category) : "tap to pick"}</span>
      </div>
    </div>
  `;
}

function _wireOutfits() {
  // Wire profile preferences from onboarding (arrays from multi-select, take first value)
  const profile = Profile.get();
  const baseStyle = Array.isArray(profile.baseStyle) ? profile.baseStyle[0] : profile.baseStyle;
  if (baseStyle && _looksOccasion === "casual") {
    _looksOccasion = baseStyle;
  }
  const colorPref = Array.isArray(profile.colorPref) ? profile.colorPref[0] : profile.colorPref;
  _preferredColors = COLOR_PREF_MAP[colorPref] || [];

  // Auto-generate initial outfit
  const generated = OutfitEngine.generate(null, currentWeather, _looksOccasion, _preferredColors);
  if (generated) {
    _looksOutfit = {
      tops:      generated.tops      || null,
      bottoms:   generated.bottoms   || null,
      shoes:     generated.shoes     || null,
      outerwear: generated.outerwear || null,
    };
    _refreshFlatlay();
  }

  // Set initial active slot + swapper
  _setActiveSlot(_activeSlot);

  // Occasion pills
  document.querySelectorAll(".occasion-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".occasion-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      _looksOccasion = pill.dataset.occasion;
      _generateNewLook();
    });
  });

  // Flatlay slot clicks
  document.querySelectorAll(".flatlay-slot").forEach(slot => {
    slot.addEventListener("click", () => _setActiveSlot(slot.dataset.slot));
  });

  // Refresh
  document.getElementById("refreshLookBtn").addEventListener("click", _generateNewLook);

  // Wear today
  document.getElementById("wearLookBtn").addEventListener("click", () => {
    const worn = Object.values(_looksOutfit).filter(Boolean);
    worn.forEach(item => wardrobe.markWorn(item.id));
    showToast(`${worn.length} items logged as worn`, "success");
  });

  // Save look (built outfit)
  document.getElementById("saveLookBtn").addEventListener("click", () => {
    const pieces = Object.values(_looksOutfit).filter(Boolean);
    if (!pieces.length) { showToast("Build an outfit first", "error"); return; }
    const icons = pieces.map(i => _itemIcon(i, { size: "48px", radius: "var(--radius-sm)" })).join("");
    const label = `${_looksOccasion.charAt(0).toUpperCase() + _looksOccasion.slice(1)} look`;
    _persistLook({ id: Date.now().toString(), label, icons, photo: null, date: new Date().toISOString() });
    showToast("Look saved!", "success");
    navigateTo("outfits");
  });

  // Upload full outfit photo
  // Delete saved look
  document.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      _deleteLook(btn.dataset.delete);
      navigateTo("outfits");
    });
  });
}

function _setActiveSlot(cat) {
  _activeSlot = cat;
  document.querySelectorAll(".flatlay-slot").forEach(el => el.classList.remove("active"));
  const slotEl = document.getElementById(`slot-${cat}`);
  if (slotEl) slotEl.classList.add("active");
  _renderSwapperRow(cat);
}

function _renderSwapperRow(cat) {
  const row   = document.getElementById("swapperRow");
  if (!row) return;
  const items = wardrobe.getAll().filter(i => i.category === cat);

  if (!items.length) {
    row.innerHTML = `<p style="color:var(--clr-text-2);font-size:var(--text-sm);padding:var(--sp-3)">No ${cat} in your wardrobe yet</p>`;
    return;
  }

  row.innerHTML = items.map(item => `
    <button class="swapper-item ${_looksOutfit[cat]?.id === item.id ? "selected" : ""}" data-id="${item.id}" data-cat="${cat}">
      ${_itemIcon(item, { size: "64px", radius: "var(--radius-md)" })}
      <span class="swapper-name">${item.name || item.category}</span>
    </button>
  `).join("");

  row.querySelectorAll(".swapper-item").forEach(btn => {
    btn.addEventListener("click", () => {
      _looksOutfit[btn.dataset.cat] = wardrobe.getById(btn.dataset.id);
      _refreshFlatlay();
      _renderSwapperRow(btn.dataset.cat);
    });
  });
}

function _refreshFlatlay() {
  const slots = ["outerwear", "tops", "bottoms", "shoes"];
  slots.forEach(cat => {
    const el = document.getElementById(`slot-${cat}`);
    if (!el) return;
    const item = _looksOutfit[cat];
    el.querySelector(".slot-icon").innerHTML = item
      ? _itemIcon(item, { size: "80px", radius: "var(--radius-lg)" })
      : `<div class="slot-empty-icon"><span>+</span></div>`;
    el.querySelector(".slot-name").textContent = item ? (item.name || item.category) : "tap to pick";
  });
  lucide.createIcons();
}

function _generateNewLook() {
  const generated = OutfitEngine.generate(null, currentWeather, _looksOccasion, _preferredColors);
  if (!generated) { showToast("Add more items to your wardrobe first", "error"); return; }
  _looksOutfit = {
    tops:      generated.tops      || null,
    bottoms:   generated.bottoms   || null,
    shoes:     generated.shoes     || null,
    outerwear: generated.outerwear || null,
  };
  _refreshFlatlay();
  _renderSwapperRow(_activeSlot);
}

// ── AI Assistant ───────────────────────────────────
function _renderAssistant() {
  return `
    <div class="chat-container">
      <div class="chat-messages" id="chatMessages">
        <div class="chat-bubble ai">
          Hey! I'm Wardi, your AI wardrobe assistant.<br/><br/>
          Ask me anything: outfit ideas, whether to buy something new, or what to wear for a specific occasion.
        </div>
      </div>

      <div class="chat-quick-replies">
        <button class="quick-reply" data-msg="What should I wear today?">What to wear today?</button>
        <button class="quick-reply" data-msg="I'm thinking about buying black jeans. What do you think?">Buy black jeans?</button>
        <button class="quick-reply" data-msg="What outfit would work for a business meeting?">Business outfit?</button>
        <button class="quick-reply" data-msg="Which of my clothes haven't I worn in a while?">Neglected items?</button>
      </div>

      <div class="chat-input-bar">
        <input type="text" id="chatInput" class="chat-input" placeholder="Ask me anything..." />
        <button class="chat-send-btn" id="chatSendBtn">
          <i data-lucide="send"></i>
        </button>
      </div>
    </div>
  `;
}

function _wireAssistant() {
  const input   = document.getElementById("chatInput");
  const sendBtn = document.getElementById("chatSendBtn");
  const messages = document.getElementById("chatMessages");

  async function sendMessage(text) {
    if (!text.trim()) return;
    input.value = "";

    // User bubble
    messages.insertAdjacentHTML("beforeend", `<div class="chat-bubble user">${_escapeHtml(text)}</div>`);

    // Typing indicator
    messages.insertAdjacentHTML("beforeend", `
      <div class="chat-bubble typing" id="typingIndicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `);
    messages.scrollTop = messages.scrollHeight;

    // Get reply
    const reply = await Assistant.send(text);

    // Remove typing indicator
    document.getElementById("typingIndicator")?.remove();

    // AI bubble — escape HTML then convert newlines to <br> for formatting
    messages.insertAdjacentHTML("beforeend", `<div class="chat-bubble ai">${_escapeHtml(reply).replace(/\n/g, "<br>")}</div>`);
    messages.scrollTop = messages.scrollHeight;
  }

  sendBtn.addEventListener("click", () => sendMessage(input.value));
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(input.value); });

  // Quick replies
  document.querySelectorAll(".quick-reply").forEach(btn => {
    btn.addEventListener("click", () => sendMessage(btn.dataset.msg));
  });
}

// ── Profile ────────────────────────────────────────
function _renderProfile() {
  const stats   = wardrobe.getStats();
  const profile = Profile.get() || {};

  // Style breakdown from wardrobe
  const totalStyleTags = Object.values(stats.styles || {}).reduce((s, v) => s + v, 0) || 1;
  const styleRows = Object.entries(stats.styles || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([style, count]) => ({
      label: style.charAt(0).toUpperCase() + style.slice(1),
      pct:   Math.round((count / totalStyleTags) * 100),
    }));

  // Top colors
  const topColors = Object.entries(stats.colors || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Sustainability ring (SVG)
  const score = stats.sustainScore ?? 0;
  const circumference = 2 * Math.PI * 28; // r=28
  const dashOffset = circumference - (score / 100) * circumference;

  return `
    <div class="screen">
      <div class="profile-header">
        <div class="profile-avatar">${(profile.name || "?")[0].toUpperCase()}</div>
        <div class="profile-name" id="profileNameDisplay">${profile.name || "You"}</div>
        <div class="profile-style-tag">${_styleLabel(profile.baseStyle)}</div>
        <div class="profile-action-row">
          <button class="profile-edit-btn" id="profileEditBtn">Edit name</button>
          <button class="profile-howto-btn" id="profileHowtoBtn">How to use</button>
        </div>
      </div>

      <!-- Wardrobe stats -->
      <div class="stats-row" style="margin-bottom:var(--sp-5)">
        <div class="stat-card">
          <div class="stat-number">${stats.total}</div>
          <div class="stat-label">Total Items</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${stats.topWorn?.timesWorn || 0}</div>
          <div class="stat-label">Max Wears</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${Object.keys(stats.categories || {}).length}</div>
          <div class="stat-label">Categories</div>
        </div>
      </div>

      <!-- Style Breakdown -->
      <div class="card" style="margin-bottom:var(--sp-4)">
        <div class="section-header" style="margin-bottom:var(--sp-4)">
          <span class="section-title">Style DNA</span>
        </div>
        <div class="style-breakdown">
          ${styleRows.length ? styleRows.map(row => `
            <div class="style-row">
              <span class="style-label">${row.label}</span>
              <div class="style-bar-track">
                <div class="style-bar-fill" style="width:${row.pct}%"></div>
              </div>
              <span class="style-pct">${row.pct}%</span>
            </div>
          `).join("") : `<p style="color:var(--clr-text-3);font-size:var(--text-sm)">Add items to see your style DNA</p>`}
        </div>
      </div>

      <!-- Color Palette -->
      <div class="card" style="margin-bottom:var(--sp-4)">
        <div class="section-header" style="margin-bottom:var(--sp-4)">
          <span class="section-title">Your Palette</span>
        </div>
        <div class="color-palette">
          ${topColors.map(([color]) => `
            <div class="palette-swatch">
              <div class="swatch-circle" style="background:${COLOR_HEX[color] || "#ccc"};${color === "white" ? "border:2px solid #ddd" : ""}"></div>
              <span class="swatch-label">${color}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Sustainability -->
      <div class="card">
        <div class="section-header" style="margin-bottom:var(--sp-4)">
          <span class="section-title">Sustainability Score</span>
        </div>
        <div class="sustain-score">
          <svg class="score-ring" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="var(--clr-surface-2)" stroke-width="6"/>
            <circle cx="32" cy="32" r="28" fill="none" stroke="var(--clr-primary)" stroke-width="6"
              stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"
              stroke-linecap="round" transform="rotate(-90 32 32)"/>
            <text x="32" y="37" text-anchor="middle" class="score-ring-text">${score}%</text>
          </svg>
          <div class="score-details">
            <div class="score-title">${_sustainTitle(score)}</div>
            <div class="score-desc">${_sustainDesc(score, stats.total)}</div>
          </div>
        </div>
      </div>

    </div>
  `;
}

function _wireProfile() {
  // Animate bars after render
  setTimeout(() => {
    document.querySelectorAll(".style-bar-fill").forEach(bar => {
      const target = bar.style.width;
      bar.style.width = "0%";
      requestAnimationFrame(() => { bar.style.width = target; });
    });
  }, 50);

  document.getElementById("profileEditBtn").addEventListener("click", _showProfileEditForm);
  document.getElementById("profileHowtoBtn").addEventListener("click", _showHowToModal);
}

function _showProfileEditForm() {
  const nameDisplay = document.getElementById("profileNameDisplay");
  const editBtn     = document.getElementById("profileEditBtn");
  const currentName = Profile.get()?.name || "";

  nameDisplay.innerHTML = `
    <input id="profileNameInput" type="text" value="${currentName}"
      style="background:var(--clr-surface-2);border:1px solid var(--clr-primary);
             border-radius:var(--radius-md);padding:var(--sp-2) var(--sp-3);
             color:var(--clr-text-1);font-size:var(--text-base);font-weight:700;
             text-align:center;width:180px;outline:none;" maxlength="30" />
  `;
  editBtn.textContent = "Save";
  editBtn.removeEventListener("click", _showProfileEditForm);

  function save() {
    const input = document.getElementById("profileNameInput");
    const newName = (input?.value || "").trim();
    if (newName) {
      const existing = Profile.get() || {};
      Profile.save({ ...existing, name: newName });
      _updateAvatarBtn();
    }
    // Re-render profile to reflect saved name
    const main = document.getElementById("mainContent");
    main.innerHTML = _renderProfile();
    _wireProfile();
  }

  editBtn.addEventListener("click", save);
  document.getElementById("profileNameInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") save();
  });
  document.getElementById("profileNameInput").focus();
}

function _styleLabel(base) {
  const labels = { casual: "Casual Style", business: "Business Style", formal: "Formal Style", sport: "Athletic Style" };
  const val = Array.isArray(base) ? base[0] : base;
  return labels[val] || "Personal Style";
}

function _sustainTitle(score) {
  if (score >= 70) return "Sustainable Champion";
  if (score >= 40) return "Mindful Dresser";
  return "Room to Improve";
}

function _sustainDesc(score, total) {
  if (score >= 70) return `You've worn ${score}% of your wardrobe in the last 30 days. Excellent rotation!`;
  if (score >= 40) return `${score}% of your items worn recently. Try revisiting pieces you haven't worn in a while.`;
  return `Only ${score}% of your ${total} items worn in the last 30 days. Consider rewearing more before buying new.`;
}

// ── How-to-use modal ───────────────────────────────
function _showHowToModal() {
  if (document.getElementById("howToModal")) return;
  const modal = document.createElement("div");
  modal.id = "howToModal";
  modal.style.cssText = `
    position:fixed;inset:0;z-index:999;
    background:rgba(0,0,0,0.6);
    display:flex;align-items:flex-end;justify-content:center;
  `;
  modal.innerHTML = `
    <div style="
      background:#F2EFEC;border-radius:var(--radius-xl) var(--radius-xl) 0 0;
      width:100%;max-width:480px;padding:var(--sp-6) var(--sp-5) calc(var(--sp-6) + env(safe-area-inset-bottom));
      max-height:90vh;overflow-y:auto;
    ">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-5)">
        <span style="font-size:var(--text-lg);font-weight:800;color:var(--clr-text-1)">How to use Garde</span>
        <button id="howToCloseBtn" style="background:none;border:none;color:var(--clr-text-3);font-size:20px;cursor:pointer;padding:var(--sp-1)">x</button>
      </div>
      <div class="how-to-steps">
        <div class="how-to-step">
          <div class="how-to-num">1</div>
          <div class="how-to-step-text">
            <strong>Add your clothes</strong>
            <span>Tap the + button, take a photo or upload one. The AI will detect the item and fill in the details automatically.</span>
          </div>
        </div>
        <div class="how-to-step">
          <div class="how-to-num">2</div>
          <div class="how-to-step-text">
            <strong>Get outfit ideas</strong>
            <span>Go to Outfits, pick an item you want to wear, and the app will build a complete look based on your wardrobe and the weather.</span>
          </div>
        </div>
        <div class="how-to-step">
          <div class="how-to-num">3</div>
          <div class="how-to-step-text">
            <strong>Ask for advice</strong>
            <span>Use the AI chat to get outfit suggestions, check if a purchase makes sense, or plan what to pack for a trip.</span>
          </div>
        </div>
      </div>
      <div style="background:#ffffff;border-radius:var(--radius-md);padding:var(--sp-4);margin-top:var(--sp-2)">
        <div style="font-size:var(--text-sm);font-weight:700;color:var(--clr-text-1);margin-bottom:var(--sp-2)">Photo tips</div>
        <p class="how-to-tip">For best results, place items flat on a plain surface or hang them against a plain wall. Good lighting makes the AI more accurate.</p>
      </div>
      <button id="howToGotItBtn" style="
        width:100%;margin-top:var(--sp-5);padding:var(--sp-3);
        background:#9d9d60;color:#fff;border:none;
        border-radius:var(--radius-full);font-size:var(--text-base);font-weight:700;cursor:pointer;
      ">Got it</button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => { if (e.target === modal) _closeHowToModal(); });
  document.getElementById("howToCloseBtn").addEventListener("click", _closeHowToModal);
  document.getElementById("howToGotItBtn").addEventListener("click", _closeHowToModal);
}

function _closeHowToModal() {
  const modal = document.getElementById("howToModal");
  if (modal) modal.remove();
  localStorage.setItem("sw_seen_howto", "1");
}

// ── Background removal via /api/remove-bg ─────────
async function _tryRemoveBg(base64Image) {
  try {
    const res = await fetch("/api/remove-bg", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image }),
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ══════════════════════════════════════════════════
//  ADD ITEM MODAL — supports multi-item detection
// ══════════════════════════════════════════════════

let _pendingImage  = null;  // base64 compressed photo
let _detectedItems = [];    // array of items detected by AI (may be >1)

function openAddModal() {
  _pendingImage  = null;
  _detectedItems = [];
  _showUploadStep();
  document.getElementById("addModal").classList.remove("hidden");
  lucide.createIcons();
}

function closeAddModal() {
  _resetDupState();
  document.getElementById("addModal").classList.add("hidden");
}

function _setupAddModal() {
  document.getElementById("addModalBackdrop").addEventListener("click", closeAddModal);
  document.getElementById("cancelAddBtn").addEventListener("click", closeAddModal);

  document.getElementById("uploadZone").addEventListener("click", (e) => {
    if (e.target.closest(".detecting-overlay")) return;
    document.getElementById("fileInput").click();
  });

  document.getElementById("fileInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const compressed = await compressImage(file);
    _showImagePreview(compressed);

    const overlay    = document.getElementById("detectingOverlay");
    const detectText = overlay.querySelector(".detecting-text");
    overlay.classList.remove("hidden");

    // Step 1: AI recognition — determines single item vs outfit
    detectText.textContent = "AI is analyzing your photo...";
    const items = await Recognition.analyzeMultiple(compressed);
    _detectedItems = items;

    if (items.length > 1) {
      // Outfit photo — skip background removal, show outfit review
      overlay.classList.add("hidden");
      _showOutfitReview(items, compressed);
    } else {
      // Single clothing item — remove background, then show item form
      detectText.textContent = "Removing background...";
      const noBg = await _tryRemoveBg(compressed);
      _pendingImage = noBg || compressed;
      if (noBg) _showImagePreview(noBg);
      overlay.classList.add("hidden");

      _applyRecognitionResult(items[0]);
      document.getElementById("itemForm").classList.remove("hidden");
      document.getElementById("saveItemBtn").classList.remove("hidden");
      document.getElementById("cancelAddBtn").classList.remove("hidden");
    }

    e.target.value = "";
  });

  document.getElementById("saveItemBtn").addEventListener("click", _saveSingleItem);

  _setupSelectionGrid("categorySelect", false);
  _setupSelectionGrid("colorSelect",    false);
  _setupSelectionGrid("seasonSelect",   true);
  _setupSelectionGrid("warmthSelect",   false);

  // Reset duplicate warning if user changes category or color
  document.getElementById("categorySelect").addEventListener("click", _resetDupState);
  document.getElementById("colorSelect").addEventListener("click", _resetDupState);
  _setupTagGrid();
}

// ── Upload step (initial state) ────────────────────
function _showUploadStep() {
  const zone = document.getElementById("uploadZone");
  zone.classList.remove("has-image");
  document.getElementById("uploadContent").classList.remove("hidden");
  document.getElementById("detectingOverlay").classList.add("hidden");
  zone.querySelectorAll("img.preview-img").forEach(el => el.remove());

  // Reset form to defaults
  _setActive("categorySelect", "tops");
  _setActive("colorSelect",    "black");
  _setActive("warmthSelect",   "1");
  document.querySelectorAll("#seasonSelect .sel-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll("#tagSelect .tag-btn").forEach(b => b.classList.remove("active"));
  ["itemName","itemBrand","itemTimesWorn","itemLastWorn"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  // Show/hide correct sections
  document.getElementById("itemForm").classList.add("hidden");
  document.getElementById("saveItemBtn").classList.add("hidden");

  // Remove any multi-item review if present
  document.getElementById("multiItemReview")?.remove();
}

function _showImagePreview(base64) {
  const zone = document.getElementById("uploadZone");
  zone.classList.add("has-image");
  document.getElementById("uploadContent").classList.add("hidden");
  zone.querySelectorAll("img.preview-img").forEach(el => el.remove());

  const img = document.createElement("img");
  img.src = base64;
  img.className = "preview-img";
  img.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:calc(var(--radius-lg) - 2px)";
  zone.insertBefore(img, zone.querySelector(".detecting-overlay"));
}

// ── Multi-item review UI ───────────────────────────
// ── Outfit photo review — detected from multi-item photo ──
function _showOutfitReview(items, photoBase64) {
  document.getElementById("itemForm").classList.add("hidden");
  document.getElementById("saveItemBtn").classList.add("hidden");
  document.getElementById("cancelAddBtn").classList.add("hidden");
  document.getElementById("multiItemReview")?.remove();

  const allWardrobe = wardrobe.getAll();

  // Tag each detected item: is it already in the wardrobe?
  const tagged = items.map(item => {
    const match = allWardrobe.find(w => w.category === item.category && w.color === item.color);
    return { ...item, inWardrobe: !!match };
  });

  const missingCount = tagged.filter(i => !i.inWardrobe).length;

  const statusBanner = missingCount > 0
    ? `<div style="background:#fef3c7;border-radius:8px;padding:10px 12px;margin-bottom:16px;font-size:0.75rem;font-weight:600;color:#92400e">
        ⚠ ${missingCount} item${missingCount > 1 ? "s" : ""} not found in your wardrobe
       </div>`
    : `<div style="background:#d1fae5;border-radius:8px;padding:10px 12px;margin-bottom:16px;font-size:0.75rem;font-weight:600;color:#065f46">
        ✓ All items are already in your wardrobe
       </div>`;

  const itemRows = tagged.map(item => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--clr-border)">
      <div style="
        width:36px;height:36px;flex-shrink:0;border-radius:6px;
        background:${COLOR_TINT[item.color] || "#eee"};
        display:flex;align-items:center;justify-content:center;
      ">
        <svg viewBox="0 0 24 24" width="20" height="20" style="color:${COLOR_ICON[item.color] || "#888"}">
          ${CATEGORY_SVG[item.category] || CATEGORY_SVG.tops}
        </svg>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:0.875rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.name || item.category}</div>
        <div style="font-size:0.75rem;color:var(--clr-text-2);text-transform:capitalize">${item.color} · ${item.category}</div>
      </div>
      <span style="
        flex-shrink:0;font-size:0.7rem;font-weight:700;
        padding:3px 8px;border-radius:999px;
        ${item.inWardrobe ? "background:#d1fae5;color:#065f46" : "background:#fef3c7;color:#92400e"}
      ">${item.inWardrobe ? "In wardrobe" : "Not in wardrobe"}</span>
    </div>
  `).join("");

  const reviewHtml = `
    <div id="multiItemReview">
      <p style="font-size:0.875rem;color:var(--clr-text-2);margin-bottom:12px">
        AI detected <strong>${items.length} items</strong> — looks like an outfit photo.
      </p>
      ${statusBanner}
      <div style="margin-bottom:16px">${itemRows}</div>
      <button class="btn-primary" id="saveOutfitLookBtn" style="margin-top:8px">
        <i data-lucide="bookmark"></i> Save as Look
      </button>
      <button class="btn-ghost" id="cancelOutfitBtn">Cancel</button>
    </div>
  `;

  document.getElementById("uploadZone").insertAdjacentHTML("afterend", reviewHtml);
  lucide.createIcons();

  document.getElementById("saveOutfitLookBtn").addEventListener("click", () => {
    _persistLook({
      id:    Date.now().toString(),
      label: `Outfit · ${items.length} pieces`,
      photo: photoBase64,
      icons: null,
      date:  new Date().toISOString(),
    });
    closeAddModal();
    showToast("Look saved!", "success");
    navigateTo("outfits");
  });

  document.getElementById("cancelOutfitBtn").addEventListener("click", closeAddModal);
}

// ── Single item helpers ────────────────────────────
function _applyRecognitionResult(result) {
  if (!result) return;
  if (result.category) _setActive("categorySelect", result.category);
  if (result.color)    _setActive("colorSelect",    result.color);
  if (result.warmth)   _setActive("warmthSelect",   String(result.warmth));

  if (result.season) {
    document.querySelectorAll("#seasonSelect .sel-btn").forEach(b => {
      b.classList.toggle("active", result.season.includes(b.dataset.val));
    });
  }
  if (result.style) {
    document.querySelectorAll("#tagSelect .tag-btn").forEach(b => {
      b.classList.toggle("active", result.style.includes(b.dataset.val));
    });
  }
  if (result.name) document.getElementById("itemName").value = result.name;
}

function _setupSelectionGrid(containerId, multiSelect) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll("[data-val]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (multiSelect) {
        btn.classList.toggle("active");
      } else {
        container.querySelectorAll("[data-val]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      }
    });
  });
}

function _setupTagGrid() {
  document.querySelectorAll("#tagSelect .tag-btn").forEach(btn => {
    btn.addEventListener("click", () => btn.classList.toggle("active"));
  });
}

function _setActive(containerId, val) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll("[data-val]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.val === val);
  });
}

function _getSelected(containerId) {
  const active = document.querySelector(`#${containerId} [data-val].active`);
  return active ? active.dataset.val : null;
}

function _getMultiSelected(containerId) {
  return [...document.querySelectorAll(`#${containerId} [data-val].active`)].map(b => b.dataset.val);
}

function _saveSingleItem() {
  const category = _getSelected("categorySelect");
  const color    = _getSelected("colorSelect");
  const warmth   = parseInt(_getSelected("warmthSelect") || "1");
  const season   = _getMultiSelected("seasonSelect");
  const style    = _getMultiSelected("tagSelect");

  if (!category) { showToast("Please select a category", "error"); return; }
  if (!color)    { showToast("Please select a color",    "error"); return; }
  if (!season.length) { showToast("Please select at least one season", "error"); return; }

  // Duplicate check — warn on first click, allow on second ("Save Anyway")
  const saveBtn = document.getElementById("saveItemBtn");
  if (!saveBtn.dataset.confirmed) {
    const dupes = wardrobe.getAll().filter(i => i.category === category && i.color === color);
    if (dupes.length > 0) {
      _showDupWarning(dupes, color, category);
      saveBtn.dataset.confirmed = "1";
      saveBtn.innerHTML = '<i data-lucide="alert-triangle"></i> Save Anyway';
      lucide.createIcons();
      return;
    }
  }

  _resetDupState();

  const item = wardrobe.add({
    name:      document.getElementById("itemName").value.trim(),
    brand:     document.getElementById("itemBrand").value.trim(),
    timesWorn: document.getElementById("itemTimesWorn").value || 0,
    lastWorn:  document.getElementById("itemLastWorn").value  || null,
    category, color, warmth, season, style,
    image: _pendingImage,
  });

  closeAddModal();
  showToast(`${item.name || "Item"} added to wardrobe`, "success");

  if (currentScreen === "wardrobe")  navigateTo("wardrobe");
  if (currentScreen === "dashboard") navigateTo("dashboard");
}

function _showDupWarning(dupes, color, category) {
  let warn = document.getElementById("dupWarning");
  if (!warn) {
    warn = document.createElement("div");
    warn.id = "dupWarning";
    warn.className = "dup-warning";
    const saveBtn = document.getElementById("saveItemBtn");
    saveBtn.parentNode.insertBefore(warn, saveBtn);
  }
  const names = dupes.slice(0, 2).map(d => d.name || `${d.color} ${d.category}`).join(", ");
  const extra = dupes.length > 2 ? ` +${dupes.length - 2} more` : "";
  warn.innerHTML = `You already own <strong>${dupes.length}</strong> similar item${dupes.length > 1 ? "s" : ""} (${names}${extra}). Still want to add another?`;
}

function _resetDupState() {
  const saveBtn = document.getElementById("saveItemBtn");
  if (saveBtn && saveBtn.dataset.confirmed) {
    delete saveBtn.dataset.confirmed;
    saveBtn.innerHTML = '<i data-lucide="check"></i> Save to Wardrobe';
    lucide.createIcons();
  }
  document.getElementById("dupWarning")?.remove();
}

// ══════════════════════════════════════════════════
//  ITEM DETAIL MODAL
// ══════════════════════════════════════════════════

function openItemDetail(id) {
  const item = wardrobe.getById(id);
  if (!item) return;

  const modal   = document.getElementById("itemDetailModal");
  const content = document.getElementById("itemDetailContent");

  content.innerHTML = `
    <div style="margin-bottom:var(--sp-4);border-radius:var(--radius-lg);overflow:hidden;aspect-ratio:1">
      ${_itemIcon(item, { size: "100%", radius: "var(--radius-lg)", fontSize: "5rem" })}
    </div>

    <div class="item-detail-name">${item.name || item.category}</div>
    ${item.brand ? `<div class="item-detail-brand">${item.brand}</div>` : ""}

    <div class="item-stats-row">
      <div class="item-stat">
        <div class="item-stat-val">${item.timesWorn || 0}</div>
        <div class="item-stat-label">Times worn</div>
      </div>
      <div class="item-stat">
        <div class="item-stat-val" style="font-size:var(--text-sm)">${item.lastWorn || "N/A"}</div>
        <div class="item-stat-label">Last worn</div>
      </div>
      <div class="item-stat">
        <div class="item-stat-val" style="font-size:var(--text-sm)">${item.addedAt}</div>
        <div class="item-stat-label">Added</div>
      </div>
    </div>

    <div class="item-detail-tags">
      <span class="item-tag" style="background:${COLOR_HEX[item.color]};color:${item.color === 'white' || item.color === 'beige' ? '#333' : '#fff'}">
        ${item.color}
      </span>
      <span class="item-tag">${item.category}</span>
      ${(item.season || []).map(s => `<span class="item-tag">${s}</span>`).join("")}
      ${(item.style  || []).map(s => `<span class="item-tag">${s}</span>`).join("")}
    </div>

    <div class="item-detail-actions">
      <button class="btn-wear" id="wearItemBtn">
        <i data-lucide="check-circle"></i> Wear today
      </button>
      <button class="btn-delete" id="deleteItemBtn">
        <i data-lucide="trash-2"></i> Remove
      </button>
    </div>
  `;

  modal.classList.remove("hidden");
  lucide.createIcons();

  document.getElementById("wearItemBtn").addEventListener("click", () => {
    wardrobe.markWorn(id);
    showToast("Outfit logged! Wear count updated", "success");
    closeItemDetail();
    if (currentScreen === "wardrobe")   navigateTo("wardrobe");
    if (currentScreen === "dashboard")  navigateTo("dashboard");
  });

  document.getElementById("deleteItemBtn").addEventListener("click", () => {
    if (confirm(`Remove "${item.name || item.category}" from your wardrobe?`)) {
      wardrobe.remove(id);
      closeItemDetail();
      showToast("Item removed", "");
      if (currentScreen === "wardrobe")   navigateTo("wardrobe");
      if (currentScreen === "dashboard")  navigateTo("dashboard");
    }
  });
}

function closeItemDetail() {
  document.getElementById("itemDetailModal").classList.add("hidden");
}

function _setupItemDetailModal() {
  document.getElementById("itemDetailBackdrop").addEventListener("click", closeItemDetail);
}

// ══════════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════════

// ── Item icon renderer ─────────────────────────────
// If item has a real photo → show it. Otherwise → SVG clothing silhouette.
function _itemIcon(item, { size = "100%", radius = "var(--radius-md)", fontSize = "1.4rem" } = {}) {
  if (item.image && !item.image.startsWith("https://source.unsplash")) {
    // Real uploaded photo
    return `<img src="${item.image}" alt="${item.name || item.category}"
      style="width:${size};height:${size};object-fit:cover;border-radius:${radius}"
      onload="this.classList.add('loaded')" onerror="this.style.display='none'"
      class="lazy" />`;
  }

  // SVG icon card
  const tint     = COLOR_TINT[item.color]  || "#f0f0f5";
  const iconClr  = COLOR_ICON[item.color]  || "#333";
  const svgPath  = CATEGORY_SVG[item.category] || CATEGORY_SVG.tops;

  return `
    <div style="
      width:${size};height:${size};
      background:${tint};
      border-radius:${radius};
      display:flex;align-items:center;justify-content:center;
      overflow:hidden;position:relative;
    ">
      <svg viewBox="0 0 24 24" style="width:65%;height:65%;color:${iconClr}"
        xmlns="http://www.w3.org/2000/svg">
        ${svgPath}
      </svg>
    </div>`;
}

// ── Lazy image fade-in ─────────────────────────────
function _initLazyImages() {
  document.querySelectorAll("img:not(.lazy-init)").forEach(img => {
    img.classList.add("lazy", "lazy-init");
    if (img.complete && img.naturalWidth > 0) {
      img.classList.add("loaded");
    } else {
      img.addEventListener("load",  () => img.classList.add("loaded"), { once: true });
      img.addEventListener("error", () => img.classList.add("loaded"), { once: true });
    }
  });

  // Add skeleton class to wardrobe items while image is loading
  document.querySelectorAll(".wardrobe-item").forEach(card => {
    const img = card.querySelector("img");
    if (!img) return;
    if (!img.complete || img.naturalWidth === 0) {
      card.classList.add("loading");
      img.addEventListener("load",  () => card.classList.remove("loading"), { once: true });
      img.addEventListener("error", () => card.classList.remove("loading"), { once: true });
    }
  });
}

function showToast(message, type = "") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className   = `toast ${type} show`;
  setTimeout(() => { toast.classList.remove("show"); }, 3000);
}

function _escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
