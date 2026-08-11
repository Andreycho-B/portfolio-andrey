<script setup lang="ts">
import * as THREE from 'three'
import { gridFragmentShader, gridVertexShader } from '~/shaders/grid'
import { detectWebGLSupport, getDPR, type WebGLTier } from '~/composables/useWebGLTier'

export interface SceneContext {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
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
  clearColor: 0xffffff,
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
let clock: THREE.Clock | null = null
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
  const dpr = getDPR('mid')

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(props.fov, width / height, 0.1, 100)
  camera.position.set(0, 0, props.cameraZ)

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
  })
  renderer.setPixelRatio(dpr)
  renderer.setSize(width, height)
  renderer.setClearColor(props.clearColor, 1)

  const gridMaterial = new THREE.ShaderMaterial({
    vertexShader: gridVertexShader,
    fragmentShader: gridFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(width, height) },
      uGridSize: { value: 40 },
      uLineOpacity: { value: 0.05 },
    },
    depthTest: false,
    depthWrite: false,
    transparent: true,
  })
  const gridMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), gridMaterial)
  gridMesh.frustumCulled = false
  gridMesh.renderOrder = -1
  scene.add(gridMesh)

  const updateGrid = (_delta: number, elapsed: number) => {
    gridMaterial.uniforms.uTime.value = elapsed
  }
  renderCallbacks.push(updateGrid)

  const resizeGrid = (width: number, height: number) => {
    gridMaterial.uniforms.uResolution.value.set(width, height)
  }
  resizeCallbacks.push(resizeGrid)

  clock = new THREE.Clock()

  emit('scene-ready', {
    scene,
    camera,
    renderer,
    tier: 'mid',
    registerRenderCallback,
    unregisterRenderCallback,
    registerResizeCallback,
    unregisterResizeCallback,
  })

  const animate = () => {
    animationId = requestAnimationFrame(animate)
    if (!clock || !renderer || !scene || !camera) return
    const delta = clock.getDelta()
    const elapsed = clock.getElapsedTime()
    for (const cb of renderCallbacks) cb(delta, elapsed)
    renderer.render(scene, camera)
  }
  animate()

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
  clock = null
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
