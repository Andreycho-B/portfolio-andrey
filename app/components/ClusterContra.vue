<script setup lang="ts">
import * as THREE from 'three'
import { cardVertexShader, cardFragmentShader } from '~/shaders/cardShader'
import type { SceneContext } from '~/components/WebGLScene.vue'

const CARD_SIZE = 0.85
const CARD_SEGMENTS = 1
const SPACING = 0.95
const ROW_Y = 0.95
const ROW_Z = 0
const CORNER_RADIUS_PX = 12

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
const ROW_DIRS = [1, -1]

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

let renderCallback: ((deltaTime: number, elapsedTime: number) => void) | null = null

let wheelVel = 0
let smoothVel = 0
let driftDir = 1
let lastTouchY: number | null = null
const rowOffsets = [0, 0]

const onWheel = (e: WheelEvent) => {
  wheelVel += e.deltaY * WHEEL_SENSITIVITY
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

const applyCornerRadius = (viewportHeight: number) => {
  const cam = props.ctx.camera
  const dist = cam.position.z - ROW_Z
  const projectedSize = (CARD_SIZE / dist) * (viewportHeight / (2 * Math.tan((cam.fov * Math.PI) / 360)))
  const radius = Math.min(CORNER_RADIUS_PX / projectedSize, 0.5)
  for (const material of materials) {
    material.uniforms.uRadius!.value = radius
  }
}

const onResize = (_width: number, height: number) => {
  applyCornerRadius(height)
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
  const texInfos = await Promise.all(PROJECTS.map(loadTexture))

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

  applyCornerRadius(window.innerHeight)
  props.ctx.registerResizeCallback(onResize)

  for (let i = 0; i < CARD_COUNT; i++) {
    const row = Math.floor(i / CARDS_PER_ROW)
    const col = i % CARDS_PER_ROW
    const mesh = new THREE.Mesh(geometry, materials[i % materials.length])
    mesh.position.set(0, row === 0 ? ROW_Y : -ROW_Y, ROW_Z)
    mesh.visible = false
    props.ctx.scene.add(mesh)
    meshes.push(mesh)
    baseX.push(col * SPACING - ROW_WIDTH / 2)
    rowIndexes.push(row)
  }

  let fadeStart: number | null = null
  let fadeOutStart: number | null = null
  let fadeCompleteSent = false

  renderCallback = (deltaTime: number, elapsedTime: number) => {
    wheelVel *= Math.exp(-WHEEL_DECAY_RATE * deltaTime)
    smoothVel += (wheelVel - smoothVel) * (1 - Math.exp(-SMOOTH_RATE * deltaTime))

    if (Math.abs(smoothVel) > FLIP_THRESHOLD && Math.sign(smoothVel) !== driftDir) {
      driftDir = Math.sign(smoothVel)
    }
    const factor = 1 + Math.max(0, smoothVel * WHEEL_FACTOR * driftDir)

    for (let r = 0; r < ROW_COUNT; r++) {
      rowOffsets[r]! += BASE_DRIFT * ROW_DIRS[r]! * driftDir * factor * deltaTime
      if (rowOffsets[r]! > ROW_WIDTH) rowOffsets[r]! -= ROW_WIDTH
      if (rowOffsets[r]! < -ROW_WIDTH) rowOffsets[r]! += ROW_WIDTH
    }

    for (let i = 0; i < CARD_COUNT; i++) {
      const r = rowIndexes[i]!
      const trackX = (((baseX[i]! + rowOffsets[r]!) % ROW_WIDTH) + ROW_WIDTH) % ROW_WIDTH
      meshes[i]!.position.x = trackX - ROW_WIDTH / 2
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
  }
  meshes.length = 0
  materials.length = 0
  baseX.length = 0
  rowIndexes.length = 0
})
</script>

<template>
  <span aria-hidden="true" style="display: none" />
</template>