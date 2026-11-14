import * as THREE from 'three'

/**
 * Urban context: street, crosswalk, lamps, parked cars,
 * neighboring low buildings with red-tile roofs, and trees.
 */
export function createContext(scene) {
  const g = new THREE.Group()
  const rand = () => Math.random()

  const matGround = new THREE.MeshStandardMaterial({ color: '#141318', roughness: 1 })
  const matAsphalt = new THREE.MeshStandardMaterial({ color: '#0d0d12', roughness: 0.95 })
  const matSidewalk = new THREE.MeshStandardMaterial({ color: '#26262c', roughness: 0.9 })
  const matStripe = new THREE.MeshStandardMaterial({ color: '#cfcabe', roughness: 0.8 })
  const matWall = new THREE.MeshStandardMaterial({ color: '#d8d5d0', roughness: 0.9 })
  const matNeighbA = new THREE.MeshStandardMaterial({ color: '#b9b3a9', roughness: 0.95 })
  const matNeighbB = new THREE.MeshStandardMaterial({ color: '#8d8780', roughness: 0.95 })
  const matRoofTile = new THREE.MeshStandardMaterial({ color: '#7d3b2a', roughness: 1 })
  const matTree = new THREE.MeshStandardMaterial({ color: '#1e4022', roughness: 1 })
  const matTree2 = new THREE.MeshStandardMaterial({ color: '#2a5c2e', roughness: 1 })
  const matTrunk = new THREE.MeshStandardMaterial({ color: '#3a2b1c', roughness: 1 })
  const matLampGlow = new THREE.MeshBasicMaterial({ color: '#ffd9a0' })
  const matWindowLit = new THREE.MeshBasicMaterial({ color: '#ffd9a0' })
  const matCarA = new THREE.MeshStandardMaterial({ color: '#22252e', metalness: 0.6, roughness: 0.4 })
  const matCarB = new THREE.MeshStandardMaterial({ color: '#3c4a5a', metalness: 0.6, roughness: 0.4 })
  const matCarC = new THREE.MeshStandardMaterial({ color: '#5a2c34', metalness: 0.6, roughness: 0.4 })

  // ground
  const ground = new THREE.Mesh(new THREE.CircleGeometry(230, 48), matGround)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  g.add(ground)

  // road along X in front of the building
  const road = new THREE.Mesh(new THREE.BoxGeometry(200, 0.1, 26), matAsphalt)
  road.position.set(0, 0.05, 30)
  road.receiveShadow = true
  g.add(road)

  // sidewalks
  const walk = new THREE.Mesh(new THREE.BoxGeometry(200, 0.22, 4.4), matSidewalk)
  walk.position.set(0, 0.11, 15.2)
  g.add(walk)
  const walkFar = new THREE.Mesh(new THREE.BoxGeometry(200, 0.22, 3), matSidewalk)
  walkFar.position.set(0, 0.11, 44.5)
  g.add(walkFar)

  // crosswalk
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.02, 24), matStripe)
    s.position.set(-8 + i * 2.4, 0.12, 30)
    g.add(s)
  }

  // street lamps (kept clear of the logo sign zone |x| < 16)
  const lampPositions = [-56, -30, -16, 16, 48, 72]
  for (const lx of lampPositions) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 6.4, 6), matNeighbB)
    pole.position.set(lx, 3.2, 14.6)
    g.add(pole)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 8), matLampGlow)
    head.position.set(lx, 6.5, 14.6)
    g.add(head)
  }

  // parked cars
  const cars = [
    { x: -46, z: 33.5, m: matCarA },
    { x: -22, z: 20.5, m: matCarB },
    { x: 34, z: 20.5, m: matCarC },
    { x: 62, z: 33.5, m: matCarA },
  ]
  for (const c of cars) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.1, 1.9), c.m)
    body.position.set(c.x, 0.65, c.z)
    body.castShadow = true
    g.add(body)
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.75, 1.7), c.m)
    top.position.set(c.x - 0.2, 1.55, c.z)
    g.add(top)
  }

  // low white boundary walls at the sides (like the renders)
  for (const side of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(1, 2.2, 30), matWall)
    w.position.set(side * 44, 1.1, 5)
    g.add(w)
  }

  // neighboring buildings (left dense low-rise, right low-rise + distant towers)
  const neighbors = [
    { x: -58, z: 2, w: 14, d: 12, h: 9, m: matNeighbA, roof: true },
    { x: -72, z: 16, w: 12, d: 14, h: 6, m: matNeighbB, roof: true },
    { x: -62, z: 34, w: 16, d: 12, h: 5, m: matNeighbA, roof: true },
    { x: -80, z: -14, w: 14, d: 14, h: 12, m: matNeighbB, roof: false },
    { x: 56, z: 0, w: 16, d: 14, h: 7, m: matNeighbA, roof: true },
    { x: 70, z: 18, w: 14, d: 12, h: 5, m: matNeighbB, roof: true },
    { x: 60, z: 36, w: 18, d: 12, h: 4.5, m: matNeighbA, roof: true },
    { x: 84, z: -10, w: 16, d: 16, h: 15, m: matNeighbB, roof: false },
    { x: -46, z: -18, w: 10, d: 10, h: 4, m: matNeighbA, roof: true },
    { x: 48, z: -20, w: 12, d: 10, h: 6, m: matNeighbB, roof: true },
  ]
  const litWindows = []
  for (const n of neighbors) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(n.w, n.h, n.d), n.m)
    box.position.set(n.x, n.h / 2, n.z)
    box.castShadow = box.receiveShadow = true
    g.add(box)
    if (n.roof) {
      const roof = new THREE.Mesh(new THREE.BoxGeometry(n.w + 0.8, 0.5, n.d + 0.8), matRoofTile)
      roof.position.set(n.x, n.h + 0.25, n.z)
      g.add(roof)
    }
    // a few lit windows
    const wc = Math.floor(rand() * 5)
    for (let i = 0; i < wc; i++) {
      litWindows.push({
        x: n.x + (rand() - 0.5) * (n.w - 2),
        y: 1.5 + rand() * (n.h - 2),
        z: n.z + n.d / 2 + 0.05,
      })
    }
  }
  const winMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.9, 1.2), matWindowLit, litWindows.length)
  {
    const m = new THREE.Matrix4()
    litWindows.forEach((w, i) => {
      m.makeTranslation(w.x, w.y, w.z)
      winMesh.setMatrixAt(i, m)
    })
    winMesh.instanceMatrix.needsUpdate = true
  }
  g.add(winMesh)

  // distant skyline silhouettes
  for (let i = 0; i < 14; i++) {
    const h = 14 + rand() * 26
    const bx = (rand() - 0.5) * 320
    const bz = -60 - rand() * 80
    const t = new THREE.Mesh(new THREE.BoxGeometry(8 + rand() * 10, h, 8 + rand() * 8), matNeighbB)
    t.position.set(bx, h / 2, bz)
    g.add(t)
  }

  // trees along the street + around the building
  const makeTree = (x, z, s) => {
    const t = new THREE.Group()
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 2.4, 6), matTrunk)
    trunk.position.y = 1.2
    t.add(trunk)
    const layers = [
      { r: 1.7, y: 3.2, m: matTree },
      { r: 1.25, y: 4.3, m: matTree2 },
      { r: 0.8, y: 5.2, m: matTree },
    ]
    for (const l of layers) {
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(l.r, 1), l.m)
      blob.position.y = l.y
      blob.castShadow = true
      t.add(blob)
    }
    t.position.set(x, 0, z)
    t.scale.setScalar(s)
    g.add(t)
  }
  const streetTrees = [-62, -50, -38, 18, 30, 42, 54, 66]
  for (const x of streetTrees) makeTree(x, 13.6, 0.9 + rand() * 0.4)
  makeTree(-40, 26, 1.1)
  makeTree(40, 26, 1.05)
  makeTree(-52, 40, 0.9)
  makeTree(58, 42, 0.9)

  scene.add(g)

  // expose materials that must adapt to day/night
  return {
    group: g,
    mats: {
      ground: matGround,
      asphalt: matAsphalt,
      sidewalk: matSidewalk,
      windowLit: matWindowLit,
      lampGlow: matLampGlow,
    },
  }
}
