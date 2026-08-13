<script setup lang="ts">
import * as THREE from 'three'
import { cardVertexShader, cardFragmentShader } from '~/shaders/cardShader'
import type { SceneContext } from '~/components/WebGLScene.vue'

const CARD_SIZE = 0.85
const CARD_SEGMENTS = 16
const SPACING = 0.95
const ROW_Y = 0.95
const ROW_Z = 0
const CORNER_RADIUS_PX = 12
const TOP_AMP = 0.676
const TOP_PEAK = 0.33
const TOP_WIDTH = 0.39
const FADE_EDGE_IN = 0.9
const FADE_EDGE_OUT = 1.0

const INTRO_FUGA = new THREE.Vector3(9.6, 0.35, -10.5)
const INTRO_DURATION = 1.8
const INTRO_MAX_DELAY = 0.35
const INTRO_BACK = 1.2
const INTRO_ROT = 0.16

const fadeEdges = new THREE.Vector4()

const BASE_DRIFT = 0.15
const WHEEL_SENSITIVITY = 0.012
const WHEEL_FACTOR = 0.8
const WHEEL_DECAY_RATE = 1.2
const TOUCH_SENSITIVITY = 0.016
const SMOOTH_RATE = 6
const FLIP_THRESHOLD = 0.4

const FADE_DURATION = 0.6
const FADE_OUT_DURATION = 0.6
const FINAL_OPACITY = 0.95

const PROJECTS = [
  '/images/projects/project-0.webp',
  '/images/projects/project-1.webp',
  '/images/projects/project-2.webp',
  '/images/projects/project-3.webp',
]

const CARDS_PER_ROW = 16
const ROW_COUNT = 2
const CARD_COUNT = CARDS_PER_ROW * ROW_COUNT
const ROW_WIDTH = CARDS_PER_ROW * SPACING
const ROW_DIRS = [-1, -1]

interface Props {
  ctx: SceneContext
  fading?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'fade-complete': [] }>()

const meshes: THREE.Mesh[] = []
const materials: THREE.ShaderMaterial[] = []
const baseX: number[] = []
const rowIndexes: number[] = []
const introDelays: number[] = []
const introRots: number[] = []

let sharedGeometry: THREE.PlaneGeometry | null = null
let introPlayed = false

let renderCallback: ((deltaTime: number, elapsedTime: number) => void) | null = null

let disposed = false

let wheelVel = 0
let smoothVel = 0
let driftDir = 1
let lastTouchY: number | null = null
const rowOffsets = [0, 0]

const onWheel = (e: WheelEvent) => {
  const delta = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? e.deltaY * 16 : e.deltaY
  wheelVel += delta * WHEEL_SENSITIVITY
}

const onTouchStart = (e: TouchEvent) => {
  const t = e.touches[0]
  if (t) lastTouchY = t.clientY
}

const onTouchMove = (e: TouchEvent) => {
  const t = e.touches[0]
  if (!t || lastTouchY === null) return
  const dy = lastTouchY - t.clientY
  lastTouchY = t.clientY
  wheelVel += dy * TOUCH_SENSITIVITY
}

const onTouchEnd = () => {
  lastTouchY = null
}

const applyCornerRadius = (viewportWidth: number, viewportHeight: number) => {
  const cam = props.ctx.camera
  const dist = cam.position.z - ROW_Z
  const projectedSize = (CARD_SIZE / dist) * (viewportHeight / (2 * Math.tan((cam.fov * Math.PI) / 360)))
  const radius = Math.min(CORNER_RADIUS_PX / projectedSize, 0.5)
  const halfW = cam.position.z * Math.tan((cam.fov * Math.PI) / 360) * (viewportWidth / viewportHeight)
  fadeEdges.set(-halfW * FADE_EDGE_OUT, -halfW * FADE_EDGE_IN, halfW * FADE_EDGE_IN, halfW * FADE_EDGE_OUT)
  for (const material of materials) {
    material.uniforms.uRadius!.value = radius
    material.uniforms.uFadeEdges!.value.copy(fadeEdges)
  }
}

const onResize = (width: number, height: number) => {
  applyCornerRadius(width, height)
}

const loadTexture = async (url: string) => {
  const loader = new THREE.TextureLoader()
  try {
    const tex = await loader.loadAsync(url)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearMipMapLinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.generateMipmaps = true
    tex.anisotropy = 4
    tex.needsUpdate = true
    const img = (tex as THREE.Texture & { image?: HTMLImageElement }).image
    const aspect = img && img.width && img.height ? img.width / img.height : 1.0
    return { tex, aspect }
  } catch {
    return null
  }
}

const buildRows = async () => {
  const geometry = new THREE.PlaneGeometry(CARD_SIZE, CARD_SIZE, CARD_SEGMENTS, CARD_SEGMENTS)
  sharedGeometry = geometry
  const introEnabled = !introPlayed
  introPlayed = true
  const texInfos = await Promise.all(PROJECTS.map(loadTexture))
  if (disposed) {
    for (const info of texInfos) info?.tex.dispose()
    return
  }

  for (let pi = 0; pi < PROJECTS.length; pi++) {
    const material = new THREE.ShaderMaterial({
      vertexShader: cardVertexShader,
      fragmentShader: cardFragmentShader,
      uniforms: {
        uResolution: { value: new THREE.Vector2(CARD_SIZE, CARD_SIZE) },
        uColor: { value: new THREE.Color(0x1a1a2e) },
        uRadius: { value: 0 },
        uOpacity: { value: 0 },
        uTexture: { value: new THREE.Texture() },
        uTextureAspect: { value: 1.0 },
        uHasTexture: { value: 0.0 },
        uFadeEdges: { value: fadeEdges.clone() },
      },
      transparent: true,
    })
    const info = texInfos[pi]
    if (info) {
      material.uniforms.uTexture!.value = info.tex
      material.uniforms.uTextureAspect!.value = info.aspect
      material.uniforms.uHasTexture!.value = 1.0
    }
    material.needsUpdate = true
    materials.push(material)
  }

  applyCornerRadius(window.innerWidth, window.innerHeight)
  props.ctx.registerResizeCallback(onResize)

  for (let i = 0; i < CARD_COUNT; i++) {
    const row = Math.floor(i / CARDS_PER_ROW)
    const col = i % CARDS_PER_ROW
    const mesh = new THREE.Mesh(geometry, materials[i % materials.length])
    mesh.position.set(0, row === 0 ? ROW_Y : -ROW_Y, ROW_Z)
    mesh.visible = false
    props.ctx.scene.add(mesh)
    meshes.push(mesh)
    const bx = col * SPACING - ROW_WIDTH / 2
    baseX.push(bx)
    introDelays.push(Math.min(Math.max((ROW_WIDTH / 2 - bx) / ROW_WIDTH, 0), 1) * INTRO_MAX_DELAY)
    introRots.push((((i * 37) % 11) / 11 - 0.5) * INTRO_ROT)
    rowIndexes.push(row)
  }

  let fadeStart: number | null = null
  let fadeOutStart: number | null = null
  let fadeCompleteSent = false
  let introElapsed = 0
  let introEnded = false

  renderCallback = (deltaTime: number, elapsedTime: number) => {
    if (introEnabled) introElapsed += deltaTime
    const introActive = introEnabled && introElapsed < INTRO_DURATION + INTRO_MAX_DELAY
    if (!introActive && !introEnded) {
      introEnded = true
      wheelVel = 0
      smoothVel = 0
    }
    wheelVel *= Math.exp(-WHEEL_DECAY_RATE * deltaTime)
    smoothVel += (wheelVel - smoothVel) * (1 - Math.exp(-SMOOTH_RATE * deltaTime))

    if (Math.abs(smoothVel) > FLIP_THRESHOLD && Math.sign(smoothVel) !== driftDir) {
      driftDir = Math.sign(smoothVel)
    }
    const factor = 1 + Math.max(0, smoothVel * WHEEL_FACTOR * driftDir)

    for (let r = 0; r < ROW_COUNT; r++) {
      if (introActive) continue
      rowOffsets[r]! += BASE_DRIFT * ROW_DIRS[r]! * driftDir * factor * deltaTime
      if (rowOffsets[r]! > ROW_WIDTH) rowOffsets[r]! -= ROW_WIDTH
      if (rowOffsets[r]! < -ROW_WIDTH) rowOffsets[r]! += ROW_WIDTH
    }

    const c1 = INTRO_BACK + 1
    const c3 = c1 + 1

    for (let i = 0; i < CARD_COUNT; i++) {
      const m = meshes[i]!
      const r = rowIndexes[i]!
      const trackX = (((baseX[i]! + rowOffsets[r]!) % ROW_WIDTH) + ROW_WIDTH) % ROW_WIDTH
      const xPos = trackX - ROW_WIDTH / 2

      const halfWidth = ROW_WIDTH / 2
      const t = Math.min(Math.max((xPos + halfWidth) / ROW_WIDTH, 0.0), 1.0)

      const isTop = r === 0
      const sign = isTop ? 1.0 : -1.0

      m.position.x = xPos

      const tu = (t - TOP_PEAK) / TOP_WIDTH

      const inBump = tu > -1.0 && tu < 1.0

      const spread = inBump ? TOP_AMP * 0.5 * (1.0 + Math.cos(Math.PI * tu)) : 0
      m.position.y = sign * (0.7 + spread)

      m.position.z = 0

      m.rotation.x = 0
      m.rotation.y = 0
      const slope = inBump
        ? -((TOP_AMP * Math.PI) / (2 * TOP_WIDTH * ROW_WIDTH)) * Math.sin(Math.PI * tu)
        : 0
      m.rotation.z = isTop ? slope : -slope

      if (introActive) {
        const introT = Math.min(Math.max((introElapsed - introDelays[i]!) / INTRO_DURATION, 0), 1)
        if (introT < 1) {
          const e = 1 - Math.pow(1 - introT, 5)
          const ey = 1 + c3 * Math.pow(introT - 1, 3) + c1 * Math.pow(introT - 1, 2)
          m.position.x = INTRO_FUGA.x + (m.position.x - INTRO_FUGA.x) * e
          m.position.y = INTRO_FUGA.y + (m.position.y - INTRO_FUGA.y) * ey
          m.position.z = INTRO_FUGA.z + (m.position.z - INTRO_FUGA.z) * e
          m.rotation.z += introRots[i]! * (1 - e)
        }
      }
    }

    let opacity: number
    if (props.fading) {
      if (fadeOutStart === null) fadeOutStart = elapsedTime
      const ft = Math.min((elapsedTime - fadeOutStart) / FADE_OUT_DURATION, 1)
      opacity = FINAL_OPACITY * (1 - (ft * ft * (3 - 2 * ft)))
      if (ft >= 1 && !fadeCompleteSent) {
        fadeCompleteSent = true
        emit('fade-complete')
      }
    } else {
      if (fadeStart === null) fadeStart = elapsedTime
      const t = Math.min((elapsedTime - fadeStart) / FADE_DURATION, 1)
      opacity = FINAL_OPACITY * (t * t * (3 - 2 * t))
    }
    for (const material of materials) {
      material.uniforms.uOpacity!.value = opacity
    }
  }

  for (const mesh of meshes) mesh.visible = true
  props.ctx.registerRenderCallback(renderCallback)
}

onMounted(() => {
  window.addEventListener('wheel', onWheel, { passive: true })
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: true })
  window.addEventListener('touchend', onTouchEnd, { passive: true })
  window.addEventListener('touchcancel', onTouchEnd, { passive: true })
  buildRows()
})

onBeforeUnmount(() => {
  disposed = true
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
  window.removeEventListener('touchcancel', onTouchEnd)
  if (renderCallback && props.ctx.unregisterRenderCallback) {
    props.ctx.unregisterRenderCallback(renderCallback)
    renderCallback = null
  }
  if (props.ctx.unregisterResizeCallback) {
    props.ctx.unregisterResizeCallback(onResize)
  }
  for (const mesh of meshes) {
    props.ctx.scene.remove(mesh)
  }
  for (const material of materials) {
    material.uniforms.uTexture!.value.dispose()
    material.dispose()
  }
  sharedGeometry?.dispose()
  sharedGeometry = null
  meshes.length = 0
  materials.length = 0
  baseX.length = 0
  rowIndexes.length = 0
  introDelays.length = 0
  introRots.length = 0
})
</script>

<template>
  <span aria-hidden="true" style="display: none" />
</template>