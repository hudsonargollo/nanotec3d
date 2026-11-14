import * as THREE from 'three'

/**
 * Scroll-driven camera keyframes.
 * t in [0..1] from page scroll; smoothstep between poses.
 */
const KEYFRAMES = [
  { t: 0.0, pos: [-58, 26, 95], target: [0, 16, 0] }, // wide 3/4 corner reveal (img1210 mood)
  { t: 0.18, pos: [-32, 13, 72], target: [-6, 15, 0] }, // approaching along the street
  { t: 0.38, pos: [-22, 31, 60], target: [0, 25, 0] }, // gliding up the facade
  { t: 0.55, pos: [9, 6, 36], target: [0, 5, 10] }, // podium / retail level
  { t: 0.72, pos: [21, 39, 32], target: [-10, 34, 0] }, // rooftop garden
  { t: 0.88, pos: [42, 26, 62], target: [0, 14, 0] }, // pull back to the right
  { t: 1.0, pos: [-8, 10, 112], target: [0, 18, 0] }, // final frontal wide
]

const smooth = (x) => x * x * (3 - 2 * x)

const vPos = new THREE.Vector3()
const vTarget = new THREE.Vector3()
const vA = new THREE.Vector3()
const vB = new THREE.Vector3()

export function cameraPose(t, outPos, outTarget) {
  const clamped = Math.min(Math.max(t, 0), 1)
  let i = 0
  while (i < KEYFRAMES.length - 2 && clamped > KEYFRAMES[i + 1].t) i++
  const k0 = KEYFRAMES[i]
  const k1 = KEYFRAMES[i + 1]
  const local = smooth(Math.min(Math.max((clamped - k0.t) / (k1.t - k0.t), 0), 1))
  vA.set(...k0.pos)
  vB.set(...k1.pos)
  vPos.lerpVectors(vA, vB, local)
  vA.set(...k0.target)
  vB.set(...k1.target)
  vTarget.lerpVectors(vA, vB, local)
  outPos.copy(vPos)
  outTarget.copy(vTarget)
}
