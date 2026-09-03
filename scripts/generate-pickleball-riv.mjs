/**
 * One-shot generator: builds public/pickleball.riv for the invite bounce.
 * Run: node scripts/generate-pickleball-riv.mjs
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RiveFile, hex, PropertyKey } from '@stevysmith/rive-generator'

const __dirname = dirname(fileURLToPath(import.meta.url))
const out = join(__dirname, '..', 'public', 'pickleball.riv')

const riv = new RiveFile()
const artboard = riv.addArtboard({
  name: 'Pickleball',
  width: 120,
  height: 120,
})

// Transform root — all motion keys target this node
const ball = riv.addNode(artboard, {
  name: 'ball',
  x: 60,
  y: 60,
})

// Soft contact shadow (stays under ball)
const shadow = riv.addShape(ball, { name: 'shadow', x: 0, y: 38 })
riv.addEllipse(shadow, { width: 52, height: 12 })
const shadowFill = riv.addFill(shadow)
riv.addSolidColor(shadowFill, hex('#00000055'))

// Main sphere — Hive lime yellow
const body = riv.addShape(ball, { name: 'body', x: 0, y: 0 })
riv.addEllipse(body, { width: 72, height: 72 })
const bodyFill = riv.addFill(body)
riv.addSolidColor(bodyFill, hex('#D0FF00'))

// Specular hint
const spec = riv.addShape(ball, { name: 'spec', x: -14, y: -16 })
riv.addEllipse(spec, { width: 18, height: 12 })
const specFill = riv.addFill(spec)
riv.addSolidColor(specFill, hex('#FFFFFF66'))

// Pickleball holes (olive)
const holeColor = hex('#8F9D0F')
const holes = [
  { x: -18, y: -10, w: 11, h: 9 },
  { x: 8, y: -18, w: 12, h: 10 },
  { x: 16, y: 4, w: 10, h: 11 },
  { x: -6, y: 14, w: 12, h: 10 },
  { x: -20, y: 6, w: 9, h: 10 },
  { x: 4, y: -2, w: 8, h: 8 },
]
for (const [i, h] of holes.entries()) {
  const shape = riv.addShape(ball, { name: `hole${i}`, x: h.x, y: h.y })
  riv.addEllipse(shape, { width: h.w, height: h.h })
  const fill = riv.addFill(shape)
  riv.addSolidColor(fill, holeColor)
}

function keyY(anim, frames) {
  const keyed = riv.addKeyedObject(anim, ball)
  const prop = riv.addKeyedProperty(keyed, PropertyKey.y)
  for (const [frame, value] of frames) {
    riv.addKeyFrameDouble(prop, { frame, value, interpolation: 'cubic' })
  }
  return keyed
}

function keyProp(keyed, propertyKey, frames) {
  const prop = riv.addKeyedProperty(keyed, propertyKey)
  for (const [frame, value] of frames) {
    riv.addKeyFrameDouble(prop, { frame, value, interpolation: 'cubic' })
  }
}

// —— intro: fall → squash → rebound → settle (~0.9s @ 60fps)
const intro = riv.addLinearAnimation(artboard, {
  name: 'intro',
  fps: 60,
  duration: 54,
  loop: 'oneShot',
})
const introKeyed = keyY(intro, [
  [0, 18],
  [22, 60],
  [26, 62],
  [38, 38],
  [54, 54],
])
keyProp(introKeyed, PropertyKey.scaleX, [
  [0, 1],
  [22, 1.14],
  [26, 1.14],
  [38, 0.94],
  [54, 1],
])
keyProp(introKeyed, PropertyKey.scaleY, [
  [0, 1],
  [22, 0.8],
  [26, 0.8],
  [38, 1.08],
  [54, 1],
])
keyProp(introKeyed, PropertyKey.rotation, [
  [0, 0],
  [54, Math.PI * 2],
])

// —— idle: gentle bob loop
const idle = riv.addLinearAnimation(artboard, {
  name: 'idle',
  fps: 60,
  duration: 66,
  loop: 'loop',
})
const idleKeyed = keyY(idle, [
  [0, 54],
  [33, 48],
  [66, 54],
])
keyProp(idleKeyed, PropertyKey.rotation, [
  [0, 0],
  [66, Math.PI * 0.35],
])

const bytes = riv.export()
writeFileSync(out, bytes)
console.log(`Wrote ${out} (${bytes.byteLength} bytes)`)
