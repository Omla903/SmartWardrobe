// ═══════════════════════════════════════════════════
//  recognition.js — Clothing recognition via Groq Vision
//  Supports multi-item detection from a single photo.
// ═══════════════════════════════════════════════════

const Recognition = (() => {

  /**
   * Detect ALL clothing items in a photo.
   * Returns an array of item objects (one per detected item).
   * @param {string} base64Image — full data:image/jpeg;base64,... string
   * @returns {Array} [{category, color, season, warmth, style, name}, ...]
   */
  async function analyzeMultiple(base64Image) {
    const prompt = `You are a fashion expert analyzing a clothing photo.

Identify EVERY distinct clothing item visible in the photo (e.g. shirt, jeans, jacket, shoes, bag, etc.).

Return ONLY a valid JSON array — no markdown, no explanation:
[
  {
    "category": one of ["tops","bottoms","shoes","outerwear","accessories","dresses"],
    "color": one of ["black","white","navy","grey","beige","brown","green","blue","red","pink"],
    "season": array of one or more ["spring","summer","autumn","winter","all"],
    "warmth": integer 1 (light), 2 (medium), or 3 (warm),
    "style": array of one or more ["casual","formal","sport","evening","business","weekend"],
    "name": short name like "White linen shirt"
  }
]

Rules:
- Return an array even if only one item is visible
- Include every item you can clearly identify
- Choose the closest color from the list
- warmth 1 = light fabrics, warmth 2 = denim/knit layers, warmth 3 = coats/heavy knits
- If unsure about an item, make your best guess — do not skip it`;

    try {
      const response = await window.fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: CONFIG.GROQ_VISION_MODEL,
          messages: [
            {
              role: "user",
              content: [
                { type: "text",      text: prompt },
                { type: "image_url", image_url: { url: base64Image } },
              ],
            },
          ],
          max_tokens:  600,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("Groq Vision error:", response.status, err);
        return [_mockItem()];
      }

      const data   = await response.json();
      const text   = data.choices?.[0]?.message?.content || "";
      const parsed = _parseArray(text);

      return (parsed && parsed.length) ? parsed : [_mockItem()];

    } catch (err) {
      console.error("Recognition failed:", err);
      return [_mockItem()];
    }
  }

  // Safely extract a JSON array from the model's response
  function _parseArray(text) {
    try {
      const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const data  = JSON.parse(clean);

      if (!Array.isArray(data)) return null;

      // Validate and sanitize each item
      return data
        .map(item => ({
          category: _validate(item.category, ["tops","bottoms","shoes","outerwear","accessories","dresses"], "tops"),
          color:    _validate(item.color,    ["black","white","navy","grey","beige","brown","green","blue","red","pink"], "black"),
          season:   Array.isArray(item.season) ? item.season : ["all"],
          warmth:   Number(item.warmth) || 1,
          style:    Array.isArray(item.style)  ? item.style  : ["casual"],
          name:     item.name || "",
        }))
        .filter(item => item.category); // remove malformed entries

    } catch {
      return null;
    }
  }

  function _validate(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
  }

  function _mockItem() {
    return {
      category: "tops",
      color:    "black",
      season:   ["spring", "summer", "autumn"],
      warmth:   1,
      style:    ["casual"],
      name:     "Clothing item",
    };
  }

  /**
   * Generate a product icon URL for a clothing item using Pollinations.ai.
   * Returns a URL immediately — the browser fetches/generates the image lazily.
   * No API key required.
   * @param {Object} item — wardrobe item with category, color, name, style, warmth
   * @returns {string} image URL
   */
  /**
   * Generate a product icon URL for a clothing item.
   * Uses Unsplash Source — real photos, instant, no API key.
   * The seed is deterministic so the same item always gets the same photo.
   */
  // Icon generation is now handled by SVG in wardrobe.js — no external API needed
  function generateIcon(item) { return null; }

  return { analyzeMultiple, generateIcon };
})();
