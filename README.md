# Nanotec 3D — Residencial

An interactive, real-time 3D experience of the **Nanotec** residential building
(Santa Cruz de la Sierra, Bolivia), inspired by the aesthetic of modern
real-estate web experiences. The building is **fully procedural** — modeled in
code with three.js, no photography or external assets (only the brand logo image).

**Live:** https://nanotec3d.clubemkt.digital

---

## Features

### Real-time daylight engine (`src/sun.js`)
- Computes the **true solar and lunar position** (Suncalc formulas) for
  Santa Cruz de la Sierra (`lat -17.78`, `lon -63.18`, TZ `America/La_Paz`)
  every frame.
- The scene continuously blends between three palettes driven by the real
  sun altitude:
  - **Day** — blue gradient sky, warm directional sunlight, long shadows,
    muted storefronts, dark LED accents.
  - **Golden hour** — orange horizon glow as the sun approaches the horizon.
  - **Night** — deep purple sky, 1,400 stars fade in, glowing windows,
    LED crown + fins, storefront band, and the **moon rises when the sun
    goes down**.
- Sun and moon directional lights re-aim in real time; shadows follow the
  actual sun position.
- If the real moon is below the horizon at night, a moon is staged into the
  sky window the cameras actually see (az 134–148°, alt 16–22° — solved
  against the camera keyframes and the building silhouette) so the night is
  never moonless. When the real moon is up and inside that window, its real
  position is used.
- Glass reflections use a live environment map regenerated as the sky shifts.
- Bloom post-processing adapts: subtle by day, strong at night.

### Procedural building (`src/building.js`)
- Three joined residential sections with a checkerboard facade of lit/unlit
  window cells, cream vertical fins, an LED crown and per-floor LED strips.
- Rooftop garden with pergolas and green roof.
- Retail podium with a glowing storefront band flanking the **real Nanotec
  logo** (`nano | TEC — by Smart studio`, loaded from
  `public/textures/nanotec-logo.jpg`; black background converted to alpha
  at runtime) and a green living wall.

### Urban context (`src/context.js`)
- Street with sidewalks, crosswalk, street lamps, trees, and low-poly
  neighboring blocks. All urban materials adapt between day and night colors.

### Scroll-driven camera journey (`src/cameraPath.js`)
- Six keyframes: wide corner reveal → street approach → facade glide →
  podium close-up → rooftop garden → final frontal wide.
- Smoothed scroll interpolation; no DOM text — the building is the only
  content.

---

## Tech stack

- [three.js](https://threejs.org) `0.180` (WebGL2), Vite 6
- EffectComposer + UnrealBloomPass post-processing
- ACES Filmic tone mapping, PCF soft shadows
- Zero runtime dependencies beyond three.js; no UI framework

## Project structure

```
├── index.html              # minimal DOM: loading bar + canvas only
├── public/
│   └── textures/
│       └── nanotec-logo.jpg  # real brand logo (black → alpha at runtime)
├── src/
│   ├── main.js             # bootstraps the Experience
│   ├── experience.js       # orchestrator: real-time lighting, scroll, render loop
│   ├── sun.js              # solar/lunar position math (Santa Cruz)
│   ├── sky.js              # gradient sky dome, stars, moon & sun sprites
│   ├── building.js         # procedural Nanotec building + logo sign
│   ├── context.js          # street, lamps, trees, neighbor blocks
│   ├── cameraPath.js       # scroll camera keyframes
│   ├── post.js             # bloom composer
│   └── style.css           # canvas layout + loading bar
└── dist/                   # production build (served by nginx)
```

## Commands

```bash
npm install
npm run dev      # dev server (http://localhost:5173)
npm run build    # production build → dist/
npm run preview  # preview the production build
```

## Deployment

Self-hosted on the clubemkt.digital server behind **nginx**:

- Vhost: `/etc/nginx/sites-available/nanotec3d` serving `dist/` at
  `nanotec3d.clubemkt.digital` (wildcard DNS `*.clubemkt.digital` already
  resolves; TLS terminated by Cloudflare).
- Deploy = `npm run build` — `dist/` is served immediately.

A copy of the nginx config is included at `docs/nginx-nanotec3d.conf`.

## Credits

- Building reference & mood: photographs of the Nanotec project.
- Night aesthetic inspired by classic three.js real-estate demos; all code,
  geometry, and textures here are original/procedural (no third-party assets).
