<template>
  <div ref="shaderContainer" class="greeting-shader" />
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import { getDPR } from '~/composables/useWebGLTier'

const props = withDefaults(
  defineProps<{
    active?: boolean
    autoPlay?: boolean
    warpStrength?: number
    startTime?: number
  }>(),
  {
    active: true,
    autoPlay: true,
    warpStrength: 1.05,
    startTime: 0,
  },
)

const shaderContainer = ref<HTMLElement | null>(null)

interface WordConfig {
  id: string
  text: string
  isTop: boolean
  align: 'right' | 'left' | 'center'
  targetX: number
  targetY: number
  inStart: number
  inEnd: number
  outStart: number
  outEnd: number
  isPhase2?: boolean
  archStrength?: number
}

interface WordInstance extends WordConfig {
  mesh?: THREE.Mesh
  material?: THREE.ShaderMaterial
  geometry?: THREE.PlaneGeometry
  texture?: THREE.CanvasTexture
  canvas?: HTMLCanvasElement
}

const PLANE_ROLE_W = 8.4
const PLANE_ROLE_H = 1.25

// Configuración de palabras para Fase 1 (Saludo 4 cuadrantes) y Fase 2 (Awwwards Arched Full-Screen Typography)
const WORD_CONFIGS: readonly WordConfig[] = [
  // === FASE 1: THE GREETING ===
  // 1. "¡HEY!" -> Arriba Izquierda (Entra a 0.00s, Succionado a 3.00s)
  {
    id: 'hey',
    text: '¡HEY!',
    isTop: true,
    align: 'right',
    targetX: -1.85,
    targetY: 0.85,
    inStart: 0.00,
    inEnd: 0.44,
    outStart: 3.00,
    outEnd: 3.52,
  },
  // 2. "HOLA" -> Arriba Derecha (Entra a 0.20s, Succionado a 3.18s)
  {
    id: 'hola',
    text: 'HOLA',
    isTop: true,
    align: 'left',
    targetX: 1.85,
    targetY: 0.85,
    inStart: 0.20,
    inEnd: 0.64,
    outStart: 3.18,
    outEnd: 3.70,
  },
  // 3. "SOY" -> Abajo Izquierda (Entra a 0.40s, Succionado a 3.36s)
  {
    id: 'soy',
    text: 'SOY',
    isTop: false,
    align: 'right',
    targetX: -1.85,
    targetY: -0.85,
    inStart: 0.40,
    inEnd: 0.84,
    outStart: 3.36,
    outEnd: 3.88,
  },
  // 4. "ANDREY" -> Abajo Derecha (Entra a 0.60s, Succionado a 3.54s)
  {
    id: 'andrey',
    text: 'ANDREY',
    isTop: false,
    align: 'left',
    targetX: 1.85,
    targetY: -0.85,
    inStart: 0.60,
    inEnd: 1.04,
    outStart: 3.54,
    outEnd: 4.06,
  },

  // === FASE 2: DESARROLLADOR / CREATIVO (Deformación de Malla Continua a Escala Completa) ===
  // 5. "DESARROLLADOR" -> Mitad Superior (Expandido a los costados y hacia arriba con arco monumental)
  {
    id: 'desarrollador',
    text: 'DESARROLLADOR',
    isTop: true,
    align: 'center',
    targetX: 0,
    targetY: 0.625,
    inStart: 4.08,
    inEnd: 4.62,
    outStart: 9999,
    outEnd: 9999,
    isPhase2: true,
    archStrength: 1.62, // Deformación vertical ascendente expandida hacia la cima
  },
  // 6. "CREATIVO" -> Mitad Inferior (Expandido a los costados a escala con curvatura que protege el CTA)
  {
    id: 'creativo',
    text: 'CREATIVO',
    isTop: false,
    align: 'center',
    targetX: 0,
    targetY: -0.625,
    inStart: 4.08,
    inEnd: 4.62,
    outStart: 9999,
    outEnd: 9999,
    isPhase2: true,
    archStrength: 0.58, // Curvatura descendente con holgura segura sobre el botón
  },
]

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let group: THREE.Group | null = null
let rafId = 0
let localStartTime = 0
let handleResize: (() => void) | null = null
let isDisposed = false
let wordInstances: WordInstance[] = []

// Shaders GLSL: Fase 1 (Reloj de arena + Espaguetificación) y Fase 2 (Deformación de Arco Continuo a Escala)
const vertexShader = `
  uniform float uIsPhase2;
  uniform float uArchStrength;
  uniform float uWarpStrength;
  uniform float uIsTop;
  uniform float uWingFlare;
  uniform float uSide;
  uniform float uSuction;
  uniform vec3 uSingularity;
  varying vec2 vUv;
  varying float vSuctionFade;

  void main() {
    vUv = uv;
    vec3 pos = position;

    if (uIsPhase2 > 0.5) {
      // === FASE 2: DEFORMACIÓN DE MALLA CONTINUA A ESCALA (AWWWARDS TECHNIQUE) ===
      // Distancia normalizada desde el centro horizontal: 0.0 en el ombligo central, 1.0 en los bordes
      float dist = abs(uv.x - 0.5) * 2.0;

      // Perfil de arco armónico continuo
      float arch = cos(dist * 1.57079632679);

      if (uIsTop > 0.0) {
        // --- DESARROLLADOR (Mitad Superior) ---
        // La base inferior (uv.y = 0.0) se mantiene 100% horizontal y recta sobre el eje Y = 0.
        // La parte superior (uv.y = 1.0) se expande hacia ARRIBA con cupula/ombligo monumental en el centro.
        float vertFactor = uv.y;
        float dy = arch * vertFactor * uArchStrength;
        pos.y += dy;
      } else {
        // --- CREATIVO (Mitad Inferior) ---
        // La parte superior (uv.y = 1.0) se mantiene 100% horizontal y recta sobre el eje Y = 0.
        // La parte inferior (uv.y = 0.0) se arquea hacia ABAJO con ombligo en el centro.
        float vertFactor = (1.0 - uv.y);
        float dy = -arch * vertFactor * uArchStrength;
        pos.y += dy;
      }

      vSuctionFade = 1.0;
    } else {
      // === FASE 1: THE GREETING (Deformación cóncava + Espaguetificación hacia singularidad) ===
      float globalU = (uSide < 0.0) ? (uv.x - 1.0) : uv.x;
      float absU = abs(globalU);
      
      float curve = pow(absU, 1.58);
      float vertFactor = uIsTop > 0.0 ? uv.y : (1.0 - uv.y);

      float warpMult = 3.85;
      float dy = vertFactor * curve * uWarpStrength * warpMult;
      pos.y += uIsTop * dy;

      float flareMult = 1.25;
      float dx = globalU * curve * vertFactor * uWingFlare * flareMult;
      pos.x += dx;

      float d = (uSide < 0.0) ? (1.0 - uv.x) : uv.x;

      if (uSuction > 0.001) {
        float stagger = 0.48;
        float tLocal = clamp((uSuction - d * stagger) / (1.0 - stagger), 0.0, 1.0);

        if (tLocal > 0.0) {
          float pull = pow(tLocal, 2.6);
          vec3 toSingularity = uSingularity - pos;
          vec3 dir = normalize(toSingularity);
          float stretch = sin(tLocal * 3.14159265) * 0.52 * (1.0 - d * 0.3);
          float thinFactor = max(0.01, 1.0 - pow(tLocal, 1.3) * 0.92);

          vec3 spaghettifiedPos = mix(pos, uSingularity, pull) + dir * stretch;
          spaghettifiedPos.y = mix(spaghettifiedPos.y, uSingularity.y, 1.0 - thinFactor);

          float swirlAngle = -uSide * pow(tLocal, 2.2) * 0.35;
          float cA = cos(swirlAngle);
          float sA = sin(swirlAngle);
          vec2 diff = spaghettifiedPos.xy - uSingularity.xy;
          spaghettifiedPos.x = uSingularity.x + (diff.x * cA - diff.y * sA);
          spaghettifiedPos.y = uSingularity.y + (diff.x * sA + diff.y * cA);

          pos = spaghettifiedPos;
        }

        vSuctionFade = clamp(1.0 - pow(tLocal, 3.5), 0.0, 1.0);
      } else {
        vSuctionFade = 1.0;
      }
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const fragmentShader = `
  uniform sampler2D tDiffuse;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vSuctionFade;

  void main() {
    vec4 texColor = texture2D(tDiffuse, vUv);
    if (texColor.a < 0.02) discard;
    gl_FragColor = vec4(texColor.rgb, texColor.a * uOpacity * vSuctionFade);
  }
`

const setLetterSpacing = (ctx: CanvasRenderingContext2D, spacing: string) => {
  if ('letterSpacing' in ctx) {
    ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = spacing
  }
}

// Generador de Canvas 2D con renderizado de glifos exactos y expansión a escala
const renderCanvasText = (
  canvas: HTMLCanvasElement,
  text: string,
  isTop: boolean,
  align: 'right' | 'left' | 'center',
) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#FF1818' // Rojo brutalista vibrante

  // === RENDERIZADO DE FASE 2: DESARROLLADOR / CREATIVO (Deformación a escala sin recortar) ===
  if (text === 'DESARROLLADOR') {
    ctx.save()
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'center'
    ctx.font = '900 248px "Cabinet Grotesk", sans-serif'
    setLetterSpacing(ctx, '-0.035em')
    const measuredW = ctx.measureText('DESARROLLADOR').width
    // Expansión horizontal a escala para abarcar el 98% del lienzo de lado a lado
    const targetW = canvas.width - 36 // 2012px
    const scaleX = targetW / measuredW
    ctx.scale(scaleX, 1.0)
    // El baseline se posiciona en el borde inferior del canvas (Y = 0 en el shader)
    ctx.fillText('DESARROLLADOR', (canvas.width / 2) / scaleX, canvas.height - 20)
    ctx.restore()
    return
  }

  if (text === 'CREATIVO') {
    ctx.save()
    ctx.textBaseline = 'top'
    ctx.textAlign = 'center'
    ctx.font = '900 248px "Cabinet Grotesk", sans-serif'
    setLetterSpacing(ctx, '-0.025em')
    const measuredW = ctx.measureText('CREATIVO').width
    // Expansión horizontal a escala para igualar exactamente la extensión de DESARROLLADOR
    const targetW = canvas.width - 36 // 2012px
    const scaleX = targetW / measuredW
    ctx.scale(scaleX, 1.0)
    // El top se posiciona en el borde superior del canvas (Y = 0 en el shader)
    ctx.fillText('CREATIVO', (canvas.width / 2) / scaleX, 20)
    ctx.restore()
    return
  }

  // === RENDERIZADO DE FASE 1: SALUDO 4 CUADRANTES ===
  if (isTop) {
    ctx.textBaseline = 'alphabetic'
    const posY = canvas.height - 10
    if (text === '¡HEY!') {
      ctx.save()
      ctx.translate(canvas.width - 30, posY - 14)
      ctx.scale(1.58, 1.0)
      ctx.font = '900 248px "Cabinet Grotesk", sans-serif'
      setLetterSpacing(ctx, '-0.035em')
      ctx.textAlign = 'right'

      const heyWidth = ctx.measureText('HEY!').width
      ctx.fillText('HEY!', 0, 0)
      ctx.fillText('¡', -heyWidth - 4, -8)
      ctx.restore()
    } else {
      // 'HOLA' -> 'HOL' base con la 'A' estilizada e inclinada hacia la derecha en su palito exterior
      ctx.save()
      ctx.translate(30, posY)
      ctx.scale(1.49, 1.0)
      ctx.font = '900 248px "Cabinet Grotesk", sans-serif'
      setLetterSpacing(ctx, '-0.035em')
      ctx.textAlign = 'left'

      const holWidth = ctx.measureText('HOL').width
      ctx.fillText('HOL', 0, 0)

      ctx.save()
      ctx.translate(holWidth - 6, 0)
      ctx.transform(1.10, 0, -0.08, 1.0, 0, 0)
      ctx.fillText('A', 0, 0)
      ctx.restore()

      ctx.restore()
    }
  } else {
    ctx.textBaseline = 'top'
    const posY = 10
    if (text === 'SOY') {
      // 'SOY' -> Calibración milimétrica: estiramiento anamórfico x2.05 y nivelación inferior (posY + 5)
      ctx.save()
      ctx.translate(canvas.width - 30, posY + 5)
      ctx.scale(2.05, 1.0)
      ctx.font = '900 248px "Cabinet Grotesk", sans-serif'
      setLetterSpacing(ctx, '-0.035em')
      ctx.textAlign = 'right'
      ctx.fillText(text, 0, 0)
      ctx.restore()
    } else {
      ctx.save()
      ctx.translate(30, posY)
      ctx.scale(1.03, 1.0)
      ctx.font = '900 248px "Cabinet Grotesk", sans-serif'
      setLetterSpacing(ctx, '-0.035em')
      ctx.textAlign = 'left'
      ctx.fillText(text, 0, 0)
      ctx.restore()
    }
  }
}

const createWordCanvas = (
  text: string,
  isTop: boolean,
  align: 'right' | 'left' | 'center',
  isPhase2?: boolean,
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.width = isPhase2 ? 2048 : 1024
  canvas.height = 512
  renderCanvasText(canvas, text, isTop, align)
  return canvas
}

const refreshAllCanvases = () => {
  for (const item of wordInstances) {
    if (item.canvas && item.texture) {
      renderCanvasText(item.canvas, item.text, item.isTop, item.align)
      item.texture.needsUpdate = true
    }
  }
}

// Función de resorte elástico para la entrada rápida con inercia (Jelly Spring)
const jellySpring = (t: number): number => {
  if (t <= 0) return 0
  if (t >= 1) return 1
  const decay = Math.exp(-7.5 * t)
  return 1 - decay * Math.cos(t * 12.0) + decay * 0.35 * Math.sin(t * 12.0)
}

// Deformación física Squash & Stretch durante el vuelo de entrada
const getJellyWobble = (t: number): number => {
  if (t <= 0 || t >= 1) return 0
  return Math.exp(-7.0 * t) * Math.sin(t * 14.0)
}

const initScene = () => {
  if (!shaderContainer.value || isDisposed) return

  // Setup Three.js síncrono e instantáneo (cero lag inicial)
  scene = new THREE.Scene()

  const width = window.innerWidth
  const height = window.innerHeight
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
  camera.position.z = 7.0

  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
    stencil: false,
    depth: false,
  })
  renderer.setSize(width, height)
  renderer.setPixelRatio(getDPR())
  
  if (shaderContainer.value && !isDisposed) {
    shaderContainer.value.appendChild(renderer.domElement)
  } else {
    renderer.dispose()
    return
  }

  group = new THREE.Group()
  scene.add(group)

  const PLANE_GREETING_W = 3.6
  const PLANE_GREETING_H = 1.6

  wordInstances = WORD_CONFIGS.map((cfg) => ({ ...cfg }))

  // Creación de las mallas (Fase 1 y Fase 2)
  for (const item of wordInstances) {
    const isPhase2 = Boolean(item.isPhase2)
    const canvas = createWordCanvas(item.text, item.isTop, item.align, isPhase2)
    const texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.colorSpace = THREE.SRGBColorSpace

    // El punto de fuga central en coordenadas locales de la malla es exactamente (-targetX, -targetY, -3.5)
    const singularityLocal = new THREE.Vector3(-item.targetX, -item.targetY, -3.5)

    const material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: texture },
        uIsPhase2: { value: isPhase2 ? 1.0 : 0.0 },
        uArchStrength: { value: item.archStrength ?? 0.95 }, // Deformación en arco diferenciada
        uWarpStrength: { value: props.warpStrength },
        uIsTop: { value: item.isTop ? 1.0 : -1.0 },
        uSide: { value: item.align === 'right' ? -1.0 : item.align === 'left' ? 1.0 : 0.0 },
        uWingFlare: { value: 0.38 },
        uOpacity: { value: 0.0 },
        uSuction: { value: 0.0 },
        uSingularity: { value: singularityLocal },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
    })

    // Subdivisión de geometría: 128x32 para Fase 2 (curvatura continua sedosa) y 64x24 para Fase 1
    const pW = isPhase2 ? PLANE_ROLE_W : PLANE_GREETING_W
    const pH = isPhase2 ? PLANE_ROLE_H : PLANE_GREETING_H
    const segX = isPhase2 ? 128 : 64
    const segY = isPhase2 ? 32 : 24

    const geometry = new THREE.PlaneGeometry(pW, pH, segX, segY)
    const mesh = new THREE.Mesh(geometry, material)

    mesh.position.set(0, 0, -3.2)
    mesh.scale.set(0, 0, 0)

    group.add(mesh)

    item.mesh = mesh
    item.material = material
    item.geometry = geometry
    item.texture = texture
    item.canvas = canvas
  }

  // Pre-calentamiento del pipeline shader en la GPU
  renderer.compile(scene, camera)
  renderer.render(scene, camera)

  // Carga asíncrona de fuentes en segundo plano
  if (typeof document !== 'undefined' && document.fonts) {
    document.fonts.ready.then(() => {
      if (!isDisposed) {
        refreshAllCanvases()
      }
    })
  }

  // Responsive scale calibrado: Expande de extremo a extremo sin recortar y protege el botón CTA
  const updateResponsiveScale = () => {
    if (!camera || !renderer || !group || isDisposed) return
    const w = window.innerWidth
    const h = window.innerHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)

    const vFovRad = (camera.fov * Math.PI) / 180
    const visibleHeight = 2 * Math.tan(vFovRad / 2) * camera.position.z
    const visibleWidth = visibleHeight * camera.aspect

    // Escala horizontal expansiva que abarca el 98% de la pantalla de lado a lado
    let scale = (visibleWidth * 0.98) / PLANE_ROLE_W

    // Límite vertical de seguridad para asegurar que no recorte arriba y no toque el botón CTA abajo
    const maxAllowedHeight = visibleHeight * 0.74
    const totalRoleHeight = 3.25 * scale
    if (totalRoleHeight > maxAllowedHeight) {
      scale = maxAllowedHeight / 3.25
    }

    group.scale.set(scale, scale, 1)

    // Elevación vertical estratégica
    if (w < 640) {
      group.position.y = 0.35
    } else {
      group.position.y = 0.20
    }
  }

  handleResize = updateResponsiveScale
  updateResponsiveScale()
  window.addEventListener('resize', handleResize)

  localStartTime = performance.now()

  // Render Loop: Entrada con inercia, Reposo 100% estático, Salida por Espaguetificación y Entrada Fase 2 en Arco
  const animate = () => {
    if (isDisposed) return
    rafId = requestAnimationFrame(animate)

    const now = performance.now()
    const baseStart = props.startTime > 0 ? props.startTime : localStartTime
    const elapsed = (now - baseStart) / 1000

    for (const item of wordInstances) {
      if (!item.mesh || !item.material) continue
      const mat = item.material
      const mesh = item.mesh

      let opacity = 0
      let posX = 0
      let posY = 0
      let posZ = 0
      let scaleX = 0
      let scaleY = 0
      let suction = 0

      if (item.isPhase2) {
        // === FASE 2: DESARROLLADOR / CREATIVO ===
        if (elapsed < item.inStart) {
          opacity = 0
          posX = 0
          posY = item.targetY
          posZ = -2.5
          scaleX = 0
          scaleY = 0
        } else if (elapsed >= item.inStart && elapsed < item.inEnd) {
          const rawT = (elapsed - item.inStart) / (item.inEnd - item.inStart)
          const tClamped = Math.min(1, Math.max(0, rawT))
          const eased = jellySpring(tClamped)
          const wobble = getJellyWobble(tClamped)

          opacity = Math.min(1, tClamped * 3.5)
          posX = 0
          posY = item.targetY
          posZ = 0.0
          scaleX = eased * (1.0 + wobble * 0.10)
          scaleY = eased * (1.0 - wobble * 0.10)
        } else {
          opacity = 1.0
          posX = 0
          posY = item.targetY
          posZ = 0.0
          scaleX = 1.0
          scaleY = 1.0
        }
      } else {
        // === FASE 1: THE GREETING ===
        if (elapsed < item.inStart) {
          opacity = 0
          posX = 0
          posY = 0
          posZ = -3.2
          scaleX = 0
          scaleY = 0
          suction = 0
        } else if (elapsed >= item.inStart && elapsed < item.inEnd) {
          // ENTRADA: Proyección elástica con inercia tipo gelatina (overshoot + wobble)
          const rawT = (elapsed - item.inStart) / (item.inEnd - item.inStart)
          const tClamped = Math.min(1, Math.max(0, rawT))
          const eased = jellySpring(tClamped)
          const wobble = getJellyWobble(tClamped)

          opacity = Math.min(1, tClamped * 4.0)
          posX = item.targetX * eased
          posY = item.targetY * eased
          posZ = -3.2 * (1 - Math.min(1, tClamped * 1.6))
          suction = 0

          scaleX = eased * (1.0 + wobble * 0.18)
          scaleY = eased * (1.0 - wobble * 0.18)
        } else if (elapsed >= item.inEnd && elapsed < item.outStart) {
          // ESTADO INTERMEDIO: Totalmente estático, nítido y firme
          opacity = 1.0
          posX = item.targetX
          posY = item.targetY
          posZ = 0.0
          scaleX = 1.0
          scaleY = 1.0
          suction = 0
        } else if (elapsed >= item.outStart && elapsed < item.outEnd) {
          // SALIDA: Absorción gravitacional con Espaguetificación progresiva en el Shader
          const rawT = (elapsed - item.outStart) / (item.outEnd - item.outStart)
          const tClamped = Math.min(1, Math.max(0, rawT))

          opacity = 1.0
          posX = item.targetX
          posY = item.targetY
          posZ = 0.0
          scaleX = 1.0
          scaleY = 1.0
          suction = tClamped
        } else {
          opacity = 0
          posX = 0
          posY = 0
          posZ = -3.5
          scaleX = 0
          scaleY = 0
          suction = 1.0
        }
      }

      mat.uniforms.uOpacity!.value = opacity
      mat.uniforms.uSuction!.value = suction

      mesh.position.set(posX, posY, posZ)
      mesh.scale.set(scaleX, scaleY, 1)
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera)
    }
  }

  animate()
}

const disposeScene = () => {
  isDisposed = true
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
  if (handleResize) {
    window.removeEventListener('resize', handleResize)
    handleResize = null
  }
  if (group) {
    for (const item of wordInstances) {
      if (item.mesh) {
        group.remove(item.mesh)
      }
      if (item.geometry) {
        item.geometry.dispose()
      }
      if (item.material) {
        item.material.dispose()
      }
      if (item.texture) {
        item.texture.dispose()
      }
    }
  }
  wordInstances = []
  if (renderer) {
    renderer.dispose()
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
    renderer = null
  }
  scene = null
  camera = null
  group = null
}

onMounted(() => {
  if (typeof window !== 'undefined' && props.active && !renderer) {
    initScene()
  }
})

onBeforeUnmount(() => {
  disposeScene()
})

watch(
  () => props.active,
  (active) => {
    if (active) {
      if (!renderer) {
        isDisposed = false
        initScene()
      }
    } else {
      disposeScene()
    }
  },
)
</script>

<style scoped>
.greeting-shader {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}
</style>
