<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import ConstellationGrid from './ConstellationGrid.vue'
import { dotPatternVertexShader, dotPatternFragmentShader } from '~/shaders/dotPatternShader'
import type { SceneContext } from '~/components/WebGLScene.vue'

// Punto fijo del clúster: centro de la máscara elíptica (20 % ancho / 50 % alto)
const ANCHOR = [0.2, 0.5] as const

// Fracciones de la elipse replicadas del CSS (calibrables si el look no convence)
const MASK_CENTER = new THREE.Vector2(0.2, 0.5)
const MASK_RADII = new THREE.Vector2(0.45, 0.65)
const MASK_FADE_END = 0.8
const DOT_OPACITY = 0.7

// El cuadro de fondo vive detrás de las tarjetas (la cámara mira hacia -Z desde cameraZ)
const BG_Z = -2

// Mobile: clúster compacto (radio y zona de anillos/etiquetas escalados) para que
// el efecto quede contenido en la zona visible de la máscara sin robar protagonismo.
const isCompact = ref(false)
let mq: MediaQueryList | null = null

const handleMqChange = (e: MediaQueryListEvent) => {
  isCompact.value = e.matches
}

onMounted(() => {
  mq = window.matchMedia('(max-width: 640px)')
  isCompact.value = mq.matches
  mq.addEventListener('change', handleMqChange)
})

onBeforeUnmount(() => {
  mq?.removeEventListener('change', handleMqChange)
})

// ---------------------------------------------------------------------------
// Espejo WebGL: cuando la escena está lista, el canvas 2D deja de componerse por el
// navegador (visibility: hidden) y su contenido se sube como textura a un cuadro
// fullscreen dentro del render WebGL, con la misma máscara elíptica en el shader.
// Esto elimina el apilado canvas 2D + canvas WebGL transparente que en algunos
// motores (Safari iOS / Brave) ocultaba el patrón de puntos.
// ---------------------------------------------------------------------------

const props = withDefaults(defineProps<{ ctx?: SceneContext | null }>(), { ctx: null })

const gridRef = ref<InstanceType<typeof ConstellationGrid> | null>(null)
const glActive = ref(false)

let quad: THREE.Mesh | null = null
let quadGeometry: THREE.PlaneGeometry | null = null
let mirrorMaterial: THREE.ShaderMaterial | null = null
let mirrorTexture: THREE.CanvasTexture | null = null
let renderCallback: (() => void) | null = null
let resizeCallback: ((width: number, height: number) => void) | null = null

const updateQuadSize = (width: number, height: number) => {
  if (!quad || !props.ctx) return
  const cam = props.ctx.camera
  const dist = cam.position.z - BG_Z
  const halfH = Math.tan((cam.fov * Math.PI) / 360) * dist
  const halfW = halfH * (width / height)
  quad.scale.set(halfW * 2, halfH * 2, 1)
}

const initMirror = () => {
  const canvas = gridRef.value?.$el as HTMLCanvasElement | null
  if (!canvas || !props.ctx || mirrorTexture) return

  mirrorTexture = new THREE.CanvasTexture(canvas)
  mirrorTexture.colorSpace = THREE.SRGBColorSpace
  mirrorTexture.generateMipmaps = false
  mirrorTexture.minFilter = THREE.LinearFilter
  mirrorTexture.magFilter = THREE.LinearFilter
  mirrorTexture.needsUpdate = true

  mirrorMaterial = new THREE.ShaderMaterial({
    vertexShader: dotPatternVertexShader,
    fragmentShader: dotPatternFragmentShader,
    uniforms: {
      uTexture: { value: mirrorTexture },
      uOpacity: { value: DOT_OPACITY },
      uMaskCenter: { value: MASK_CENTER },
      uMaskRadii: { value: MASK_RADII },
      uMaskFadeEnd: { value: MASK_FADE_END },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })

  quadGeometry = new THREE.PlaneGeometry(1, 1)
  quad = new THREE.Mesh(quadGeometry, mirrorMaterial)
  quad.position.z = BG_Z
  quad.renderOrder = -1
  quad.frustumCulled = false
  props.ctx.scene.add(quad)

  updateQuadSize(window.innerWidth, window.innerHeight)

  renderCallback = () => {
    if (mirrorTexture) mirrorTexture.needsUpdate = true
  }
  props.ctx.registerRenderCallback(renderCallback)
  resizeCallback = updateQuadSize
  props.ctx.registerResizeCallback(resizeCallback)

  glActive.value = true
}

const disposeMirror = () => {
  if (props.ctx) {
    if (renderCallback) props.ctx.unregisterRenderCallback(renderCallback)
    if (resizeCallback) props.ctx.unregisterResizeCallback(resizeCallback)
    if (quad) props.ctx.scene.remove(quad)
  }
  quadGeometry?.dispose()
  quadGeometry = null
  mirrorMaterial?.dispose()
  mirrorMaterial = null
  mirrorTexture?.dispose()
  mirrorTexture = null
  quad = null
  renderCallback = null
  resizeCallback = null
  glActive.value = false
}

watch(
  () => props.ctx,
  (ctx) => {
    if (ctx) initMirror()
    else disposeMirror()
  },
)
</script>

<template>
  <ConstellationGrid
    ref="gridRef"
    class="dot-pattern"
    :class="{ 'dot-pattern--gl-hidden': glActive }"
    :anchor="ANCHOR"
    :compact="isCompact"
  />
</template>

<style scoped>
.dot-pattern {
  opacity: 0.7;

  /* Centro del patrón: centro de la mitad izquierda de la pantalla (20% del ancho, 50% del alto);
     elipse ampliada hacia la derecha (rx 45%) para que el fade llegue cerca del 65% del ancho.
     Fallback sin WebGL (el espejo aplica la misma máscara en el shader). */
  -webkit-mask-image: radial-gradient(ellipse 45% 65% at 20% 50%, #000 0%, transparent 80%);
  mask-image: radial-gradient(ellipse 45% 65% at 20% 50%, #000 0%, transparent 80%);
}

/* Con el espejo WebGL activo el canvas deja de componerse por el navegador:
   su bitmap sigue siendo la única fuente de la textura del cuadro de fondo. */
.dot-pattern--gl-hidden {
  visibility: hidden;
}

/* Mobile: puntos más sutiles y elipse más contenida para no robar protagonismo
   a las tarjetas ni al texto vertical. */
@media (width <= 640px) {
  .dot-pattern {
    opacity: 0.7;
    -webkit-mask-image: radial-gradient(ellipse 45% 65% at 20% 50%, #000 0%, transparent 80%);
    mask-image: radial-gradient(ellipse 45% 65% at 20% 50%, #000 0%, transparent 80%);
  }
}
</style>