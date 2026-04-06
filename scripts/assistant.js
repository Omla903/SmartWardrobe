// ═══════════════════════════════════════════════════
//  assistant.js — AI chat via Groq, wardrobe-aware
// ═══════════════════════════════════════════════════

const Assistant = (() => {
  const _history = []; // conversation history for this session

  /**
   * Send a message to the AI assistant.
   * Builds a rich system prompt from wardrobe + weather context.
   * @param {string} userMessage
   * @returns {string} assistant reply
   */
  async function send(userMessage) {
    const purchaseAnalysis = _analyzePurchaseQuery(userMessage);
    const systemPrompt = _buildSystemPrompt(purchaseAnalysis);

    // Keep history to last 10 turns to avoid token overflow
    const recentHistory = [..._history.slice(-9), { role: "user", content: userMessage }];

    try {
      const response = await window.fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: CONFIG.GROQ_CHAT_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            ...recentHistory,
          ],
          max_tokens:  400,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Groq chat error:", response.status, errText);
        return `I'm having a moment, here's my best advice anyway:\n\n${_mockReply(userMessage)}`;
      }

      const data  = await response.json();
      const reply = data.choices?.[0]?.message?.content || "I didn't get a response. Please try again.";

      // Only add to history on success
      _history.push({ role: "user",      content: userMessage });
      _history.push({ role: "assistant", content: reply });

      return reply;

    } catch (err) {
      console.error("Assistant fetch error:", err);
      return `I'm having a moment, here's my best advice anyway:\n\n${_mockReply(userMessage)}`;
    }
  }

  // Build context-rich system prompt
  function _buildSystemPrompt(purchaseAnalysis) {
    const items      = wardrobe.getAll();
    const stats      = wardrobe.getStats();
    const weatherCtx = Weather.getCurrent();

    // Summarize wardrobe for the prompt (avoid huge token counts)
    const wardrobeSummary = items.slice(0, 30).map(i =>
      `- ${i.name || i.category} (${i.color} ${i.category}, worn ${i.timesWorn}x, style: ${(i.style||[]).join("/")})`
    ).join("\n");

    const weatherLine = weatherCtx
      ? `Current weather: ${weatherCtx.temp}°C, ${weatherCtx.description}. ${weatherCtx.summary}.`
      : "Weather data unavailable.";

    // Inject pre-computed purchase facts when relevant
    let purchaseSection = "";
    if (purchaseAnalysis) {
      const { color, category, duplicates, compatibleCount } = purchaseAnalysis;
      const itemLabel = [color, category].filter(Boolean).join(" ") || "this item";
      const dupNames  = duplicates.map(d => d.name || d.category).join(", ") || "none";
      purchaseSection = `
PURCHASE ANALYSIS — pre-computed facts, use these exactly, do not guess:
- Item being considered: ${itemLabel}
- Exact duplicates already in wardrobe: ${duplicates.length} (${dupNames})
- Existing items it pairs well with: ${compatibleCount}
- Duplicate verdict: ${duplicates.length > 0 ? "DUPLICATE — user already owns something very similar" : "No exact duplicate found"}

REQUIRED RESPONSE FORMAT for shopping advice:
1. Duplicate check — state the exact number found
2. Compatibility — state how many existing items it pairs with
3. Clear verdict — buy / skip / maybe, with one-line reason`;
    }

    return `You are a personal AI wardrobe assistant called Wardi. You are friendly, concise, and fashion-savvy.

USER'S WARDROBE (${items.length} items):
${wardrobeSummary}

WARDROBE STATS:
- Total items: ${stats.total}
- Most worn: ${stats.topWorn ? `${stats.topWorn.name || stats.topWorn.category} (${stats.topWorn.timesWorn}x)` : "N/A"}
- Sustainability score: ${stats.sustainScore}%

${weatherLine}
${purchaseSection}
YOUR CAPABILITIES:
1. Suggest outfits using items from their wardrobe
2. Advise on new purchases (check for duplicates, compatibility)
3. Help plan outfits for occasions or trips
4. Encourage sustainable choices (rewear, avoid redundant buys)
5. Answer general style questions

RULES:
- Keep replies short and conversational (2-4 sentences max unless a list is useful)
- When suggesting outfits, reference specific items from the wardrobe by name
- When advising on a purchase, use the pre-computed facts above — never guess
- Be honest: if they have enough of something, say so
- Never be preachy about sustainability — mention it once, naturally`;
  }

  // Parse a purchase question to extract color + category, then run hard wardrobe checks
  function _analyzePurchaseQuery(message) {
    const lower = message.toLowerCase();
    const isPurchase = lower.includes("buy") || lower.includes("purchase") ||
                       lower.includes("get a") || lower.includes("should i get");
    if (!isPurchase) return null;

    const colorKeywords = ["black","white","navy","grey","gray","beige","brown","green","blue","red","pink"];
    const rawColor = colorKeywords.find(c => lower.includes(c)) || null;
    const color    = rawColor === "gray" ? "grey" : rawColor;

    const categoryMap = {
      bottoms:     ["jeans","trousers","pants","chinos","shorts","skirt","leggings"],
      tops:        ["shirt","tee","t-shirt","top","sweater","hoodie","blouse","jumper","pullover"],
      shoes:       ["shoes","sneakers","boots","loafers","heels","trainers"],
      outerwear:   ["jacket","coat","blazer","parka","puffer"],
      dresses:     ["dress","gown","jumpsuit"],
      accessories: ["bag","watch","belt","scarf","hat","cap","sunglasses"],
    };
    let category = null;
    for (const [cat, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(k => lower.includes(k))) { category = cat; break; }
    }

    if (!color && !category) return null;

    const duplicates      = _findDuplicates(color, category);
    const compatibleCount = _countCompatibleItems(color, category);

    return { color, category, duplicates, compatibleCount };
  }

  // Hard duplicate check: same category + same color
  function _findDuplicates(color, category) {
    return wardrobe.getAll().filter(i =>
      (!category || i.category === category) &&
      (!color    || i.color    === color)
    );
  }

  // Count existing items that color-pair well with the potential new item
  function _countCompatibleItems(color, category) {
    if (!color) return 0;
    const COLOR_COMPAT = {
      black: ["black","white","grey","navy","beige","brown","red","pink","green","blue"],
      white: ["black","white","grey","navy","beige","brown","blue","green","pink"],
      navy:  ["white","grey","beige","brown","navy","black"],
      grey:  ["black","white","grey","navy","beige","blue","pink"],
      beige: ["black","navy","brown","white","grey","green"],
      brown: ["beige","navy","white","grey","black","green"],
      green: ["beige","brown","white","black","grey"],
      blue:  ["white","grey","black","navy","beige"],
      red:   ["black","white","grey","navy"],
      pink:  ["grey","white","black","navy"],
    };
    const complementary = {
      tops:        ["bottoms","shoes","outerwear"],
      bottoms:     ["tops","shoes","outerwear"],
      shoes:       ["tops","bottoms"],
      outerwear:   ["tops","bottoms"],
      dresses:     ["shoes","outerwear","accessories"],
      accessories: ["tops","bottoms","dresses"],
    };
    const compat     = COLOR_COMPAT[color] || [];
    const targetCats = category ? (complementary[category] || []) : [];

    return wardrobe.getAll().filter(i =>
      compat.includes(i.color) &&
      (targetCats.length === 0 || targetCats.includes(i.category))
    ).length;
  }

  // Fallback replies when no API key is set
  function _mockReply(message) {
    const lower = message.toLowerCase();

    if (lower.includes("buy") || lower.includes("purchase") || lower.includes("get a") || lower.includes("should i get")) {
      const analysis = _analyzePurchaseQuery(message);
      if (analysis && (analysis.color || analysis.category)) {
        const itemLabel = [analysis.color, analysis.category].filter(Boolean).join(" ") || "this item";
        if (analysis.duplicates.length > 0) {
          const dupName = analysis.duplicates[0].name || analysis.duplicates[0].category;
          return `Duplicate check: you already own ${analysis.duplicates.length} similar item(s), including your ${dupName}.\n\nCompatibility: it would pair with ${analysis.compatibleCount} items in your wardrobe.\n\nVerdict: skip it for now. You've got it covered.`;
        }
        return `Duplicate check: no exact duplicate found in your wardrobe.\n\nCompatibility: it would pair with ${analysis.compatibleCount} items you already own.\n\nVerdict: ${analysis.compatibleCount >= 3 ? "looks like a solid buy, good compatibility." : "think twice, it doesn't pair with many things you have."}`;
      }
      return "Before buying, check if you already have something similar. Make sure the new item can pair with at least 3 things you already own.";
    }
    if (lower.includes("wear") || lower.includes("outfit")) {
      return "Based on your wardrobe, I'd suggest pairing your White Linen Shirt with Black Slim Jeans and White Sneakers. A clean, versatile look that works for most occasions.";
    }
    if (lower.includes("weather") || lower.includes("cold") || lower.includes("warm")) {
      return "For today's weather, I'd recommend layering. Your Navy Wool Sweater with Grey Chinos and Brown Chelsea Boots would be both warm and stylish.";
    }
    if (lower.includes("sustain") || lower.includes("eco")) {
      return "You're doing well! Try to rotate your less-worn pieces more often. Your Striped Linen Tee and Beige Linen Trousers haven't been worn much recently, great candidates for your next outfit.";
    }

    return "I'm your wardrobe assistant! Ask me to suggest an outfit, help plan what to wear for an occasion, or advise on a potential purchase.";
  }

  function clearHistory() {
    _history.length = 0;
  }

  return { send, clearHistory };
})();
