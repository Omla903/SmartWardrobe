// ═══════════════════════════════════════════════════
//  outfits.js — Rule-based outfit generation engine
// ═══════════════════════════════════════════════════

const OutfitEngine = (() => {

  // Compatible color pairs — which colors go well together
  const COLOR_COMPAT = {
    black:  ["black","white","grey","navy","beige","brown","red","pink","green","blue"],
    white:  ["black","white","grey","navy","beige","brown","blue","green","pink"],
    navy:   ["white","grey","beige","brown","navy","black"],
    grey:   ["black","white","grey","navy","beige","blue","pink"],
    beige:  ["black","navy","brown","white","grey","green"],
    brown:  ["beige","navy","white","grey","black","green"],
    green:  ["beige","brown","white","black","grey"],
    blue:   ["white","grey","black","navy","beige"],
    red:    ["black","white","grey","navy"],
    pink:   ["grey","white","black","navy"],
  };

  // Does color A pair well with color B?
  function _colorsMatch(a, b) {
    return COLOR_COMPAT[a]?.includes(b) ?? true;
  }

  // Does item fit the current weather context?
  function _fitsWeather(item, ctx) {
    if (!ctx) return true;

    // Warmth must be enough for the weather
    if (item.warmth < ctx.warmthNeeded && item.category !== "accessories") {
      // Allow 1 level below for tops (you can layer)
      if (!(item.category === "tops" && item.warmth >= ctx.warmthNeeded - 1)) return false;
    }

    // Season check — item should cover the current season or be "all"
    const season = item.season || [];
    if (!season.includes("all") && !season.includes(ctx.season)) return false;

    // Rain: avoid open shoes
    if (ctx.isRain && item.category === "shoes") {
      if (["casual","sport"].every(s => item.style?.includes(s)) && !item.style?.includes("formal")) {
        // Allow shoes tagged as boots or all-weather (we can't know from current model, so skip this filter)
      }
    }

    return true;
  }

  // Score a candidate item vs the anchor and outfit so far
  function _score(candidate, anchor, outfitColors, occasion, preferredColors) {
    let score = 0;

    // Color compatibility with anchor
    if (_colorsMatch(candidate.color, anchor.color)) score += 3;

    // Color harmony within outfit
    outfitColors.forEach(c => {
      if (_colorsMatch(candidate.color, c)) score += 1;
    });

    // Style match with occasion
    if (occasion && candidate.style?.includes(occasion)) score += 4;
    else if (anchor.style?.some(s => candidate.style?.includes(s))) score += 2;

    // Slight preference for more-worn items (they've been validated by the user)
    if ((candidate.timesWorn || 0) > 5) score += 1;

    // User's color preference from onboarding
    if (preferredColors.length && preferredColors.includes(candidate.color)) score += 2;

    return score;
  }

  // Pick the best item for a given role from a candidate pool
  function _pick(pool, anchor, outfitColors, occasion, weatherCtx, preferredColors) {
    const valid = pool.filter(i => _fitsWeather(i, weatherCtx));
    if (!valid.length) return null;

    const scored = valid
      .map(i => ({ item: i, score: _score(i, anchor, outfitColors, occasion, preferredColors) }))
      .sort((a, b) => b.score - a.score);

    // Pick from top 3 randomly for variety across sessions
    const top = scored.slice(0, Math.min(3, scored.length));
    return top[Math.floor(Math.random() * top.length)].item;
  }

  /**
   * Generate a full outfit suggestion.
   * @param {Object|null} anchor  — Item the user wants to wear (or null for full auto)
   * @param {Object|null} weatherCtx — Result from Weather.getCurrent()
   * @param {string}      occasion   — "casual" | "formal" | "business" | "sport" | "evening" | "weekend"
   * @returns {Object} outfit: { top, bottom, shoes, outerwear (optional), anchor }
   */
  function generate(anchor, weatherCtx, occasion = "casual", preferredColors = []) {
    const all = wardrobe.getAll();
    if (all.length < 3) return null; // not enough items

    const outfit = { anchor: anchor || null };
    const used   = new Set(anchor ? [anchor.id] : []);
    const colors = anchor ? [anchor.color] : [];

    // Determine roles
    const roles = ["tops", "bottoms", "shoes"];
    if (weatherCtx?.warmthNeeded >= 2) roles.push("outerwear");

    // Fill anchor slot first
    if (anchor) {
      if (anchor.category === "dresses") {
        // Dress replaces top+bottom
        outfit.tops    = anchor;
        outfit.bottoms = null;
      } else {
        outfit[anchor.category] = anchor;
      }
    }

    // Fill remaining slots
    roles.forEach(role => {
      if (outfit[role] !== undefined) return; // already filled

      const pool = all.filter(i =>
        i.category === role && !used.has(i.id)
      );
      const chosen = _pick(pool, anchor || { color: "black", style: [occasion] }, colors, occasion, weatherCtx, preferredColors);

      if (chosen) {
        outfit[role]  = chosen;
        used.add(chosen.id);
        colors.push(chosen.color);
      }
    });

    return outfit;
  }

  /**
   * Get a quick "today's outfit" for the dashboard.
   * Uses the most recent weather context and a casual occasion.
   */
  function todaysOutfit() {
    const ctx = Weather.getCurrent();
    return generate(null, ctx, "casual");
  }

  return { generate, todaysOutfit };
})();
