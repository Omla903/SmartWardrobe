// ═══════════════════════════════════════════════════
//  wardrobe.js — Data model, CRUD, localStorage
// ═══════════════════════════════════════════════════

const STORAGE_KEY = "sw_wardrobe_v1";
const PROFILE_KEY = "sw_profile_v1";

// ── Color hex map (for UI rendering) ──────────────
const COLOR_HEX = {
  black:  "#111111",
  white:  "#f5f5f5",
  navy:   "#1a2e5a",
  grey:   "#888888",
  beige:  "#d4b896",
  brown:  "#7b4f2e",
  green:  "#2d6a4f",
  blue:   "#2563eb",
  red:    "#dc2626",
  pink:   "#ec4899",
};

// Light background tint per color (for icon cards)
const COLOR_TINT = {
  black: "#e8e8ec", white: "#f0f0f5", navy: "#dde4f5",
  grey:  "#ececf2", beige: "#f5ede0", brown: "#f0e6dc",
  green: "#d8f0e6", blue:  "#ddeeff", red:  "#fde8e8",
  pink:  "#fde8f3",
};

// Icon color (the SVG fill on the tinted background)
const COLOR_ICON = {
  black: "#222",    white: "#999",    navy:  "#1a2e5a",
  grey:  "#555",    beige: "#8a6a40", brown: "#7b4f2e",
  green: "#2d6a4f", blue:  "#1d4ed8", red:   "#dc2626",
  pink:  "#db2777",
};

// SVG paths for each clothing category (viewBox 0 0 24 24)
const CATEGORY_SVG = {
  // T-shirt: classic wide sleeve triangles + round neckline
  tops: `<path d="M20 7.5L16 4h-1.5C14.5 5.1 13.4 6 12 6S9.5 5.1 9.5 4H8L4 7.5 6.5 10 8 8.8V20h8V8.8L17.5 10z" fill="currentColor"/>`,

  // Trousers: wide waistband tapering into two legs
  bottoms: `<path d="M6 4L5 20h5.5l1.5-7 1.5 7H19l-1-16z" fill="currentColor"/><path d="M6 4h12" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,

  // Sneaker: profile view with upper + thick sole
  shoes: `<path d="M4 16c0-1.7 1.3-3 3-3h4.5L15 9.5c1-1.5 3.5-1 4 1l.5 2 1.5 1c.6.4.5 1.5-.2 1.8L4 16z" fill="currentColor"/><rect x="3" y="16" width="18" height="2.5" rx="1.2" fill="currentColor" opacity="0.8"/>`,

  // Long coat: tall rectangular body + V-notch lapels + center button placket
  outerwear: `<path d="M8.5 3H15.5L19.5 6.5V21H4.5V6.5Z" fill="currentColor"/><path d="M9 5.5L12 10L15 5.5" fill="none" stroke="white" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" opacity="0.65"/><line x1="12" y1="10" x2="12" y2="20" stroke="white" stroke-width="1" opacity="0.4"/>`,

  // Dress: fitted bodice + flared A-line skirt
  dresses: `<path d="M12 2c-1.2 0-3 1.2-3.8 3L5 20h14L15.8 5C15 3.2 13.2 2 12 2z" fill="currentColor"/><path d="M9.2 5h5.6" stroke="white" stroke-width="1" fill="none" stroke-linecap="round" opacity=".4"/>`,

  // Handbag: rectangular body + top-handle loop
  accessories: `<path d="M6 9h12c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2v-8c0-1.1.9-2 2-2z" fill="currentColor"/><path d="M9 9V7C9 5.3 10.3 4 12 4S15 5.3 15 7V9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
};

// ── Emoji fallbacks per category ──────────────────
const CATEGORY_EMOJI = {
  tops:        "👕",
  bottoms:     "👖",
  shoes:       "👟",
  outerwear:   "🧥",
  accessories: "💍",
  dresses:     "👗",
};

// ── Demo data (pre-loaded so app never looks empty) ──
const DEMO_ITEMS = [
  {
    id: "demo_1",
    name: "White Linen Shirt",
    category: "tops",
    color: "white",
    season: ["spring", "summer"],
    warmth: 1,
    style: ["casual", "business"],
    image: null,
    timesWorn: 0,
    lastWorn: null,
    addedAt: "2026-01-10",
  },
  {
    id: "demo_2",
    name: "Black Slim Jeans",
    category: "bottoms",
    color: "black",
    season: ["spring", "autumn", "winter"],
    warmth: 2,
    style: ["casual", "evening"],
    image: null,
    timesWorn: 0,
    lastWorn: null,
    addedAt: "2026-01-10",
  },
  {
    id: "demo_3",
    name: "Navy Wool Sweater",
    category: "tops",
    color: "navy",
    season: ["autumn", "winter"],
    warmth: 3,
    style: ["casual", "weekend"],
    image: null,
    timesWorn: 0,
    lastWorn: null,
    addedAt: "2026-01-12",
  },
  {
    id: "demo_4",
    name: "White Sneakers",
    category: "shoes",
    color: "white",
    season: ["spring", "summer", "autumn"],
    warmth: 1,
    style: ["casual", "sport", "weekend"],
    image: null,
    timesWorn: 0,
    lastWorn: null,
    addedAt: "2026-01-10",
  },
  {
    id: "demo_5",
    name: "Camel Trench Coat",
    category: "outerwear",
    color: "beige",
    season: ["spring", "autumn"],
    warmth: 2,
    style: ["business", "formal", "casual"],
    image: null,
    timesWorn: 0,
    lastWorn: null,
    addedAt: "2026-01-15",
  },
  {
    id: "demo_6",
    name: "Grey Chinos",
    category: "bottoms",
    color: "grey",
    season: ["spring", "autumn", "winter"],
    warmth: 2,
    style: ["business", "casual"],
    image: null,
    timesWorn: 0,
    lastWorn: null,
    addedAt: "2026-01-18",
  },
  {
    id: "demo_7",
    name: "Black Leather Jacket",
    category: "outerwear",
    color: "black",
    season: ["spring", "autumn"],
    warmth: 2,
    style: ["casual", "evening"],
    image: null,
    timesWorn: 0,
    lastWorn: null,
    addedAt: "2026-02-01",
  },
  {
    id: "demo_8",
    name: "Brown Chelsea Boots",
    category: "shoes",
    color: "brown",
    season: ["autumn", "winter"],
    warmth: 3,
    style: ["business", "casual", "formal"],
    image: null,
    timesWorn: 0,
    lastWorn: null,
    addedAt: "2026-01-20",
  },
  {
    id: "demo_9",
    name: "Striped Linen Tee",
    category: "tops",
    color: "navy",
    season: ["spring", "summer"],
    warmth: 1,
    style: ["casual", "weekend"],
    image: null,
    timesWorn: 0,
    lastWorn: null,
    addedAt: "2026-02-10",
  },
  {
    id: "demo_10",
    name: "Beige Linen Trousers",
    category: "bottoms",
    color: "beige",
    season: ["spring", "summer"],
    warmth: 1,
    style: ["casual", "weekend", "business"],
    image: null,
    timesWorn: 0,
    lastWorn: null,
    addedAt: "2026-02-14",
  },
  {
    id: "demo_11",
    name: "Slim Suit Jacket",
    category: "outerwear",
    color: "navy",
    season: ["spring", "autumn", "winter"],
    warmth: 2,
    style: ["formal", "business"],
    image: null,
    timesWorn: 0,
    lastWorn: null,
    addedAt: "2026-02-20",
  },
  {
    id: "demo_12",
    name: "Grey Hoodie",
    category: "tops",
    color: "grey",
    season: ["autumn", "winter"],
    warmth: 2,
    style: ["casual", "sport", "weekend"],
    image: null,
    timesWorn: 0,
    lastWorn: null,
    addedAt: "2026-01-22",
  },
];

// ── Wardrobe class ─────────────────────────────────
class Wardrobe {
  constructor() {
    this._items = this._load();
  }

  // Load from localStorage, seed with demo if empty
  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        let items = JSON.parse(raw);
        // One-time migration: strip fake wear stats from old demo items
        if (!localStorage.getItem("sw_demo_migrated_v2")) {
          items = items.map(item => {
            if (!item.id.startsWith("demo_")) return item;
            return { ...item, timesWorn: 0, lastWorn: null, brand: item.brand || "" };
          });
          this._save(items);
          localStorage.setItem("sw_demo_migrated_v2", "1");
        }
        return items;
      }
    } catch (e) {
      console.warn("Failed to load wardrobe from storage", e);
    }
    // First time — seed with demo data
    this._save(DEMO_ITEMS);
    return [...DEMO_ITEMS];
  }

  _save(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn("Failed to save wardrobe", e);
    }
  }

  // ── Read ────────────────────────────────────────
  getAll() {
    return [...this._items];
  }

  getById(id) {
    return this._items.find(i => i.id === id) || null;
  }

  getByCategory(category) {
    if (category === "all") return this.getAll();
    return this._items.filter(i => i.category === category);
  }

  // ── Create ──────────────────────────────────────
  add(itemData) {
    const item = {
      id:        `item_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      name:      itemData.name      || "",
      brand:     itemData.brand     || "",
      category:  itemData.category  || "tops",
      color:     itemData.color     || "black",
      season:    itemData.season    || ["all"],
      warmth:    itemData.warmth    || 1,
      style:     itemData.style     || [],
      image:     itemData.image     || null, // base64 thumbnail or null
      timesWorn: Number(itemData.timesWorn) || 0,
      lastWorn:  itemData.lastWorn  || null,
      addedAt:   new Date().toISOString().split("T")[0],
    };
    this._items.unshift(item); // newest first
    this._save(this._items);
    return item;
  }

  // ── Update ──────────────────────────────────────
  update(id, changes) {
    const idx = this._items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    this._items[idx] = { ...this._items[idx], ...changes };
    this._save(this._items);
    return this._items[idx];
  }

  // Mark an item as worn today
  markWorn(id) {
    const today = new Date().toISOString().split("T")[0];
    return this.update(id, {
      timesWorn: (this.getById(id)?.timesWorn || 0) + 1,
      lastWorn:  today,
    });
  }

  // ── Delete ──────────────────────────────────────
  remove(id) {
    const before = this._items.length;
    this._items = this._items.filter(i => i.id !== id);
    if (this._items.length < before) {
      this._save(this._items);
      return true;
    }
    return false;
  }

  // ── Stats (used by Dashboard & Profile) ─────────
  getStats() {
    const items = this.getAll();
    if (!items.length) return { total: 0, categories: {}, colors: {}, styles: {}, topWorn: null };

    // Category breakdown
    const categories = {};
    items.forEach(i => {
      categories[i.category] = (categories[i.category] || 0) + 1;
    });

    // Color breakdown
    const colors = {};
    items.forEach(i => {
      colors[i.color] = (colors[i.color] || 0) + 1;
    });

    // Style breakdown
    const styles = {};
    items.forEach(i => {
      (i.style || []).forEach(s => {
        styles[s] = (styles[s] || 0) + 1;
      });
    });

    // Most worn item
    const topWorn = [...items].sort((a, b) => (b.timesWorn || 0) - (a.timesWorn || 0))[0];

    // Sustainability score: ratio of items worn in last 30 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const recentlyWorn = items.filter(i => {
      if (!i.lastWorn) return false;
      return new Date(i.lastWorn) >= cutoff;
    }).length;
    const sustainScore = Math.round((recentlyWorn / items.length) * 100);

    return {
      total:        items.length,
      categories,
      colors,
      styles,
      topWorn,
      sustainScore,
    };
  }
}

// ── Profile (style preferences from onboarding) ───
const Profile = {
  get() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  save(data) {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to save profile", e);
    }
  },
  exists() {
    return !!this.get();
  },
};

// ── Helpers ────────────────────────────────────────

// Compress an image file to a base64 thumbnail (max 400px)
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 400;
        let w = img.width;
        let h = img.height;
        if (w > h && w > MAX) { h = (h * MAX) / w; w = MAX; }
        else if (h > MAX)     { w = (w * MAX) / h; h = MAX; }

        const canvas = document.createElement("canvas");
        canvas.width  = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Generate a unique id (used outside Wardrobe class if needed)
function generateId() {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// Singleton
const wardrobe = new Wardrobe();

