<template>
  <div ref="shaderContainer" class="greeting-shader"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'

const props = withDefaults(
  defineProps<{
    autoPlay?: boolean
    warpStrength?: number
  }>(),
  {
    autoPlay: true,
    warpStrength: 0.88,
  },
)

const shaderContainer = ref<HTMLElement | null>(null)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let topMaterial: THREE.ShaderMaterial | null = null
let bottomMaterial: THREE.ShaderMaterial | null = null
let topGeometry: THREE.PlaneGeometry | null = null
let bottomGeometry: THREE.PlaneGeometry | null = null
let topTexture: THREE.CanvasTexture | null = null
let bottomTexture: THREE.CanvasTexture | null = null
let topMesh: THREE.Mesh | null = null
let bottomMesh: THREE.Mesh | null = null
let group: THREE.Group | null = null
let rafId = 0

// Shaders para la deformación simétrica en reloj de arena con curvatura superior potenciada
const vertexShader = `
  uniform float uWarpStrength;
  uniform float uIsTop; // 1.0 para línea superior, -1.0 para línea inferior
  uniform float uWingFlare;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Coordenada horizontal normalizada de -1.0 a +1.0
    float u = uv.x * 2.0 - 1.0;
    float absU = abs(u);
    
    // Curva cóncava pronunciada tipo reloj de arena
    float curve = pow(absU, 1.74);

    // Factor vertical:
    // Para línea superior (uIsTop = 1.0), uv.y = 0 es la costura inferior plana
    // Para línea inferior (uIsTop = -1.0), uv.y = 1 es la costura superior plana
    float vertFactor = uIsTop > 0.0 ? uv.y : (1.0 - uv.y);

    // Multiplicador calibrado para simetría visual perfecta (la línea superior recibe mayor elevación)
    float warpMult = uIsTop > 0.0 ? 3.15 : 2.55;
    float dy = vertFactor * curve * uWarpStrength * warpMult;
    pos.y += uIsTop * dy;

    // Flare diagonal pronunciado en los 4 extremos exteriores
    float flareMult = uIsTop > 0.0 ? 1.15 : 1.0;
    float dx = u * curve * vertFactor * uWingFlare * flareMult;
    pos.x += dx;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const fragmentShader = `
  uniform sampler2D tDiffuse;
  varying vec2 vUv;

  void main() {
    vec4 texColor = texture2D(tDiffuse, vUv);
    if (texColor.a < 0.02) discard;
    gl_FragColor = texColor;
  }
`

const createTextCanvas = (text: string, isTop: boolean): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#FF1818' // Rojo brutalista vibrante
  ctx.textAlign = 'center'
  ctx.font = '900 248px "Cabinet Grotesk", sans-serif'
  ctx.letterSpacing = '-0.035em'

  // Alineación al límite del borde para costura ultra-fina (seam mínimo)
  if (isTop) {
    // Línea superior: base al ras del borde inferior del canvas
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(text, canvas.width / 2, canvas.height - 12)
  } else {
    // Línea inferior: tope al ras del borde superior del canvas
    ctx.textBaseline = 'top'
    ctx.fillText(text, canvas.width / 2, 12)
  }

  return canvas
}

const initScene = async () => {
  if (!shaderContainer.value) return

  // Asegurar carga previa de Cabinet Grotesk 900
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await Promise.all([
        document.fonts.load('900 248px "Cabinet Grotesk"'),
        document.fonts.load('800 248px "Cabinet Grotesk"'),
        document.fonts.ready,
      ])
    } catch {
      // Continuar si la fuente ya está en caché
    }
  }

  // 1. Texturas 2D de alta resolución
  const canvasTop = createTextCanvas('¡HEY!  HOLA', true)
  const canvasBottom = createTextCanvas('SOY  ANDREY', false)

  topTexture = new THREE.CanvasTexture(canvasTop)
  topTexture.minFilter = THREE.LinearFilter
  topTexture.magFilter = THREE.LinearFilter
  topTexture.colorSpace = THREE.SRGBColorSpace

  bottomTexture = new THREE.CanvasTexture(canvasBottom)
  bottomTexture.minFilter = THREE.LinearFilter
  bottomTexture.magFilter = THREE.LinearFilter
  bottomTexture.colorSpace = THREE.SRGBColorSpace

  // 2. Setup de Three.js
  scene = new THREE.Scene()

  const width = window.innerWidth
  const height = window.innerHeight
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
  camera.position.z = 7.0

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  shaderContainer.value.appendChild(renderer.domElement)

  // 3. Materiales con Shader personalizado
  const warpStrengthVal = props.warpStrength
  topMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: topTexture },
      uWarpStrength: { value: warpStrengthVal },
      uIsTop: { value: 1.0 },
      uWingFlare: { value: 0.24 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  })

  bottomMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: bottomTexture },
      uWarpStrength: { value: warpStrengthVal },
      uIsTop: { value: -1.0 },
      uWingFlare: { value: 0.24 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  })

  // 4. Geometría con alta densidad de subdivisiones horizontales
  const PLANE_W = 5.2
  const PLANE_H = 1.28
  const SEAM_GAP = 0.012 // Costura ultra-fina (reducida al mínimo)

  topGeometry = new THREE.PlaneGeometry(PLANE_W, PLANE_H, 160, 80)
  bottomGeometry = new THREE.PlaneGeometry(PLANE_W, PLANE_H, 160, 80)

  topMesh = new THREE.Mesh(topGeometry, topMaterial)
  topMesh.position.y = SEAM_GAP / 2 + PLANE_H / 2

  bottomMesh = new THREE.Mesh(bottomGeometry, bottomMaterial)
  bottomMesh.position.y = -(SEAM_GAP / 2 + PLANE_H / 2)

  group = new THREE.Group()
  group.add(topMesh)
  group.add(bottomMesh)
  scene.add(group)

  // Función responsive continua para todos los tipos de pantalla
  const updateResponsiveScale = () => {
    if (!camera || !renderer || !group) return
    const w = window.innerWidth
    const h = window.innerHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)

    // Cálculo del campo de visión visible en unidades de Three.js
    const vFovRad = (camera.fov * Math.PI) / 180
    const visibleHeight = 2 * Math.tan(vFovRad / 2) * camera.position.z
    const visibleWidth = visibleHeight * camera.aspect

    // Ancho objetivo adaptativo (90% en móviles, limitado en pantallas ultra-anchas)
    const maxTargetWidth = Math.min(visibleWidth * 0.90, visibleHeight * 1.15)
    let scale = maxTargetWidth / PLANE_W

    // Guard para no exceder la altura en pantallas de orientación landscape estrecha
    const estimatedHeight = PLANE_H * 2.8 * scale
    if (estimatedHeight > visibleHeight * 0.72) {
      scale = (visibleHeight * 0.72) / (PLANE_H * 2.8)
    }

    group.scale.set(scale, scale, 1)

    // Offset vertical según proporciones de pantalla
    if (w < 640) {
      group.position.y = 0.12
    } else {
      group.position.y = 0.04
    }
  }

  updateResponsiveScale()
  window.addEventListener('resize', updateResponsiveScale)

  // 5. Render Loop
  const animate = () => {
    rafId = requestAnimationFrame(animate)
    if (renderer && scene && camera) {
      renderer.render(scene, camera)
    }
  }
  animate()
}

onMounted(() => {
  initScene()
})

watch(
  () => props.warpStrength,
  (newVal) => {
    if (topMaterial?.uniforms?.uWarpStrength) topMaterial.uniforms.uWarpStrength.value = newVal
    if (bottomMaterial?.uniforms?.uWarpStrength) bottomMaterial.uniforms.uWarpStrength.value = newVal
  },
)

onBeforeUnmount(() => {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
  topTexture?.dispose()
  bottomTexture?.dispose()
  topMaterial?.dispose()
  bottomMaterial?.dispose()
  topGeometry?.dispose()
  bottomGeometry?.dispose()
  renderer?.dispose()
  if (renderer?.domElement && renderer.domElement.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement)
  }
})
</script>

<style scoped>
.greeting-shader {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
