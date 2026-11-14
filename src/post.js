import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

export function createPost(renderer, scene, camera, sizes) {
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(sizes.width, sizes.height),
    0.55, // strength
    0.6, // radius
    0.45 // threshold — LEDs, storefronts and lit windows glow
  )
  composer.addPass(bloom)

  const resize = (w, h) => {
    composer.setSize(w, h)
    bloom.setSize(w, h)
  }

  return { composer, bloom, resize }
}
