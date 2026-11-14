/**
 * Real-time solar/lunar position (Suncalc formulas).
 * Santa Cruz de la Sierra, Bolivia — lat -17.78, lon -63.18.
 * Returns altitude/azimuth in radians (azimuth measured from north, clockwise).
 */
const RAD = Math.PI / 180
const DAY_MS = 86400000
const J1970 = 2440588
const J2000 = 2451545
const OBLIQUITY = RAD * 23.4397

const LAT = -17.78
const LON = -63.18

const toDays = (date) => date.valueOf() / DAY_MS - 0.5 + J1970 - J2000
const siderealTime = (d, lw) => RAD * (280.16 + 360.9856235 * d) - lw

function solarMeanAnomaly(d) {
  return RAD * (357.5291 + 0.98560028 * d)
}
function eclipticLongitude(M) {
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M))
  const P = RAD * 102.9372
  return M + C + P + Math.PI
}
function sunCoords(d) {
  const M = solarMeanAnomaly(d)
  const L = eclipticLongitude(M)
  return {
    dec: Math.asin(Math.sin(OBLIQUITY) * Math.sin(L)),
    ra: Math.atan2(Math.cos(OBLIQUITY) * Math.sin(L), Math.cos(L)),
  }
}
function moonCoords(d) {
  const L = RAD * (218.316 + 13.176396 * d)
  const M = RAD * (134.963 + 13.064993 * d)
  const F = RAD * (93.272 + 13.22935 * d)
  const l = L + RAD * 6.289 * Math.sin(M)
  const b = RAD * 5.128 * Math.sin(F)
  return {
    ra: Math.atan2(Math.sin(l) * Math.cos(OBLIQUITY) - Math.tan(b) * Math.sin(OBLIQUITY), Math.cos(l)),
    dec: Math.asin(Math.sin(b) * Math.cos(OBLIQUITY) + Math.cos(b) * Math.sin(OBLIQUITY) * Math.sin(l)),
  }
}

function horizontal(coords, d) {
  const lw = RAD * -LON
  const phi = RAD * LAT
  const H = siderealTime(d, lw) - coords.ra
  const alt = Math.asin(
    Math.sin(phi) * Math.sin(coords.dec) + Math.cos(phi) * Math.cos(coords.dec) * Math.cos(H)
  )
  // azimuth from south, westward (suncalc) → convert to from-north, clockwise
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(coords.dec) * Math.cos(phi)) + Math.PI
  return { alt, az }
}

export function sunPosition(date = new Date()) {
  return horizontal(sunCoords(toDays(date)), toDays(date))
}

export function moonPosition(date = new Date()) {
  const d = toDays(date)
  return horizontal(moonCoords(d), d)
}

/**
 * Scene-space direction for a celestial body.
 * Scene mapping: north = +Z, east = +X (so the midday northern sun lights the facade).
 */
export function directionOf(pos) {
  const cosAlt = Math.cos(pos.alt)
  return {
    x: Math.sin(pos.az) * cosAlt,
    y: Math.sin(pos.alt),
    z: Math.cos(pos.az) * cosAlt,
  }
}
