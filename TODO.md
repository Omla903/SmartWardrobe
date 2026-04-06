# Smart Wardrobe — Master Task List

> Last updated: April 2026
> GitHub: https://github.com/Omla903/SmartWardrobe
> Deployment: Vercel (migrating from GitHub Pages)

---

## SPRINT — Current focus (do in order)

### 1. Hosting migration → Vercel
- [ ] Create `vercel.json` config
- [ ] Create `api/remove-bg.js` serverless function (Photoroom proxy — keeps key server-side)
- [ ] Deploy to Vercel via CLI or dashboard
- [ ] Add `PHOTOROOM_API_KEY` as Vercel environment variable
- [ ] Verify live URL works end-to-end
- [ ] Update all references from GitHub Pages URL to Vercel URL

### 2. Background removal (Photoroom)
- [ ] Wire `recognition.js` to call `/api/remove-bg` before Groq vision analysis
- [ ] Show before/after toggle in Add Item modal after upload
- [ ] Store cleaned image (transparent/white bg) as the wardrobe item thumbnail
- [ ] Graceful fallback if Photoroom fails — use raw photo, show soft warning

### 3. Profile inline editing
- [ ] Add pencil ✏️ icon to profile header
- [ ] Tap → name + style pref fields become editable in place (no new screen)
- [ ] Save updates `sw_profile_v1` in localStorage
- [ ] Verify onboarding data flows through correctly for fresh users (name, baseStyle, colorPref, sustainPref)

### 4. How-to-use screen
- [ ] Show automatically once after onboarding completes (flag `sw_howto_seen` in localStorage)
- [ ] Two paths visually:
  - **Path 1 — Add individual items**: "Take a photo of one item on a flat surface → AI removes background → detects type, color, season → saved to your wardrobe"
  - **Path 2 — Save outfits**: "Take a photo of a full outfit (worn or flatlay) → saved as a Look → AI identifies your best combinations"
- [ ] "Got it" dismisses and sets flag
- [ ] Accessible again from Profile screen → "How to use Garde" button

---

## PRIORITY 1 — Demo scenarios (must all work)

### Scenario 1 — Digitizing Clothes
- [ ] Upload photo → Groq Vision detects type, color, season, warmth
- [ ] Background removed cleanly by Photoroom before display
- [ ] User confirms attributes → item saved
- [ ] Fails gracefully if API is slow (loading state, timeout)

### Scenario 2 — Outfit Recommendation
- [ ] Pick one anchor item → full outfit built around it
- [ ] Adapts to live weather (cold = outerwear, warm = light layers)
- [ ] Occasion pills (casual / formal / sport / evening) change the output

### Scenario 3 — Shopping Advice
- [ ] "Should I buy black jeans?" in chat
- [ ] Hard duplicate-check logic before LLM call
- [ ] Response: duplicate count + compatible outfits count + verdict

---

## PRIORITY 2 — Polish before sharing

- [ ] **Onboarding → profile data verified** — confirm name/style from onboarding shows correctly in profile for a fresh user (localStorage cleared)
- [ ] **Groq key UX** — if no key is set, show a soft banner in chat + recognition prompting user to set it in Profile
- [ ] **Weather QA** — confirm live weather works on Vercel URL, test IP fallback
- [ ] **Demo prep** — run all 3 scenarios back to back, target < 5 min
- [ ] **Test on presentation device** (not just your laptop)

---

## PRIORITY 3 — Nice to have

- [ ] Outfit planner — weekly view (7 slots, save outfits per day)
- [ ] Connect onboarding style pref → outfit generator default occasion
- [ ] Sustainability nudges — flag items not worn in 30+ days
- [ ] Wardrobe display mode (TV/tablet full-screen view)
- [ ] Language toggle (French / English)

---

## Done ✅

- [x] Garde rebrand — dark mode, Red Hat Display, coral-red `#FB5959`
- [x] Flatlay outfit builder + Saved Looks tab
- [x] AI Chat assistant (Groq-powered, wardrobe-aware)
- [x] Clothing recognition via Groq Vision
- [x] Groq API key panel in Profile screen
- [x] Dynamic user name from onboarding
- [x] Duplicate detection on upload (warn + confirm)
- [x] Sensor simulation panel on dashboard
- [x] Pre-loaded demo wardrobe data
- [x] Deployed on GitHub Pages (migrating to Vercel)

---

## Known Issues 🐛

- [ ] Chat history resets on page refresh (by design — no backend, acceptable for demo)
- [ ] Multi-photo detection: items share same category icon (no bounding boxes — acceptable)
- [ ] Profile fields not editable after onboarding (fix in Sprint task 3)
