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
const FADE_EDGE_IN = 0.88
const FADE_EDGE_OUT = 1.0
// Fracción de halfW donde cae la zona de gravedad: tras el texto (86%) y pegada al borde derecho en cualquier aspect
const ZONE_FRACTION = 0.93

const fadeEdges = new THREE.Vector4()

const BASE_DRIFT = 0.15
const DRIFT_DIR = -1
const INTRO_SPEED = 6
const INTRO_DECAY_RATE = 0.7
const WHEEL_SENSITIVITY = 0.025
const WHEEL_DECAY_RATE = 1.2
const SCROLL_CAP = 2.5
const REVERSE_DAMP = 0.4
const TOUCH_SENSITIVITY = 0.032
const SMOOTH_RATE = 6
const MAX_VELOCITY = 3
const VELOCITY_SMOOTH_RATE = 7.7

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

let sharedGeometry: THREE.PlaneGeometry | null = null

let renderCallback: ((deltaTime: number, elapsedTime: number) => void) | null = null

let disposed = false

const introPlayed = useState('cluster-contra-intro-played', () => false)

let wheelVel = 0
let smoothVel = 0
let introVel = 0
let prevOffset = 0
let currentVelocity = 0
let lastTouchY: number | null = null
const rowOffsets = [0, 0]

const onWheel = (e: WheelEvent) => {
  const delta = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? e.deltaY * 16 : e.deltaY
  applyScrollImpulse(delta * WHEEL_SENSITIVITY)
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
  applyScrollImpulse(-dy * TOUCH_SENSITIVITY)
}

const onTouchEnd = () => {
  lastTouchY = null
}

const applyScrollImpulse = (imp: number) => {
  if (imp === 0) return
  // Impulso en contra del movimiento actual: atenuado por el peso de las tarjetas (revertir exige más scroll)
  if (wheelVel !== 0 && Math.sign(imp) !== Math.sign(wheelVel)) {
    imp *= REVERSE_DAMP
  }
  wheelVel = Math.min(Math.max(wheelVel + imp, -SCROLL_CAP), SCROLL_CAP)
}

const applyCornerRadius = (viewportWidth: number, viewportHeight: number) => {
  const cam = props.ctx.camera
  const dist = cam.position.z - ROW_Z
  const projectedSize = (CARD_SIZE / dist) * (viewportHeight / (2 * Math.tan((cam.fov * Math.PI) / 360)))
  const radius = Math.min(CORNER_RADIUS_PX / projectedSize, 0.5)
  const halfW = cam.position.z * Math.tan((cam.fov * Math.PI) / 360) * (viewportWidth / viewportHeight)
  fadeEdges.set(-halfW * FADE_EDGE_OUT, -halfW * FADE_EDGE_IN, halfW * FADE_EDGE_IN, halfW * FADE_EDGE_OUT)
  const zoneX = halfW * ZONE_FRACTION
  for (const material of materials) {
    material.uniforms.uRadius!.value = radius
    material.uniforms.uFadeEdges!.value.copy(fadeEdges)
    material.uniforms.uZoneCenter!.value = zoneX
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
        uCardAspect: { value: 1.0 },
        uColor: { value: new THREE.Color(0x1a1a2e) },
        uRadius: { value: 0 },
        uOpacity: { value: 0 },
        uTexture: { value: new THREE.Texture() },
        uTextureAspect: { value: 1.0 },
        uHasTexture: { value: 0.0 },
        uFadeEdges: { value: fadeEdges.clone() },
        uZoneCenter: { value: 1 },
        uVelocity: { value: 0 },
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
    rowIndexes.push(row)
  }

  let fadeStart: number | null = null
  let fadeOutStart: number | null = null
  let fadeCompleteSent = false

  renderCallback = (deltaTime: number, elapsedTime: number) => {
    if (!introPlayed.value) {
      introPlayed.value = true
      introVel = INTRO_SPEED
    }
    if (introVel > 0) {
      introVel *= Math.exp(-INTRO_DECAY_RATE * deltaTime)
      if (introVel < 0.01) introVel = 0
    }
    wheelVel *= Math.exp(-WHEEL_DECAY_RATE * deltaTime)
    if (Math.abs(wheelVel) < 0.005) wheelVel = 0
    smoothVel += (wheelVel - smoothVel) * (1 - Math.exp(-SMOOTH_RATE * deltaTime))

    for (let r = 0; r < ROW_COUNT; r++) {
      rowOffsets[r]! += (BASE_DRIFT * ROW_DIRS[r]! * DRIFT_DIR + smoothVel + introVel) * deltaTime
      if (rowOffsets[r]! > ROW_WIDTH) rowOffsets[r]! -= ROW_WIDTH
      if (rowOffsets[r]! < -ROW_WIDTH) rowOffsets[r]! += ROW_WIDTH
    }

    let deltaX = rowOffsets[0]! - prevOffset
    prevOffset = rowOffsets[0]!
    if (Math.abs(deltaX) > ROW_WIDTH * 0.5) deltaX = 0

    const targetVelocity = Math.min(Math.max(deltaX / (deltaTime || 0.016), -MAX_VELOCITY), MAX_VELOCITY)
    currentVelocity += (targetVelocity - currentVelocity) * (1 - Math.exp(-VELOCITY_SMOOTH_RATE * deltaTime))

    for (const material of materials) {
      material.uniforms.uVelocity!.value = currentVelocity
    }

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

      m.position.z = ROW_Z

      m.rotation.x = 0
      m.rotation.y = 0
      const slope = inBump
        ? -((TOP_AMP * Math.PI) / (2 * TOP_WIDTH * ROW_WIDTH)) * Math.sin(Math.PI * tu)
        : 0
      m.rotation.z = isTop ? slope : -slope
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
})
</script>

<template>
  <!-- Componente lógico: gestiona el marquee WebGL sin salida visual propia -->
</template>
