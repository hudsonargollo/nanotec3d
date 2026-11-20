import * as THREE from 'three'

/**
 * NANOTEC — stylized 3D model built entirely in code.
 * Reference: renders img122 (front), img665 (corner), img1210 (night).
 *
 * Anatomy:
 *  - Retail podium (2 floors): colorful storefronts, green living wall, NANOTEC sign
 *  - 3 residential sections joined by cream vertical fins (towers A/B/C)
 *  - Irregular checkerboard facade: reflective blue glass + light panels, some lit from inside
 *  - Glowing LED fin strips at the edges + LED slat "crown" on the roof
 *  - Rooftop garden: trees + glass pergolas
 */

function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SECTION_WIDTHS = [20, 24, 20]
const FIN_W = 1.2
const DEPTH = 18
const PODIUM_H = 8
const FLOORS = 10
const FLOOR_H = 3
const RES_H = FLOORS * FLOOR_H // 30
const TOTAL_W = SECTION_WIDTHS.reduce((a, b) => a + b, 0) + FIN_W * 2 // 66.4
const X_LEFT = -TOTAL_W / 2 // -33.2

export function createBuilding(scene) {
  const b = new THREE.Group()
  const rand = mulberry32(20261114)

  // ---------------- Materials ----------------
  const matConcrete = new THREE.MeshStandardMaterial({ color: '#8f8a7f', roughness: 0.9 })
  const matCream = new THREE.MeshStandardMaterial({ color: '#efe6cf', roughness: 0.75 })
  const matGlass = new THREE.MeshStandardMaterial({
    color: '#0d151d',
    metalness: 0.85,
    roughness: 0.18,
    envMapIntensity: 1.4,
  })
  const matPanel = new THREE.MeshStandardMaterial({ color: '#f2efe6', roughness: 0.65 })
  const matAccent = new THREE.MeshStandardMaterial({ color: '#1a222b', metalness: 0.6, roughness: 0.4 })
  const matLitGlass = new THREE.MeshBasicMaterial({ color: '#ffffff' }) // instanceColor tinted
  const matDarkGlass = new THREE.MeshStandardMaterial({
    color: '#0a1118',
    metalness: 0.9,
    roughness: 0.22,
    envMapIntensity: 1.6,
  })
  const matStore = new THREE.MeshBasicMaterial({ color: '#ffffff' }) // instanceColor tinted
  const matLed = new THREE.MeshBasicMaterial({ color: '#ffffff' }) // instanceColor tinted (cyan hues)
  const matGreenRoof = new THREE.MeshStandardMaterial({ color: '#2a4a30', roughness: 1 })
  const matGreenWall = new THREE.MeshStandardMaterial({ color: '#1e3d24', roughness: 1 })
  const matTree = new THREE.MeshStandardMaterial({ color: '#1d4022', roughness: 1 })
  const matTrunk = new THREE.MeshStandardMaterial({ color: '#3a2b1c', roughness: 1 })
  const matWhiteFrame = new THREE.MeshStandardMaterial({ color: '#e8e4da', roughness: 0.6 })

  // ---------------- Facade cell collectors ----------------
  // Two instanced meshes collect every facade cell so the whole building
  // renders in a handful of draw calls.
  const cells = [] // {x,y,z,w,h,type,tint}
  const litTints = ['#9fc4ff', '#cfe2ff', '#7fb2f5', '#e8f1ff', '#a9d8ff', '#d4e7ff']
  const panelTints = ['#f4f1e8', '#e9e5da', '#dcd8cf', '#e5e2d8', '#f7f4ec', '#cfd3d6']

  const addFrontCells = (x0, w, zFace) => {
    const cols = Math.round(w / 2.4)
    for (let f = 0; f < FLOORS; f++) {
      for (let c = 0; c < cols; c++) {
        const cw = w / cols
        const r = rand()
        let type = 'glass'
        if (r < 0.34) type = 'lit'
        else if (r < 0.62) type = 'glass'
        else if (r < 0.95) type = 'panel'
        else type = 'accent'
        // irregular sizes: some cells span taller/shorter
        const h = FLOOR_H * (rand() < 0.12 ? 0.72 : 0.86)
        const cellW = cw * (rand() < 0.15 ? 0.6 : 0.92)
        const cx = x0 + cw * (c + 0.5)
        const cy = PODIUM_H + f * FLOOR_H + FLOOR_H / 2
        const cz = zFace + (type === 'panel' ? 0.24 + rand() * 0.12 : type === 'accent' ? 0.18 : 0.02)
        const tint =
          type === 'lit' ? litTints[Math.floor(rand() * litTints.length)] : panelTints[Math.floor(rand() * panelTints.length)]
        cells.push({ x: cx, y: cy, z: cz, w: cellW, h, type, tint })
      }
    }
  }

  const addEndCells = (x, z0, facing) => {
    // vertical strip of cells on the outer side wall of the first/last section
    const cols = 7
    const cw = DEPTH / cols
    for (let f = 0; f < FLOORS; f++) {
      for (let c = 0; c < cols; c++) {
        const r = rand()
        let type = 'glass'
        if (r < 0.3) type = 'lit'
        else if (r < 0.6) type = 'glass'
        else type = 'panel'
        const cx = x + (facing > 0 ? 0.2 + (type === 'panel' ? 0.24 : 0) : -(0.2 + (type === 'panel' ? 0.24 : 0)))
        const cy = PODIUM_H + f * FLOOR_H + FLOOR_H / 2
        const cz = z0 + cw * (c + 0.5)
        const tint =
          type === 'lit' ? litTints[Math.floor(rand() * litTints.length)] : panelTints[Math.floor(rand() * panelTints.length)]
        cells.push({ x: cx, y: cy, z: cz, w: cw * 0.88, h: FLOOR_H * 0.84, type, tint, rotY: facing > 0 ? Math.PI / 2 : -Math.PI / 2 })
      }
    }
  }

  // ---------------- Sections (towers A/B/C) ----------------
  let x = X_LEFT
  const sectionBounds = []
  for (let s = 0; s < 3; s++) {
    const w = SECTION_WIDTHS[s]
    const cx = x + w / 2
    sectionBounds.push({ x0: x, x1: x + w, cx })
    // structural core
    const core = new THREE.Mesh(new THREE.BoxGeometry(w, RES_H, DEPTH), matConcrete)
    core.position.set(cx, PODIUM_H + RES_H / 2, 0)
    core.castShadow = core.receiveShadow = true
    b.add(core)
    // front cells
    addFrontCells(x, w, DEPTH / 2)
    x += w + FIN_W
  }
  // outer end cells (corner glass look)
  addEndCells(X_LEFT, -DEPTH / 2, -1)
  addEndCells(X_LEFT + TOTAL_W, -DEPTH / 2, 1)

  // ---------------- Cream fins between + at edges ----------------
  const finPositions = []
  x = X_LEFT
  for (let s = 0; s < 3; s++) {
    x += SECTION_WIDTHS[s]
    if (s < 2) finPositions.push(x + FIN_W / 2)
    x += FIN_W
  }
  finPositions.push(X_LEFT, X_LEFT + TOTAL_W)
  for (const fx of finPositions) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(FIN_W, PODIUM_H + RES_H + 1.2, DEPTH + 1.6), matCream)
    fin.position.set(fx, (PODIUM_H + RES_H + 1.2) / 2, 0)
    fin.castShadow = fin.receiveShadow = true
    b.add(fin)
  }

  // ---------------- Instanced facade cells ----------------
  const cellGeo = new THREE.PlaneGeometry(1, 1)
  const groups = { lit: [], glass: [], panel: [], accent: [] }
  for (const c of cells) groups[c.type].push(c)

  const makeInstances = (list, material) => {
    if (!list.length) return null
    const mesh = new THREE.InstancedMesh(cellGeo, material, list.length)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const pos = new THREE.Vector3()
    const scl = new THREE.Vector3()
    const col = new THREE.Color()
    list.forEach((c, i) => {
      q.setFromEuler(new THREE.Euler(0, c.rotY || 0, 0))
      pos.set(c.x, c.y, c.z)
      scl.set(c.w, c.h, 1)
      m.compose(pos, q, scl)
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, col.set(c.tint || '#ffffff'))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    b.add(mesh)
    return mesh
  }
  makeInstances(groups.lit, matLitGlass)
  makeInstances(groups.glass, matDarkGlass)
  makeInstances(groups.panel, matPanel)
  makeInstances(groups.accent, matAccent)

  // ---------------- LED fin strips (vertical glow at outer edges) ----------------
  const ledStrips = []
  for (const ex of [X_LEFT - 0.55, X_LEFT + TOTAL_W + 0.55]) {
    for (let i = 0; i < 3; i++) ledStrips.push({ x: ex, z: -DEPTH / 2 + 2 + i * 6.5 })
  }
  const ledStripMats = []
  for (const s of ledStrips) {
    const mat = new THREE.MeshBasicMaterial({ color: '#39d6ff' })
    ledStripMats.push(mat)
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.18, RES_H * 0.85, 0.35), mat)
    strip.position.set(s.x, PODIUM_H + RES_H * 0.55, s.z)
    b.add(strip)
  }

  // ---------------- LED slat crown on the roof ----------------
  const crown = []
  const slatSpacing = 0.95
  const addCrownRun = (from, to, axis, fixed, zOrX) => {
    const n = Math.floor(Math.abs(to - from) / slatSpacing)
    for (let i = 0; i <= n; i++) {
      const t = from + (i * slatSpacing * Math.sign(to - from) || 0)
      crown.push(axis === 'x' ? { x: t, z: zOrX } : { x: zOrX, z: t })
    }
  }
  addCrownRun(X_LEFT, X_LEFT + TOTAL_W, 'x', 0, DEPTH / 2 + 0.5)
  addCrownRun(X_LEFT, X_LEFT + TOTAL_W, 'x', 0, -DEPTH / 2 + 0.5)
  addCrownRun(-DEPTH / 2, DEPTH / 2, 'z', 0, X_LEFT + 0.4)
  addCrownRun(-DEPTH / 2, DEPTH / 2, 'z', 0, X_LEFT + TOTAL_W - 0.4)
  const crownMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.14, 3.0, 0.45),
    matLed,
    crown.length
  )
  {
    const m = new THREE.Matrix4()
    const col = new THREE.Color()
    crown.forEach((c, i) => {
      m.makeTranslation(c.x, PODIUM_H + RES_H + 1.8, c.z)
      crownMesh.setMatrixAt(i, m)
      const v = 0.7 + rand() * 0.5
      crownMesh.setColorAt(i, col.setRGB(0.2 * v, 0.85 * v, 1.0 * v))
    })
    crownMesh.instanceMatrix.needsUpdate = true
    if (crownMesh.instanceColor) crownMesh.instanceColor.needsUpdate = true
  }
  b.add(crownMesh)

  // ---------------- Rooftop garden ----------------
  const roof = new THREE.Mesh(new THREE.BoxGeometry(TOTAL_W + 1.4, 0.5, DEPTH + 1.6), matGreenRoof)
  roof.position.set(0, PODIUM_H + RES_H + 0.25, 0)
  roof.receiveShadow = true
  b.add(roof)

  const treeProto = new THREE.Group()
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 2.0, 6), matTrunk)
  trunk.position.y = 1
  treeProto.add(trunk)
  for (let i = 0; i < 3; i++) {
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85 + rand() * 0.5, 1), matTree)
    blob.position.set((rand() - 0.5) * 0.9, 2.1 + rand() * 0.9, (rand() - 0.5) * 0.9)
    treeProto.add(blob)
  }
  const roofTreeXs = [-26, -15, -2, 10, 22, 29]
  for (const tx of roofTreeXs) {
    const t = treeProto.clone()
    t.position.set(tx, PODIUM_H + RES_H + 0.5, (rand() - 0.5) * 8)
    t.scale.setScalar(0.8 + rand() * 0.5)
    b.add(t)
  }

  // glass pergolas on the roof
  const matPergolaGlass = new THREE.MeshStandardMaterial({
    color: '#8fd4e8',
    transparent: true,
    opacity: 0.28,
    roughness: 0.1,
    metalness: 0.2,
    envMapIntensity: 2,
  })
  for (const px of [-22, -6, 14]) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(9, 2.6, DEPTH - 4), matPergolaGlass)
    g.position.set(px, PODIUM_H + RES_H + 1.8, 0)
    b.add(g)
    const frame = new THREE.Mesh(new THREE.BoxGeometry(9.3, 0.15, DEPTH - 3.7), matWhiteFrame)
    frame.position.set(px, PODIUM_H + RES_H + 3.15, 0)
    b.add(frame)
  }

  // ---------------- Rooftop amenities: pool, skybridge, parrilleros ----------------
  // Swimming pool + skybridge deck; parrilleros (grill dining) on the edges.
  // Purely geometry-based (PRD: no image textures in the scene).
  const poolDeckMat = new THREE.MeshStandardMaterial({
    color: '#bcbec4', roughness: 0.6, metalness: 0.0,
  });
  const poolWaterMat = new THREE.MeshStandardMaterial({
    color: '#14314d', roughness: 0.3, metalness: 0.08, envMapIntensity: 1.0,
  });
  const bridgeMat = new THREE.MeshStandardMaterial({
    color: '#c6cacb', roughness: 0.5, metalness: 0.15,
  });
  const railMat = new THREE.MeshStandardMaterial({
    color: '#2a2a30', roughness: 0.6, metalness: 0.7,
  });
  const parrileroMat = new THREE.MeshStandardMaterial({
    color: '#222228', roughness: 0.5, metalness: 0.8,
  });
  const flameMat = new THREE.MeshBasicMaterial({ color: '#ff6a2a' });

  // ---- pool deck / rim ----
  const poolDeck = new THREE.Mesh(
    new THREE.BoxGeometry(19, 0.35, 5.6), poolDeckMat
  );
  poolDeck.position.set(0, PODIUM_H + RES_H + 0.25, 0);
  poolDeck.receiveShadow = true;
  b.add(poolDeck);

  // ---- pool water ----
  const water = new THREE.Mesh(
    new THREE.BoxGeometry(18, 0.24, 5.0), poolWaterMat
  );
  water.position.set(0, PODIUM_H + RES_H + 0.49, 0);
  water.receiveShadow = true;
  b.add(water);

  // ---- infinity-edge highlight ----
  const hlMat = new THREE.MeshBasicMaterial({ color: '#2fb8d8' });
  const hl = new THREE.Mesh(
    new THREE.BoxGeometry(18, 0.03, 0.05), hlMat
  );
  hl.position.set(0, PODIUM_H + RES_H + 0.66, 0);
  b.add(hl);

  // ---- skybridge deck crossing over the pool ----
  const bridge = new THREE.Mesh(
    new THREE.BoxGeometry(24, 0.12, 2.2), bridgeMat
  );
  bridge.position.set(0, PODIUM_H + RES_H + 1.78, 0);
  bridge.receiveShadow = true;
  b.add(bridge);
  // ---- bridge railings ----
  for (let zx = -12; zx <= 12; zx += 24) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 2.2), railMat);
    r.position.set(zx, PODIUM_H + RES_H + 1.84, 0);
    b.add(r);
    const f = new THREE.Mesh(new THREE.BoxGeometry(24, 0.05, 0.05), railMat);
    f.position.set(0, PODIUM_H + RES_H + 1.84, zx);
    b.add(f);
  }

  // ---- parrilleros (grill dining) on the roof edges ----
  // 4 west (left) + 6 east (right)
  const parrilleroPositions = [-30.5, -26.5, -22.5, -18.5, 11.2, 15.2, 19.2, 23.2, 27.2, 31.2];
  for (const px of parrilleroPositions) {
    const hood = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 1.2, 2.0), parrileroMat
    );
    hood.position.set(px, PODIUM_H + RES_H + 0.5, 0);
    hood.castShadow = true;
    b.add(hood);
    // glowing burner
    const flame = new THREE.Mesh(
      new THREE.CircleGeometry(0.45, 8),
      flameMat
    );
    flame.position.set(px, PODIUM_H + RES_H + 1.12, 0);
    flame.rotation.x = -Math.PI / 2;
    flame.material.opacity = 0.9;
    flame.material.transparent = true;
    b.add(flame);
  }

  // ---------------- Podium ----------------
  const podium = new THREE.Mesh(new THREE.BoxGeometry(TOTAL_W, PODIUM_H, 22), matConcrete)
  podium.position.set(0, PODIUM_H / 2, 2)
  podium.castShadow = podium.receiveShadow = true
  b.add(podium)

  // storefront band (continuous glowing retail strip, flanking the logo sign)
  const storeCells = []
  const storeCols = 26
  const sw = TOTAL_W / storeCols
  const accentColors = ['#ff2f92', '#43e8ff', '#ff7a3d', '#ff5470', '#7de3ff']
  for (let c = 0; c < storeCols; c++) {
    const cx = X_LEFT + sw * (c + 0.5)
    if (Math.abs(cx) < 13.5) continue // center strip reserved for the logo sign
    if (rand() < 0.07) continue // rare dark gap
    const color = rand() < 0.72 ? (rand() < 0.5 ? '#ffe2b8' : '#fff3df') : accentColors[Math.floor(rand() * accentColors.length)]
    const h = 4.4 + rand() * 1.2
    storeCells.push({
      x: X_LEFT + sw * (c + 0.5),
      y: 2.6,
      z: 13.05,
      w: sw * 0.94,
      h,
      tint: color,
    })
    // mezzanine band lights
    if (rand() < 0.6) {
      storeCells.push({ x: X_LEFT + sw * (c + 0.5), y: 6.7, z: 13.05, w: sw * 0.78, h: 1.0, tint: '#ffd9a0' })
    }
  }
  const storeMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), matStore, storeCells.length)
  {
    const m = new THREE.Matrix4()
    const col = new THREE.Color()
    storeCells.forEach((c, i) => {
      m.makeTranslation(c.x, c.y, c.z)
      storeMesh.setMatrixAt(i, m)
      storeMesh.setColorAt(i, col.set(c.tint))
    })
    storeMesh.instanceMatrix.needsUpdate = true
    if (storeMesh.instanceColor) storeMesh.instanceColor.needsUpdate = true
  }
  b.add(storeMesh)

  // green living wall (right end of podium, like img665/1210)
  const gw = new THREE.Mesh(new THREE.BoxGeometry(17, 6.4, 0.5), matGreenWall)
  gw.position.set(X_LEFT + TOTAL_W - 10, 4.2, 13.1)
  b.add(gw)
  for (let i = 0; i < 7; i++) {
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + rand() * 0.4, 1), matTree)
    blob.position.set(gw.position.x + (rand() - 0.5) * 15, 1.6 + rand() * 5, 13.4)
    b.add(blob)
  }

  // entrance canopy
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(18, 0.5, 4.5), matCream)
  canopy.position.set(0, PODIUM_H + 0.25, 14)
  canopy.castShadow = true
  b.add(canopy)

  // NANOTEC logo — the real brand image (black background → alpha)
  const logoGeometry = new THREE.PlaneGeometry(24, 24 * (608 / 1749))
  const matSign = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })
  const sign = new THREE.Mesh(logoGeometry, matSign)
  sign.position.set(0, PODIUM_H - 4.1, 13.2)
  b.add(sign)

  loadLogoTexture('/textures/nanotec-logo.jpg').then((tex) => {
    matSign.map = tex
    matSign.opacity = 1
    matSign.needsUpdate = true
  })

  scene.add(b)

  // ---------------- Key anchor positions ----------------
  return {
    group: b,
    mats: {
      litGlass: matLitGlass,
      ledCrown: matLed,
      ledStrips: ledStripMats,
      storefront: matStore,
      sign: matSign,
    },
  }
}

/**
 * Converts the brand image (logo on black) into a transparent texture:
 * black becomes alpha so the letters glow on any facade.
 */
async function loadLogoTexture(url) {
  const img = new Image()
  img.src = url
  await img.decode()
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, c.width, c.height)
  const px = data.data
  for (let i = 0; i < px.length; i += 4) {
    const lum = Math.max(px[i], px[i + 1], px[i + 2])
    px[i + 3] = Math.min(255, Math.round(lum * 1.6))
  }
  ctx.putImageData(data, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}
