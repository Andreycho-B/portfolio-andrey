<script setup lang="ts">
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { detectWebGLTier, detectWebGLSupport, getDPR, shouldEnableBloom, shouldEnableRadialBlur, type WebGLTier } from '~/composables/useWebGLTier'

interface SceneContext {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  composer: EffectComposer | null
  timer: THREE.Timer
  tier: WebGLTier
  registerRenderCallback: (cb: (deltaTime: number, elapsedTime: number) => void) => void
  unregisterRenderCallback: (cb: (deltaTime: number, elapsedTime: number) => void) => void
  registerResizeCallback: (cb: (width: number, height: number) => void) => void
  unregisterResizeCallback: (cb: (width: number, height: number) => void) => void
}

const props = withDefaults(defineProps<{
  clearColor?: number
  fov?: number
  cameraZ?: number
}>(), {
  clearColor: 0x000000,
  fov: 75,
  cameraZ: 5,
})

const emit = defineEmits<{
  'scene-ready': [context: SceneContext]
  'webgl-unsupported': []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let composer: EffectComposer | null = null
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

  const supported = detectWebGLSupport()
  if (!supported) {
    emit('webgl-unsupported')
    return
  }

  const tier = detectWebGLTier()
  const parent = canvas.parentElement
  if (!parent) return

  const width = parent.clientWidth
  const height = parent.clientHeight

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(props.fov, width / height, 0.1, 100)
  camera.position.set(0, 0, props.cameraZ)

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: tier !== 'low',
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
  })
  renderer.setPixelRatio(getDPR(tier))
  renderer.setSize(width, height)
  renderer.setClearColor(props.clearColor, 1)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0

  composer = new EffectComposer(renderer)
  composer.setPixelRatio(getDPR(tier))
  composer.setSize(width, height)
  composer.addPass(new RenderPass(scene, camera))

  if (shouldEnableBloom(tier)) {
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.8,
      0.6,
      0.85,
    )
    composer.addPass(bloomPass)
  }

  composer.addPass(new OutputPass())

  timer = new THREE.Timer()

  emit('scene-ready', {
    scene,
    camera,
    renderer,
    composer,
    timer,
    tier,
    registerRenderCallback,
    unregisterRenderCallback,
    registerResizeCallback,
    unregisterResizeCallback,
  })

  const animate = () => {
    animationId = requestAnimationFrame(animate)
    if (!timer || !composer) return
    timer.update()
    const delta = timer.getDelta()
    const elapsed = timer.getElapsedTime()
    for (const cb of renderCallbacks) cb(delta, elapsed)
    composer.render()
  }
  animate()

  resizeObserver = new ResizeObserver(() => handleResize())
  resizeObserver.observe(parent)
}

const handleResize = () => {
  if (!renderer || !camera || !composer || !canvasRef.value) return
  const parent = canvasRef.value.parentElement
  if (!parent) return
  const width = parent.clientWidth
  const height = parent.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
  composer.setSize(width, height)
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
  composer?.dispose()
  renderer?.dispose()
  scene = null
  camera = null
  renderer = null
  composer = null
  timer = null
}

onMounted(setupScene)
onBeforeUnmount(disposeAll)
</script>

<template>
  <div class="webgl-container">
    <canvas ref="canvasRef" class="webgl-canvas" />
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
  background: #000000;
}

.webgl-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: default;
}
</style>
