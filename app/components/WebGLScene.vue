<script setup lang="ts">
import * as THREE from 'three'
import { detectWebGLSupport, getDPR } from '~/composables/useWebGLTier'

export interface SceneContext {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  registerRenderCallback: (cb: (deltaTime: number, elapsedTime: number) => void) => void
  unregisterRenderCallback: (cb: (deltaTime: number, elapsedTime: number) => void) => void
  registerResizeCallback: (cb: (width: number, height: number) => void) => void
  unregisterResizeCallback: (cb: (width: number, height: number) => void) => void
}

const props = withDefaults(defineProps<{
  clearColor?: number
  fov?: number
  cameraZ?: number
  cameraX?: number
}>(), {
  clearColor: 0xffffff,
  fov: 75,
  cameraZ: 5,
  cameraX: 0,
})

const emit = defineEmits<{
  'scene-ready': [context: SceneContext]
  'webgl-unsupported': []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let timer: THREE.Timer | null = null
let animationId: number | null = null
let resizeObserver: ResizeObserver | null = null

const renderCallbacks: Array<(deltaTime: number, elapsedTime: number) => void> = []
const resizeCallbacks: Array<(width: number, height: number) => void> = []

const registerRenderCallback = (cb: (deltaTime: number, elapsedTime: number) => void) => {
  renderCallbacks.push(cb)
}
const unregisterRenderCallback = (cb: (deltaTime: number, elapsedTime: number) => void) => {
  const idx = renderCallbacks.indexOf(cb)
  if (idx > -1) renderCallbacks.splice(idx, 1)
}
const registerResizeCallback = (cb: (width: number, height: number) => void) => {
  resizeCallbacks.push(cb)
}
const unregisterResizeCallback = (cb: (width: number, height: number) => void) => {
  const idx = resizeCallbacks.indexOf(cb)
  if (idx > -1) resizeCallbacks.splice(idx, 1)
}

const setupScene = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  if (!detectWebGLSupport()) {
    emit('webgl-unsupported')
    return
  }

  const parent = canvas.parentElement
  if (!parent) return

  const width = parent.clientWidth
  const height = parent.clientHeight
  const dpr = getDPR()

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(props.fov, width / height, 0.1, 100)
  camera.position.set(props.cameraX, 0, props.cameraZ)

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    premultipliedAlpha: false,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
  })
  renderer.setPixelRatio(dpr)
  renderer.setSize(width, height)
  // Fondo transparente: el blanco y el patrón de puntos los aporta el HTML de detrás (.page)
  renderer.setClearColor(props.clearColor, 0)

  timer = new THREE.Timer()

  emit('scene-ready', {
    scene,
    camera,
    renderer,
    registerRenderCallback,
    unregisterRenderCallback,
    registerResizeCallback,
    unregisterResizeCallback,
  })

  const animate = () => {
    if (!timer || !renderer || !scene || !camera) return
    timer.update()
    const delta = Math.min(timer.getDelta(), 0.05)
    const elapsed = timer.getElapsed()
    for (const cb of renderCallbacks) cb(delta, elapsed)
    renderer.render(scene, camera)
    animationId = requestAnimationFrame(animate)
  }
  animate()

  const handleContextLost = (e: Event) => {
    e.preventDefault()
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
  }

  const handleContextRestored = () => {
    if (!renderer || !scene || !camera || !timer) return
    // La restauración del contexto resetea el estado del renderer: se re-sincroniza
    // tamaño, pixel ratio, clear color y se reanuda el loop de animación
    renderer.setPixelRatio(getDPR())
    renderer.setSize(parent.clientWidth, parent.clientHeight)
    renderer.setClearColor(props.clearColor, 0)
    handleResize()
    timer = new THREE.Timer()
    animate()
  }

  canvas.addEventListener('webglcontextlost', handleContextLost)
  canvas.addEventListener('webglcontextrestored', handleContextRestored)

  resizeObserver = new ResizeObserver(() => handleResize())
  resizeObserver.observe(parent)
}

const handleResize = () => {
  if (!renderer || !camera || !canvasRef.value) return
  const parent = canvasRef.value.parentElement
  if (!parent) return
  const width = parent.clientWidth
  const height = parent.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
  for (const cb of resizeCallbacks) cb(width, height)
}

const disposeAll = () => {
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  renderCallbacks.length = 0
  resizeCallbacks.length = 0
  scene?.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose()
      const mat = obj.material
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
      else mat?.dispose()
    }
  })
  renderer?.dispose()
  scene = null
  camera = null
  renderer = null
  timer = null
}

onMounted(setupScene)
onBeforeUnmount(disposeAll)
</script>

<template>
  <div class="webgl-container">
    <canvas
      ref="canvasRef"
      class="webgl-canvas"
      aria-hidden="true"
    />
    <slot />
  </div>
</template>

<style scoped>
.webgl-container {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  z-index: 0;
}

.webgl-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
