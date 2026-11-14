import * as THREE from 'three'

/**
 * Dynamic sky: gradient dome whose colors shift with the real sun altitude,
 * stars + moon fading in at night, a glowing sun sprite by day.
 */
export function createSky(scene) {
  const group = new THREE.Group()

  // ---- Gradient dome (uniforms updated in real time) ----
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color('#4a90d9') },
      midColor: { value: new THREE.Color('#8fc3ea') },
      bottomColor: { value: new THREE.Color('#dfeef8') },
      offset: { value: 30.0 },
      exponent: { value: 0.9 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
        vec3 color = mix(bottomColor, midColor, smoothstep(-0.15, 0.25, h));
        color = mix(color, topColor, smoothstep(0.25, 0.8, h));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  })
  group.add(new THREE.Mesh(new THREE.SphereGeometry(420, 32, 24), skyMat))

  // ---- Stars (fade in at night) ----
  const starCount = 1400
  const positions = new Float32Array(starCount * 3)
  const colors = new Float32Array(starCount * 3)
  const rnd = () => Math.random()
  for (let i = 0; i < starCount; i++) {
    const theta = rnd() * Math.PI * 2
    const phi = Math.acos(rnd() * 0.85)
    const r = 380
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 20
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    const c = 0.55 + rnd() * 0.45
    colors[i * 3] = c
    colors[i * 3 + 1] = c
    colors[i * 3 + 2] = c * (0.9 + rnd() * 0.1)
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const starMat = new THREE.PointsMaterial({
    size: 1.1,
    vertexColors: true,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    fog: false, // stars live beyond the fog range — exempt them
  })
  const stars = new THREE.Points(starGeo, starMat)
  group.add(stars)

  // ---- Moon sprite ----
  const moonCanvas = document.createElement('canvas')
  moonCanvas.width = moonCanvas.height = 256
  const ctx = moonCanvas.getContext('2d')
  const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 128)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.28, 'rgba(230,235,255,0.9)')
  grad.addColorStop(0.45, 'rgba(160,170,220,0.35)')
  grad.addColorStop(1, 'rgba(120,130,200,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 256, 256)
  ctx.globalAlpha = 0.25
  ctx.fillStyle = '#9aa4c8'
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2
    const d = rnd() * 42
    ctx.beginPath()
    ctx.arc(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 3 + rnd() * 7, 0, Math.PI * 2)
    ctx.fill()
  }
  const moonTex = new THREE.CanvasTexture(moonCanvas)
  moonTex.colorSpace = THREE.SRGBColorSpace
  const moonMat = new THREE.SpriteMaterial({ map: moonTex, transparent: true, depthWrite: false, opacity: 0, fog: false })
  const moon = new THREE.Sprite(moonMat)
  moon.scale.setScalar(34)
  group.add(moon)

  // ---- Sun sprite ----
  const sunCanvas = document.createElement('canvas')
  sunCanvas.width = sunCanvas.height = 256
  const sctx = sunCanvas.getContext('2d')
  const sgrad = sctx.createRadialGradient(128, 128, 8, 128, 128, 128)
  sgrad.addColorStop(0, 'rgba(255,252,240,1)')
  sgrad.addColorStop(0.18, 'rgba(255,240,200,0.95)')
  sgrad.addColorStop(0.4, 'rgba(255,200,120,0.5)')
  sgrad.addColorStop(1, 'rgba(255,170,80,0)')
  sctx.fillStyle = sgrad
  sctx.fillRect(0, 0, 256, 256)
  const sunTex = new THREE.CanvasTexture(sunCanvas)
  sunTex.colorSpace = THREE.SRGBColorSpace
  const sunMat = new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false, opacity: 1, fog: false })
  const sun = new THREE.Sprite(sunMat)
  sun.scale.setScalar(110)
  group.add(sun)

  scene.add(group)

  return { group, skyMat, stars, starMat, moon, moonMat, sun, sunMat }
}
