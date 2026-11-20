# PRD — Nanotec 3D Experience Platform (Sandbox Visual)

> **Project:** `nanotec3d` (Residencial Nanotec, Equipetrol, Santa Cruz de la Sierra, Bolivia)
> **Status:** live at https://nanotec3d.clubemkt.digital · Stack: Vite 6 + three.js 0.180 · **Type: Public visual sandbox (no auth, no DB, no routing)**

---

## 1. Document Overview & Product Vision

**Objective:** Deliver a public, visual 3D experience of the Nanotec building and its surrounding environment. It is a **standalone sandbox**, intentionally separate from the SaaS dashboard (`nanotecsys`). It has no authentication, no database, no routing framework, and no booking flow.

**Core value:** A premium, cinematic, real-time 3D walkthrough of the building that runs in the browser and serves as the visual calling-card for the full platform.

**Scope:**
- Procedural 3D environment (building + context + sky + lighting) — visual-only, no data
- Reference image gallery (`/refs`) as a lightbox overlay, purely visual
- Controls: click/drag orbit (desktop), swipe-to-slide on mobile, scroll-driven camera
- Live daylight engine driven by the real sun/moon position at the building's coordinates

---

## 2. Reference Assets (`refs/`)

51 images are provided in `/refs/` for the visual gallery and reference. They are **not** used as scene textures — they are only surfaced in the gallery overlay.

| Family | Files | Notes |
|---|---|---|
| Piscinas (10) | `piscina1.webp`–`piscina10.avif` | pool + skybridge deck; mix of 1707/3413 heights |
| Parrilleros (6 east, 4 west) | `parrilero-east{1..6}`, `parrilero-west{1..4}` | east/west grill dining areas |
| Coworking (6) | `cowork1.webp`–`cowork6.avif` | cowork office |
| Conferencias (3 + cocina) | `conference-room.avif`, `...2.webp`, `...3.webp`, `conference-cocina.avif` | meeting + kitchen |
| Gaming/meetings (3) | `gameroom.avif`, `meetingroom.avif`, `deckview.avif` | lounge / media / rooftop deck |
| Edificios (8) | `nanotec-conceptfront.jpg` (1920×1080 hero), `...right.jpg`, `...rightnight.jpg`, `nanotec-black.jpeg`, `nanotec-original logo.jpeg`, `nanotec-farleftview.avif`, `nanotec-farrightview.webp`, `nanotec-frontrightview.webp`, `nanotec-frontleftview.webp`, `nanotec-frontcenterbottomview.day.avif`, `nanotec-frontcenterbottomviewnight.jpeg`, `nanotech-frontbottomrightview.avif` | exterior + hero + night foreground |
| Layouts (2) | `nano_sys.png`, `nano_sys_transparent.png` (1672×941) | logos para UI/hardware |

**Format notes:**
- 23 AVIF, 11 WebP, 8 JPEG, 7 JPG, 2 PNG
- One hero: `nanotec-conceptfront.jpg` (1920×1080, the building front facade)
- All ≥ 576px tall; the majority are 2560px wide
- Deduplicate to WebP/AVIF only where the gallery loads many images at once; otherwise serve directly

---

## 3. Architecture

```
nanotec3d/
├── public/
│   ├── textures/
│   │   └── nanotec-logo.jpg        # 1749×608 logo (black → alpha, used in scene)
│   └── refs/                        # [NEW in PRD] reference gallery copy
│       └── <all 51 refs resolved -> public/refs>
├── src/
│   ├── main.js                      # bootstrap: new Experience()
│   ├── experience.js                  # orchestrator: renderer, scene, camera,
│   │                                   # lights, render loop, env-map
│   ├── sun.js                         # solar/lunar math (lat -17.78, lon -63.18)
│   ├── sky.js                         # gradient dome + stars + sun/moon sprites
│   ├── building.js                    # procedural Nanotec (3 towers + podium +
│   │                                   # rooftop + skybridge + LED crown + logo)
│   ├── context.js                     # street, road, sidewalks, lamps, trees,
│   │                                   # neighbour buildings, skyline
│   ├── cameraPath.js                  # 7 scroll-driven camera keyframes
│   ├── controls.js                    # [NEW] OrbitControls: click/drag orbit,
│   │                                   # touch swipe slide on mobile
│   ├── gallery.jsx                    # [NEW] lightbox overlay for /refs
│   ├── post.js                        # EffectComposer + UnrealBloomPass
│   ├── style.css                      # fixed canvas + loading bar + body 700vh
│   └── index.html                     # canvas + loading-bar + module tag
├── vite.config.js
├── package.json                     # devDependency: vite 6; dep: three 0.180
├── package-lock.json
├── README.md
├── .gitignore                       # node_modules/, dist/, *.log
└── docs/
    ├── NANOTEC_PRD.md
    └── nginx-nanotec3d.conf         # nginx vhost (serves dist/)
```

**Component roles:**

| Component | Responsibility |
|---|---|
| `main.js` | Creates `new Experience()` and exposes it on `window.__nanotec` for console tinkering |
| `experience.js` | Owns the renderer (WebGL2, antialias, PCF soft shadows), scene graph, camera, lights, render loop, and the PMREM env map generator for glass reflections |
| `building.js` | Procedural Nanotec: 3 sections A/B/C (10 floors each, widths 20/24/20), cream vertical fins, checkerboard facade (lit/glass/panel/accent via `InstancedMesh`), LED strips + LED crown, green roof, pergolas, podium, storefront band, green living wall, entrance canopy, logo plane |
| `sun.js` | True solar/lunar position (Suncalc) for Santa Cruz de la Sierra; `directionOf()` returns scene-space direction |
| `sky.js` | Gradient dome + 1400 stars + sun/moon sprites; `top/mid/bottomColor` uniforms are driven by sun altitude |
| `context.js` | Road, sidewalks, crosswalk, 6 street lamps, 4 parked cars, 2 boundary walls, 10 neighbour buildings, 8 street trees, 14 distant skyline silhouettes |
| `cameraPath.js` | 7 scroll-driven camera keyframes in [0..1] |
| `controls.js` | OrbitControls: pointer drag to pan/tilt, mobile swipe to slide across screen |
| `gallery.jsx` | Lightbox overlay for `/refs` reference photos |
| `post.js` | `EffectComposer` + `UnrealBloomPass` (strength 0.55, radius 0.6, threshold 0.45) |

---

## 4. Controls Specification

### 4.1 Desktop — click/drag orbit

- **Pointer drag** → orbit the camera around the building (pan + tilt), with inertia/damping
- **Scroll wheel / trackpad** → zoom in/out
- **Click/tap** on UI elements (e.g. gallery thumbnail, a building zone button) → stop orbit and trigger action
- **Touch-action:** `touch-action: none` on the canvas so drags consume the pointer

### 4.2 Mobile — swipe to slide

- **One-finger swipe** → drag the camera horizontally/vertically (slide across the screen)
- The building does not scroll; the **camera slides** to reveal adjacent viewpoints (mirroring the scroll-driven keyframes, but touch-driven)
- **Two-finger pinch** → zoom (optional, but recommended for comfort)
- **Tap** → pause orbit / toggle UI

### 4.3 State machine

```
[IDLE] → drag start → [ORBITING] → drag end → [IDLE] (damped)
[IDLE] → scroll   → [ZOOMING]  → scroll end → [IDLE]
[GALLERY_OPEN] → tap backdrop → [IDLE]
```

---

## 5. Visual / Aesthetic Requirements

### 5.1 What "looks good and detailed" means here

- **High-fidelity materials:** `MeshStandardMaterial` with roughness/metallic mapping, `envMapIntensity` for glass reflections, `toneMapping = ACESFilmic`, `toneMappingExposure` baked in
- **Detail through instancing:** the facade is a handful of `InstancedMesh` draws (lit/glass/panel/accent cells), so a dense building with thousands of cells stays fast
- **Day/night engine:** 3 palettes (day/golden/night) blended from the true sun altitude; stars fade in, moon rises, bloom threshold/strength adapt
- **Environment map:** a live `CanvasTexture` (top→bottom sky gradient) regenerated every ~2s is fed to a `PMREMGenerator` for the `scene.environment`, giving the glass a living sky reflection
- **No external textures** in the scene — every asset (building, context, sky, lighting) is procedural

### 5.2 Layer by layer

| Layer | Visual details |
|---|---|
| Sky | Gradient dome; 1400 vertex-coloured stars; glowing sun sprite (day) / staged moon sprite (night) |
| Building | 3 towers, 10 floors each; checkerboard cells (lit/glass/panel/accent); cream fins; LED strips + crown; rooftop green roof + pergolas; storefront band with colourful windows + neon accents; green living wall at the right end; entrance canopy |
| Context | Dark asphalt road, beige sidewalk, crosswalk stripes, street lamps, 4 parked cars, boundary walls, 10 low-rise neighbours (rich multi-toned, some with lit windows), 14 distant skyline towers, 8 street trees |
| Lighting | Ambient + sun (directional, shadow) + moon (directional, shadow) + fill + 2 point lights (shop glow, roof glow) |

---

## 6. Gallery (Lightbox Overlay)

- Gallery thumbnail grid (lazy-loaded, `srcset` for resolution switching) at the bottom or in a dedicated section
- Tapping a thumbnail opens a **lightbox overlay** over the 3D scene (fixed, `inset: 0`, semi-transparent backdrop + centered image)
- Lightbox shows:
  - The image, full viewport width
  - `alt` text (e.g. `nanotec-conceptfront.jpg` — building front facade)
  - File size + dimensions + format (helper `formatSize`, `formatDimensions`)
  - Optional caption from a note-only mapping (no data persisted)
- Controls: **×** / Escape to close, click backdrop to close, `prev`/`next` keyboard arrows
- The lightbox **does not** load or render the photos into the 3D scene — they are only displayed as UI

---

## 7. Development & Integration Roadmap

| Fase | Work | Output |
|---|---|---|
| **1** | `refs/` → `public/refs/` (resolve symlinks, keep original relative paths) | 51 image files under `public/refs` |
| **2** | `gallery.jsx` lightbox overlay + `formatSize`/`formatDimensions` helpers | Lightbox that opens on thumbnail tap, closes on backdrop/cross/ESC |
| **3** | `controls.js` — OrbitControls (pointer drag + mouse wheel) + touch swipe slide on mobile | Click/drag orbit + swipe-to-slide |
| **4** | `building.js` polish: material detail, LED crown/strip density, storefront band, rooftop, context density | Scene that reads as premium, not generic |
| **5** | `experience.js`: keep day/night engine, auto env-map regeneration, bloom threshold/strength adaptation | Day/night feel, non-flickering reflections |
| **6** | `npm run build` | `dist/` (HTML + JS + CSS + textures + refs) |
| **7** | nginx vhost → `dist/`, Cloudflare TLS | `nanotec3d.clubemkt.digital` **HTTP 200** |
| **8** | Verify: `curl -sI` on `/`, `/assets/index-*.js`, `/assets/index-*.css`, `/textures/nanotec-logo.jpg`, `/refs/*` | All 200 |

## 8. Testing Plan

- `npm run build` → exit 0, `dist/` populated
- Local: `npx vite preview --port 4173` and open browser
- `curl -sI https://nanotec3d.clubemkt.digital/` → 200
- `curl -sI https://nanotec3d.clubemkt.digital/assets/index-*.js` → 200
- `curl -sI https://nanotec3d.clubemkt.digital/assets/index-*.css` → 200
- `curl -sI https://nanotec3d.clubemkt.digital/textures/nanotec-logo.jpg` → 200
- `curl -sI https://nanotec3d.clubemkt.digital/refs/piscina1.webp` (and other refs) → 200

## 9. Design / Quality Principles

- **No JS frameworks.** Pure Three.js + Vite + vanilla CSS
- **Procedural only.** No image textures in the 3D scene; the logo and gallery are the only image-driven assets
- **No persistence.** No DB, no state, no API, no auth
- **Referrers from `/refs` for the gallery only** — served through Vite, then nginx, then Cloudflare
- **Initial load ≤ 2s** (bundle + images); JS < 1MB gzipped
- **Mobile-first:** touch-action handling, swipe-to-slide, viewport-safe sizing

## 10. Open Questions

- Do we want the gallery as a full-screen overlay with a large image, or a bottom sheet on mobile? (Lightbox overlay confirmed by the user.)
- Do we want an autoplay/secondary "tour" mode that auto-scrolls the camera through the 7 keyframes? (Context: the PRD mentions scroll-driven, but the user didn't ask for this; keep as a future option.)
- Should the lightbox show a real-time thumbnail preview (a still from the 3D at the current camera angle)? (No — keep it static for MVP; a pureanvas capture could be added later.)
