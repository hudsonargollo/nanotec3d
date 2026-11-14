import * as THREE from 'three'
import { createSky } from './sky.js'
import { createBuilding } from './building.js'
import { createContext } from './context.js'
import { cameraPose } from './cameraPath.js'
import { createPost } from './post.js'
import { sunPosition, moonPosition, directionOf } from './sun.js'

const RAD = Math.PI / 180
const clamp01 = (x) => Math.min(Math.max(x, 0), 1)
const smooth = (x) => x * x * (3 - 2 * x)

// ---- Day / golden / night palettes ----
const P = {
  skyTop: { night: '#030310', golden: '#2b3f74', day: '#4a90d9' },
  skyMid: { night: '#120d2e', golden: '#8a5a86', day: '#8fc3ea' },
  skyBottom: { night: '#341c55', golden: '#ff9550', day: '#dfeef8' },
  fog: { night: '#1a1030', golden: '#b98a6e', day: '#cfe0ec' },
  ambient: { night: '#26263a', golden: '#4a3a55', day: '#9db6c8' },
  sun: { golden: '#ff9c50', day: '#fff2d6' },
}
const lerpHex = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t)

export class Experience {
  constructor() {
    this.sizes = { width: window.innerWidth, height: window.innerHeight }
    this.canvas = document.createElement('canvas')
    this.canvas.id = 'webgl'
    document.body.prepend(this.canvas)

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setSize(this.sizes.width, this.sizes.height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(45, this.sizes.width / this.sizes.height, 0.5, 800)
    this.camera.position.set(-58, 26, 95)
    this.scene.add(this.camera)

    // world
    this.sky = createSky(this.scene)
    const building = createBuilding(this.scene)
    this.buildingMats = building.mats
    this.contextMats = createContext(this.scene).mats
    this.setupLights()

    // post
    const { composer, bloom, resize: resizePost } = createPost(this.renderer, this.scene, this.camera, this.sizes)
    this.composer = composer
    this.bloom = bloom

    // env map generator (reflections on the glass)
    this.pmrem = new THREE.PMREMGenerator(this.renderer)
    this.envCanvas = document.createElement('canvas')
    this.envCanvas.width = 8
    this.envCanvas.height = 128
    this.lastEnvKey = ''

    // scroll camera journey
    this.scrollT = 0
    this.scrollSmooth = 0
    window.addEventListener('scroll', () => this.updateScroll(), { passive: true })
    this.updateScroll()

    window.addEventListener('resize', () => {
      this.sizes.width = window.innerWidth
      this.sizes.height = window.innerHeight
      this.camera.aspect = this.sizes.width / this.sizes.height
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(this.sizes.width, this.sizes.height)
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      resizePost(this.sizes.width, this.sizes.height)
    })

    this.hideLoader()
    this.clock = new THREE.Clock()
    this.envTimer = 0
    this.renderer.setAnimationLoop(this.tick.bind(this))
  }

  setupLights() {
    this.ambient = new THREE.AmbientLight(P.ambient.night, 1.5)
    this.scene.add(this.ambient)

    this.sunLight = new THREE.DirectionalLight('#fff2d6', 0)
    this.sunLight.position.set(50, 80, 60)
    this.sunLight.castShadow = true
    this.sunLight.shadow.mapSize.set(2048, 2048)
    const cam = this.sunLight.shadow.camera
    cam.left = -90
    cam.right = 90
    cam.top = 90
    cam.bottom = -30
    cam.far = 350
    this.sunLight.shadow.bias = -0.0004
    this.scene.add(this.sunLight)

    this.moonLight = new THREE.DirectionalLight('#93a7ff', 0.7)
    this.moonLight.position.set(-60, 70, -50)
    this.moonLight.castShadow = true
    this.moonLight.shadow.mapSize.set(2048, 2048)
    const mc = this.moonLight.shadow.camera
    mc.left = -80
    mc.right = 80
    mc.top = 80
    mc.bottom = -20
    mc.far = 250
    mc.bias = -0.0004
    this.scene.add(this.moonLight)

    this.fill = new THREE.DirectionalLight('#4a3f66', 0.35)
    this.fill.position.set(30, 20, 80)
    this.scene.add(this.fill)

    this.shopGlow = new THREE.PointLight('#ff9d6b', 35, 60, 2)
    this.shopGlow.position.set(0, 7, 20)
    this.scene.add(this.shopGlow)

    this.roofGlow = new THREE.PointLight('#9fe8c0', 40, 50, 2)
    this.roofGlow.position.set(-6, 40, 2)
    this.scene.add(this.roofGlow)
  }

  updateScroll() {
    const max = document.body.scrollHeight - window.innerHeight
    this.scrollT = max > 0 ? window.scrollY / max : 0
  }

  hideLoader() {
    const bar = document.querySelector('.loading-bar')
    if (bar) setTimeout(() => (bar.style.opacity = '0'), 300)
  }

  /**
   * Real-time lighting: everything derives from the true sun altitude
   * in Santa Cruz de la Sierra.
   */
  updateDaylight(dt) {
    const now = new Date()
    const sun = sunPosition(now)
    const moon = moonPosition(now)
    const sunAltDeg = sun.alt / RAD

    // weights
    const dayW = smooth(clamp01((sunAltDeg + 6) / 16)) // full day above ~10°
    const goldenW = clamp01(1 - Math.abs(sunAltDeg) / 12) * (1 - dayW * 0.6)
    const nightW = clamp01(1 - (sunAltDeg + 6) / 10)

    // sky colors: night → golden → day
    const mix3 = (p) =>
      lerpHex(lerpHex(p.night, p.golden, clamp01(goldenW)), p.day, dayW)
    this.sky.skyMat.uniforms.topColor.value.copy(mix3(P.skyTop))
    this.sky.skyMat.uniforms.midColor.value.copy(mix3(P.skyMid))
    this.sky.skyMat.uniforms.bottomColor.value.copy(mix3(P.skyBottom))

    // fog
    const fogColor = mix3(P.fog)
    if (!this.scene.fog) this.scene.fog = new THREE.Fog(fogColor, 90, 420)
    this.scene.fog.color.copy(fogColor)
    this.scene.fog.near = THREE.MathUtils.lerp(90, 170, dayW)
    this.scene.fog.far = THREE.MathUtils.lerp(420, 650, dayW)

    // sun light
    const sunDir = directionOf(sun)
    this.sunLight.position.set(sunDir.x, Math.max(sunDir.y, 0.02), sunDir.z).multiplyScalar(120)
    const sunUp = clamp01((sunAltDeg + 2) / 8)
    this.sunLight.intensity = sunUp * THREE.MathUtils.lerp(2.0, 3.0, clamp01((sunAltDeg - 10) / 30))
    this.sunLight.color.copy(lerpHex(P.sun.golden, P.sun.day, clamp01((sunAltDeg - 6) / 20)))
    this.sunLight.castShadow = this.sunLight.intensity > 0.3

    // sun sprite
    this.sky.sun.position.set(sunDir.x, sunDir.y, sunDir.z).multiplyScalar(380)
    this.sky.sunMat.opacity = clamp01((sunAltDeg + 3) / 6) * 0.95

    // moon light + sprite (appears when the sun goes down).
    // If the real moon is below the horizon, a synthesized moon rises
    // opposite the sun so the night is never moonless.
    let moonDir
    let moonAltRad = moon.alt
    if (nightW > 0.35) {
      // Stage the moon into the sky window the front cameras actually see:
      // south-southeast, alt 16-22 deg / az 134-148 deg clears the roofline
      // and stays inside the frustum of the wide + final cameras (solved).
      // Real values are kept whenever they already fall in that window.
      moonAltRad = Math.min(Math.max(moon.alt / RAD, 16), 22) * RAD
      let az = ((moon.az % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
      az = Math.min(Math.max(az, 134 * RAD), 148 * RAD)
      moonDir = directionOf({ alt: moonAltRad, az })
    } else {
      moonDir = directionOf(moon)
    }
    this.moonLight.position.set(moonDir.x, moonDir.y, moonDir.z).multiplyScalar(120)
    this.moonLight.intensity = nightW * (moonAltRad > 0 ? 0.75 : 0.15)
    this.moonLight.castShadow = this.moonLight.intensity > 0.3
    this.sky.moon.position.set(moonDir.x, moonDir.y, moonDir.z).multiplyScalar(380)
    this.sky.moonMat.opacity = nightW * clamp01((moonAltRad / RAD) / 10)

    // stars
    this.sky.starMat.opacity = nightW * 0.9

    // ambient / fill
    this.ambient.color.copy(mix3(P.ambient))
    this.ambient.intensity = THREE.MathUtils.lerp(1.5, 2.6, dayW)
    this.fill.intensity = THREE.MathUtils.lerp(0.35, 0.55, dayW)
    this.fill.color.copy(lerpHex('#4a3f66', '#8fb0d0', dayW))

    // artificial lights fade out by day
    const artW = 1 - dayW
    this.shopGlow.intensity = 6 + artW * 29
    this.roofGlow.intensity = 8 + artW * 32
    this.matsDim(artW)

    // urban materials adapt: dark asphalt at night, sunlit gray by day
    const cm = this.contextMats
    cm.ground.color.copy(lerpHex('#141318', '#43484d', dayW))
    cm.asphalt.color.copy(lerpHex('#0d0d12', '#3a3e44', dayW))
    cm.sidewalk.color.copy(lerpHex('#26262c', '#8a8d92', dayW))
    cm.windowLit.color.copy(lerpHex('#ffd9a0', '#2a2a2a', dayW))
    cm.lampGlow.color.copy(lerpHex('#ffd9a0', '#6b7076', dayW))

    // tone mapping / bloom
    this.renderer.toneMappingExposure = THREE.MathUtils.lerp(1.05, 1.0, dayW)
    this.bloom.threshold = THREE.MathUtils.lerp(0.85, 0.45, nightW)
    this.bloom.strength = THREE.MathUtils.lerp(0.12, 0.55, nightW)

    // env map for glass reflections (regenerated while the sky shifts)
    this.envTimer += dt
    const key = [
      this.sky.skyMat.uniforms.topColor.value.getHexString(),
      this.sky.skyMat.uniforms.bottomColor.value.getHexString(),
    ].join('-')
    if (this.envTimer > 2 && key !== this.lastEnvKey) {
      this.envTimer = 0
      this.lastEnvKey = key
      this.updateEnvMap()
    }
  }

  matsDim(artW) {
    // artificial emissives: full glow at night, muted in daylight
    const m = this.buildingMats
    m.litGlass.color.copy(lerpHex('#2a3440', '#ffffff', artW))
    m.ledCrown.color.copy(lerpHex('#3a4550', '#ffffff', artW))
    m.storefront.color.copy(lerpHex('#6d747d', '#ffffff', artW))
    m.ledStrips.forEach((mat) => mat.color.copy(lerpHex('#1c3f4a', '#39d6ff', artW)))
  }

  updateEnvMap() {
    const ctx = this.envCanvas.getContext('2d')
    const top = '#' + this.sky.skyMat.uniforms.topColor.value.getHexString()
    const bottom = '#' + this.sky.skyMat.uniforms.bottomColor.value.getHexString()
    const grad = ctx.createLinearGradient(0, 0, 0, 128)
    grad.addColorStop(0, top)
    grad.addColorStop(1, bottom)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 8, 128)
    const tex = new THREE.CanvasTexture(this.envCanvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.mapping = THREE.EquirectangularReflectionMapping
    const envRT = this.pmrem.fromEquirectangular(tex)
    if (this.envRT) this.envRT.dispose()
    this.envRT = envRT
    this.scene.environment = envRT.texture
    tex.dispose()
  }

  easeInOut(x) {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
  }

  tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05)

    this.scrollSmooth += (this.scrollT - this.scrollSmooth) * Math.min(1, dt * 4.5)
    if (Math.abs(this.scrollT - this.scrollSmooth) < 0.0004) this.scrollSmooth = this.scrollT

    this.updateDaylight(dt)

    const pos = new THREE.Vector3()
    const target = new THREE.Vector3()
    cameraPose(this.scrollSmooth, pos, target)
    this.camera.position.copy(pos)
    this.camera.lookAt(target)

    this.composer.render()
  }
}
