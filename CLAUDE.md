# Smart Wardrobe — Project Context

## What This Is
A front-end browser prototype for a Smart Wardrobe concept. Built for a MIBA Prototyping class (Term 2, Final Presentation). The prototype simulates a connected wardrobe with sensors and an app interface.

## Professor Brief
> "You are a startup imagining a connected wardrobe with sensors and a display. People have clothes but lack intelligent tools to manage styling, usage and care — current apps are disconnected from physical context. Build a prototype that combines sensor inputs, an app and an interface to suggest outfits, track wear, help plan outfits and support sustainable choices."

## 3 Demo Scenarios (must nail all three)
1. **Digitizing Clothes** — Upload a photo, system detects attributes (type, color, season, warmth), user confirms, item saved to wardrobe
2. **Outfit Recommendation** — User picks one item ("I want to wear my red sweater") → system builds a full outfit adapted to live weather
3. **Shopping Advice** — User asks "Should I buy black jeans?" → AI checks wardrobe, warns about duplicates, suggests compatibility

## Screens to Build
| Screen | Description |
|---|---|
| Splash | App loading screen |
| Onboarding / Style Quiz | First-time user style preference setup |
| Dashboard | Weather widget + today's outfit suggestion + wardrobe stats |
| Wardrobe Grid | Browse all items, filter by category/color |
| Add Item | Photo upload + attribute tagging (category, color, season, warmth, style tags) |
| Outfit Generator | Pick an item → get a full outfit suggestion |
| AI Chat Assistant | Conversational interface connected to wardrobe data + weather |
| Style Profile | Personal style stats and preferences |

## Tech Stack
- **HTML5** — app shell in `index.html`
- **Vanilla CSS** — full design system in `styles/main.css`
- **Vanilla JavaScript (ES6+)** — modular scripts, no frameworks
- **Lucide Icons** — via CDN
- **Google Fonts** — Red Hat Display
- **Open-Meteo API** — free weather API, no key required
- **Groq API** — vision (clothing recognition) + chat (AI assistant); key stored in localStorage, set via Profile screen
- **Photoroom API** — background removal; key stored server-side as Vercel env var, proxied via `/api/remove-bg`
- **localStorage** — wardrobe data + profile persistence (no backend)
- **Vercel** — hosting + serverless functions (replaces GitHub Pages)

## Folder Structure
```
SmartWardrobe/
├── CLAUDE.md               ← you are here
├── TODO.md                 ← master task list (keep updated)
├── config.js               ← client-side config (Groq key read from localStorage; no secrets committed)
├── index.html              ← app shell + all screen templates
├── styles/
│   └── main.css            ← design system + all component styles
├── scripts/
│   ├── app.js              ← routing, navigation, initialization
│   ├── wardrobe.js         ← wardrobe data, CRUD, localStorage
│   ├── outfits.js          ← outfit generation engine (rule-based)
│   ├── weather.js          ← weather fetching + context rules
│   ├── assistant.js        ← AI chat logic (wardrobe-aware responses)
│   └── recognition.js      ← clothing photo recognition via Groq Vision
├── api/
│   └── remove-bg.js        ← Vercel serverless function — proxies Photoroom API (key never in client)
└── Smart Wardrobe.docx     ← original project document (keep, do not delete)
```

## Architecture Decisions
- **Vercel hosting** — replaces GitHub Pages; enables serverless functions for API key security
- **Photoroom key is server-side only** — stored as `PHOTOROOM_API_KEY` Vercel env var, never in client JS
- **Groq key is user-supplied** — stored in their own localStorage via Profile screen (each user brings their own key)
- **localStorage** for wardrobe data — survives page refresh, good enough for demo
- **Rule-based outfit engine** — simulates AI logic without actual ML
- **Pre-loaded demo data** — wardrobe starts populated so it never looks empty on presentation day
- **Modular JS files** — each file owns one concern, easy for teammates to work on independently

## API Keys (never commit)
| Key | Where stored | Set by |
|-----|-------------|--------|
| `PHOTOROOM_API_KEY` | Vercel environment variable | Omar (in Vercel dashboard) |
| Groq API key | User's localStorage (`groq_api_key`) | Each user via Profile screen |

## GitHub / Vercel
- Repo: https://github.com/Omla903/SmartWardrobe.git
- Vercel project connected to repo — deploys automatically on push to `main`
- Branch strategy: work on `main` for now, teammates can branch if needed

## Team
- MIBA cohort, Term 2
- Omar Trabelsi (primary dev contact via Claude Code)
- Other teammates may contribute later

## Current Status
- [x] Full dark-mode UI — "Garde" rebrand, Red Hat Display, coral-red `#FB5959` accent
- [x] Flatlay outfit builder (Looks tab)
- [x] AI chat assistant (wardrobe-aware, Groq-powered)
- [x] Clothing recognition via Groq Vision
- [x] Dynamic user name from onboarding → shown in greeting + profile
- [x] Groq API key panel in Profile screen
- [ ] **Migrate to Vercel** (in progress — unblocks Photoroom)
- [ ] **Photoroom background removal** — serverless proxy at `/api/remove-bg`
- [ ] **Profile inline editing** — pencil icon, fields editable in place
- [ ] **How-to-use screen** — shown once after onboarding; re-accessible from Profile

## Screen Inventory
| Screen | Status | Notes |
|---|---|---|
| Splash | ✅ Done | Garde wordmark |
| Onboarding quiz | ✅ Done | Saves name + style prefs |
| Dashboard | ✅ Done | Live weather, outfit suggestion, stats |
| Wardrobe grid | ✅ Done | Filter by category/color |
| Add item modal | ✅ Done | Groq vision; bg removal coming |
| Flatlay builder (Looks) | ✅ Done | Save looks, occasion pills |
| AI Chat (Ask AI) | ✅ Done | Wardrobe-aware + shopping advice |
| Profile | 🔧 Partial | Read-only; editing coming |
| How-to-use | ❌ Missing | Two paths: item photos / outfit photos |

## What "Good" Looks Like
- Feels like a real mobile app (not a webpage)
- Demo data pre-loaded — never looks empty
- All 3 professor scenarios are clickable and smooth
- Weather widget shows real live data
- Chat assistant gives wardrobe-aware responses
- Polished animations and transitions
