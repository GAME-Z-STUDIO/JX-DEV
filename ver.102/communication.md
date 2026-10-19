# Communication Graph & File Linkages (v.2)

## 1. Project Directory Architecture
- `.old/` : Original legacy assets & old UI layout reference standard.
- `v.0/` : Legacy baseline (Server.cs HttpListener + local JSON files in user_data/saves).
- `v.1/` : Legacy development iteration (halted due to logic conflicts & broken viewport regressions).
- `v.2/` : **CURRENT ACTIVE PRODUCTION ENGINE**. Pure Node.js runtime (Express, mysql2/promise, nodemon) with clean architecture, H5 Egret MovieClip animation adapter, full-bleed backgrounds, and standardized 16:9 auto-scaling.
- `v.2_backup/` : Clean safety snapshot taken prior to engine upgrades.

## 2. Server & Backend Linkages (`v.2/`)
- `v.2/server.js`:
  - Entry point for Node.js engine on port 8080.
  - Implements SSE `/live-reload` and polling `/api/live-check`.
  - Serves static assets from `public/`, with fallbacks for legacy resource paths.
  - Mounts routes from `src/routes/auth.js` and `src/routes/saves.js`.
- `v.2/src/config/db.js`:
  - Initializes MySQL connection pool using `.env`.
  - Ensures schema for `u_profile`, `c_profile`, `c_snapshot`, `c_data`.
  - Enforces UPPERCASE column names.
- `v.2/src/middlewares/security.js`:
  - `verifyToken`: Validates Bearer JWT tokens from Authorization header.
  - `verifyPayloadIntegrity`: Enforces replay attack window (X-Timestamp within 30s) and HMAC SHA-256 integrity verification (X-Signature).
- `v.2/src/utils/validator.js`:
  - `validateSnapshotData`: Server-side boundary sanity check against stat anomaly exploits (power, hp, def, dps limits based on level).
- `v.2/public/js/security.js`:
  - Client-side Web Crypto API (SubtleCrypto) helper `sendSecureSave` with auto timestamp and HMAC-SHA256 signature generation.
- `v.2/src/routes/auth.js`:
  - `POST /api/auth` (action: "in" | "up" | "out").
  - Interacts with `u_profile` and issues signed JWT tokens.
- `v.2/src/routes/saves.js`:
  - `GET /api/saves/list?owner=...` & `GET /api/saves` -> queries `c_profile`.
  - `GET /api/saves/get?owner=...&slot=...` -> queries `c_profile` + `c_data`.
  - `POST /api/saves` -> Protected by `verifyToken`, `verifyPayloadIntegrity`, and `validateSnapshotData`. Updates `c_profile`, `c_data`, `c_snapshot`.
  - `DELETE /api/saves?owner=...&slot=...` -> Protected by `verifyToken`. Deletes from `c_profile` (cascading).
  - `POST /api/chars` -> Protected by `verifyToken`, `verifyPayloadIntegrity`, and `validateSnapshotData`. Combat power sync & snapshot backup in `c_snapshot`.

## 3. Modular CSS Architecture (`v.2/public/css/`)
- `app.variables.css`: Unified color palette, element colors, rarity tiers, and typography.
- `app.effect.css`: Visual effects, keyframe animations, glow, pulses, and cooldown sweeps.
- `app.button.css` & `app.wuxia-card.css`: Wuxia button & card styling.
- `app.ui_mb.css`: Vertical layout (mobile) styling.
- `app.ui_pc.css`: Wide layout (desktop) styling.
- `app.auth.css`: Authentication modal card dialog, anchored absolute 18+ watermark notice & logo calligraphy art.
- `app.charselect.css`: Character creation & selection screen styling with transparent surface over `#game-bg`.
- `app.viewport.css`:
  - Master 16:9 Virtual Viewport (1920x1080) with centered transform scale.
  - `#game-bg`: Full-bleed background layer (fixed inset 0, 100vw x 100vh, background-size: cover) eliminating black bars on 2K/4K/ultrawide displays.
  - Layer isolation: `#game-world-layer` (z-index 1), `#game-ui-layer` (z-index 10), `#auth-screen` (z-index 20), `#char-select-screen` (z-index 25), `#modal` (z-index 30/100000).
  - Orientation warning disabled for responsive scaling across any aspect ratio.
- `app.root.css`: Master CSS entrypoint importing the stylesheets above in proper cascade order.

## 4. Standardized Client Script Architecture (`v.2/public/core/`)
Separated into 4 strict decoupled tiers: Data, Engine, UI, and Tools (dissolving `core/models/` and `public/js/`):

### 4.1. Static Data & Parameter Specifications (`core/data/`)
- `locales.js`: Vietnamese charset encoding & string dictionaries (`window.SET_VI`).
- `factions.js`: Wu Xing (Ngũ Hành), 10 factions, elemental attributes & stat matrices.
- `skills.js`: Unified skills database (`JX.skills` + standard skill configs `SK_STD`, `SK_EV`, `SK_EV_MEL`, `SK_RAD_VNG`, `SK_SHXT`).
- `shops.js`: NPC shop inventories & potion pricing catalogs (`JX.shops`).
- `gear_magic.js`: Magic attribute definitions (`JX.ge` + 960001..970584 attributes).
- `gear_base.js`: Base equipment item prototypes (11 categories) & NPC drop tables (`JX.items`, `JX.drop`).
- `gear_blue.js`: Blue equipment magic affixes & tier definitions (`JX.affix`).
- `gear_purple.js`: Purple gear formulas, shard requirements & Định Quốc / An Bang sets (`RCP.recipes`, `RCP.shards`).
- `gear_gold.js`: Golden Equipment sets database & Level 130 catalog (`JX.sets.gold`, `VLI_GEAR130_CATALOG`).
- `gear_platina.js`: Platina Equipment sets & Thien Tu weapon upgrades (`JX.sets.platina`, `JX.platVng`).
- `item_consumables.js`: Potions, Thổ Địa Phù, Tiên Thảo Lộ, Quế Hoa Tửu, Bạch Câu Hoàn, Hồng Bao, Pháo Hoa (`JX.consumables`).
- `item_materials.js`: Huyền Tinh 1–10, Thủy Tinh, Tinh Hồng Bảo Thạch, Phúc Duyên, Khoáng Thạch (`JX.materials`).
- `item_quest.js`: Dã Tẩu, Sát Thủ, Tống Kim tokens, Bí Kíp 90, Mật Tịch, Tẩy Tủy Kinh (`JX.questItems`).
- `monsters.js`: Monster models, sprites, drops, serial maps & translations (`JW.mon`).
- `zones.js`: World zones, dynamic stage overrides, map obstacles (JMO), spawn points (JSP), traps (JST) & town (`JW.zones`, `JW.zalt`).
- `anim_monsters.js`: Monster & boss animation frames, 8-directional sprites (`JW.anim`, `JX_ANIM`, `__HD_ANIM`).
- `anim_characters.js`: Character sprite look definitions & bounding rects (`window.JXLOOK`).
- `doll_res.js`: Paperdoll texture mappings, gold doll sheets & palette links (`window.JDOLL`).
- `effects.js`: Skill particles, visual effects & animation frames (`window.JFX`, `window.__HD_FX`).
- `audio.js`: BGM music, NPC sound bites, skill audio & UI feedback (`window.JS`).

### 4.2. Runtime Processors & Core Engine (`core/engine/`)
- `security.js`: Client-side HMAC SHA-256 save signing via Web Crypto API, integrated with `window.JXSession`.
- `session.js`: Active slot manager, session cookies, cloud save caching & `kickToAuth` redirection (`window.JXSession`).
- `viewport.js`: Virtual 16:9 auto-scaler, responsive layout & multi-layer screen state coordinator.
- `h5anim.js`: Egret MovieClip animation engine, atlas loader & runtime sprite renderer (`window.H5Anim`).
- `doll_renderer.js`: Dynamic paperdoll multi-layer rendering algorithms (`drawDoll`, `drawDollFromLook`).
- `gear_activator.js`: Equipment line activations, attribute calculations & converters (`Pa, S6, kw, Zp, Av, r3...`).
- `app.js`: Lightweight Core Game Loop & simulation engine (decoupled from all static data tables).

### 4.3. User Interface & DOM Views (`core/ui/`)
- `auth_view.js`: Wuxia landing screen, login / registration card modal & session trigger.
- `hud_menu.js`: Action buttons, HUD menus, modal close controllers & UI enhancements.

### 4.4. Development & Diagnostic Tools (`core/tools/`)
- `admin_panel.js`: Admin CP, character inspector, item granter & cheat suite.
- `livereload.js`: SSE auto-reload client for instant development feedback.
- `arena_preview.js`: 3D/2D sprite model arena preview tool.

### 4.5. Third-Party Libraries (`core/lib/`)
- `morphdom.js`: High-performance DOM diffing & patching library.

## 5. Standardized Resource Architecture (`v.2/public/res/`)
- `res/models/`:
  - `characters/doll/` : Paperdoll pieces (lady & man equipment & appearance frames).
  - `characters/sprites/` : JXLOOK spritesheets (female `f/` and male `m/`).
  - `h5/` : Egret MovieClip H5 assets (e.g. `npc09/` with JSON atlas + PNG frames).
  - `monsters/` : Animated models for monsters, NPCs, and bosses.
  - `effects/` : Skill VFX and particle projectile animations.
  - `maps/` : Map background imagery, sub-tiles, and minimaps.
  - `arena/` : Combat arena surfaces.
- `res/icons/`:
  - `items/`, `skills/`, `monsters/`, `factions/`, `fabao/`, `props/`, `ui/`, `app/`
- `res/audio/`:
  - `music/`, `efc/`
- `res/fonts/`:
  - FontAwesome 7/6/5, IBM Plex Mono, Grenze, Noto Sans typography.

## 6. Session & Viewport Flow Synchronization (`v.2`)
- `session.js`:
  - Added `window.JXSession.hasActiveSlot()`.
  - Added cache layer for `window.__SERVER_SAVES` in `sessionStorage` (`jx_server_saves`) to prevent flash of character creation on boot/refresh.
  - Purges all session and character caches on `JXSession.clear()`.
- `viewport.js`:
  - Synchronized `isAuth`, `isChar`, and `isGame` states with `window.JXSession.getUser()` and `window.JXSession.hasActiveSlot()`.
  - Guarantees character select / auth screens block canvas & HUD access when `activeSlot == null`.
- `app.js`:
  - `He()`: Preloads auth and server saves via `await we()` & `await DD()` before rendering `#csel`. Fallbacks cleanly to `op()` only for empty accounts, or `lD()` for unauthenticated users.
  - `DD()`: Persists cloud saves to `sessionStorage` and recovers smoothly from `#cnew` to `#csel` when character saves arrive.
  - `UA()`: Synchronizes updated character snapshots to `window.__SERVER_SAVES` and `sessionStorage`.
  - `index.html`: Cleaned redundant script import of `viewport.js`.

## 7. Save State Unwrapping & Character Transition Fix
- **Backend (`src/routes/saves.js`)**:
  - Implemented `unwrapCharacterState()` recursive unwrapper to safely pierce through nested HTTP payloads (`c_data.DATA`), `Bm` container (`{ v: 2, d }`), and signed `N2` envelopes (`{ f: 2, d, h }`).
  - Standardized `GET /api/saves/list` and `GET /api/saves/get` to supply hydrated `state` objects with real `name`, `lvl`, and `fac` values.
- **Client Engine (`core/engine/app.js`)**:
  - Implemented `unwrapCharState()` in `app.js` to ensure `MM()`, `DD()`, and slot lookups (`$$`) never throw envelope or legacy formatting errors.
  - Guarantees seamless transition from `state-char` into `state-game` upon selecting character slot.
- **VFX & Skills (`core/data/skills.js`, `index.html`)**:
  - Reordered `<script src="core/data/effects.js"></script>` before `skills.js` so `window.JFX` is defined prior to skill configurations.
  - Wrapped JX150 FX registration in `installJx150Fx()`, registering safely on `DOMContentLoaded` or window load after core renderer functions (`skillFx`, `stepFx`, `drawFx`) are initialized by `app.js`.

## 8. High-Res Asset Routing, Equipment Hydration & Service Worker Cleanup
- **High-Res Monster & Character Sprites (`res/models/char`)**:
  - Restored full collection of 132 HD animation spritesheets (`ani*_*.webp`) into `public/res/models/char/`.
  - Updated `v.2/server.js` `PATH_MAP` to correctly route `img/char/` to `models/char/` (fixing blurry fallback to `models/monsters/` and eliminating frame coordinate misalignment / sprite flickering).
- **Equipment & Inventory Hydration (`saves.js` & `app.js`)**:
  - Fixed `unwrapCharacterState` and `unwrapCharState` so `curr.data` and `curr.d` are unpacked past outer metadata envelopes to retrieve real equipped items (`eq: { weapon, armor, ... }`) and inventory (`inv`).
- **Game Engine Loop Guard (`app.js`)**:
  - Added strict guard `if (!o || !o.fac) { requestAnimationFrame(s); return; }` to game loop `Qp(s)`, preventing `Uncaught TypeError: Cannot read properties of null (reading 'fac')` during logout and state transitions.
- **Service Worker & Cache API Disinfection (`sw.js` & `app.js`)**:
  - Created `public/sw.js` that self-unregisters and flushes stale Cache API records on activation.
  - Replaced legacy `navigator.serviceWorker.register()` in `app.js` with registration cleanup (`getRegistrations().unregister()`).

## 9. Equipment Decompression & Base Stat Iteration Guard
- **Automatic Item Inflation (`app.js`)**:
  - Added item decompression in `bo(A)` and `unwrapCharState(val)` so items carrying compressed flags (`_c: "niqclb"`) immediately inflate base properties (`base`, `req`, `lvl`, `n`, `price`) via `gP(item)`.
  - Added safety guards in `A0(A)`, `d0(A)`, `sH(A)`, and `Js(A)` ensuring `dA.base` is checked via `Array.isArray(dA.base)` prior to iteration, eliminating `TypeError: dA.base is not iterable`.
