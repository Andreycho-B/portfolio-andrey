<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ConstellationGrid from './ConstellationGrid.vue'
import GreetingShader from './GreetingShader.vue'
import type { CavityPulse, ExclusionRect } from './ConstellationGrid.vue'

const props = withDefaults(
  defineProps<{
    active?: boolean
  }>(),
  { active: true },
)

const emit = defineEmits<{
  (e: 'enter', soundEnabled?: boolean): void
  (e: 'cavity-pulse', pulse: CavityPulse): void
}>()

// Constantes matemáticas de física y tiempos
const ZETA = 0.65
const OMEGA = 14.0
const OMEGA_D = OMEGA * Math.sqrt(1 - ZETA * ZETA) // ~10.639 rad/s

const CIPHER_SYMBOLS = ['#', '!', '?', '<', '>', '/', '_', '{', '}', '%', '*', '0', '1', '&', '@', '$', '[', ']']

const TARGET_TIER_1 = 'desarrollador'
const TARGET_TIER_2 = 'de'
const TARGET_TIER_3 = 'software'

// Constantes de diseño y geometría tipográfica
const SEAM_GAP = 6 // Hendidura horizontal ultra-fina entre ambas palabras
const SEAM_MID_Y = 350
const Y_SEAM_1 = SEAM_MID_Y - SEAM_GAP / 2 // 347px (base plana superior)
const Y_SEAM_2 = SEAM_MID_Y + SEAM_GAP / 2 // 353px (techo plano inferior)
const SPAN_WIDTH = 840 // Ancho dominante de póster

const TEXT_1_A = '¡HEY!'
const TEXT_1_B = 'HOLA'
const FULL_TEXT_1 = '¡HEY! HOLA'
const FULL_TEXT_2 = 'SOY ANDREY'

interface GlyphData {
  char: string
  group: 'hey' | 'hola' | 'soy' | 'andrey' | 'space'
  uniformX: number
  warpedX: number
  u: number
  scaleX: number
  scaleY: number
}

const getCharWeight = (char: string): number => {
  if (char === ' ') return 0.26
  if (char === 'I' || char === '!' || char === '¡') return 0.36
  if (char === 'E' || char === 'L' || char === 'F' || char === 'T' || char === 'J') return 0.78
  if (char === 'M' || char === 'W') return 1.3
  return 0.92
}

// Cálculo de posiciones uniformes (centradas y proporcionales) y comprimidas (reloj de arena)
const computeLineGlyphs = (
  text: string,
  isTop: boolean,
): GlyphData[] => {
  const chars = text.split('')
  const weights = chars.map(getCharWeight)
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  const startX = 500 - SPAN_WIDTH / 2
  const widthPerWeight = SPAN_WIDTH / totalWeight

  // Ancho uniforme más estrecho en el centro
  const UNIFORM_SPAN = 640
  const uniformStartX = 500 - UNIFORM_SPAN / 2
  const uniformWidthPerWeight = UNIFORM_SPAN / totalWeight

  let currentWarpedX = startX
  let currentUniformX = uniformStartX
  const result: GlyphData[] = []

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]!
    const wWarped = weights[i]! * widthPerWeight
    const centerWarpedX = currentWarpedX + wWarped / 2
    currentWarpedX += wWarped

    const wUniform = weights[i]! * uniformWidthPerWeight
    const centerUniformX = currentUniformX + wUniform / 2
    currentUniformX += wUniform

    let group: 'hey' | 'hola' | 'soy' | 'andrey' | 'space' = 'space'
    if (char !== ' ') {
      if (isTop) {
        group = i < 5 ? 'hey' : 'hola'
      } else {
        group = i < 3 ? 'soy' : 'andrey'
      }
    }

    const u = (centerWarpedX - 500) / (SPAN_WIDTH / 2) // -1 a +1
    const u2 = u * u
    const uCurve = Math.pow(Math.abs(u), 1.9)

    // Curva de escala para el reloj de arena
    const scaleY = 1.0 + 2.5 * uCurve
    const scaleX = 1.08 + 0.28 * u2

    result.push({
      char,
      group,
      uniformX: centerUniformX,
      warpedX: centerWarpedX,
      u,
      scaleX,
      scaleY,
    })
  }

  return result
}

const line1Glyphs = computeLineGlyphs(FULL_TEXT_1, true)
const line2Glyphs = computeLineGlyphs(FULL_TEXT_2, false)

// Estado reactivo de la máquina de animación
const elapsed = ref(0)
const heyScale = ref(0)
const heyOpacity = ref(0)
const holaScale = ref(0)
const holaOpacity = ref(0)
const soyScale = ref(0)
const soyOpacity = ref(0)

const isGreetingVisible = ref(true)
const greetingScale = ref(1)
const greetingOpacity = ref(1)
const metaOpacity = ref(0)

const isResolutionVisible = ref(false)
const resolutionScale = ref(0)
const resolutionOpacity = ref(1)

const displayedTier1 = ref<string[]>(TARGET_TIER_1.split('').map(() => '#'))
const displayedTier2 = ref<string[]>(TARGET_TIER_2.split('').map(() => '#'))
const displayedTier3 = ref<string[]>(TARGET_TIER_3.split('').map(() => '#'))

const tier1Skews = ref<number[]>(new Array(TARGET_TIER_1.length).fill(0))
const tier2Skews = ref<number[]>(new Array(TARGET_TIER_2.length).fill(0))
const tier3Skews = ref<number[]>(new Array(TARGET_TIER_3.length).fill(0))

const ctaOpacity = ref(1)
const ctaTranslateY = ref(0)
const ctaInteractable = ref(true)

const cavityPulseData = ref<CavityPulse | null>(null)

const ctaSecondaryRef = ref<HTMLElement | null>(null)
const ctaExclusion = ref<ExclusionRect | null>(null)

const updateCtaExclusion = () => {
  const el = ctaSecondaryRef.value
  if (!el) {
    ctaExclusion.value = null
    return
  }
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) {
    ctaExclusion.value = null
    return
  }
  ctaExclusion.value = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    w: rect.width,
    h: rect.height,
  }
}

let rafId = 0
let startTime = 0
let isRunning = false
let suppressClick = false

// Función de resorte amortiguado: f(t) = 1 - exp(-zeta * omega * t) * cos(omega_d * t)
const calculateSpring = (t: number): number => {
  if (t <= 0) return 0
  return 1 - Math.exp(-ZETA * OMEGA * t) * Math.cos(OMEGA_D * t)
}

const getRandomSymbol = (): string => {
  const idx = Math.floor(Math.random() * CIPHER_SYMBOLS.length)
  return CIPHER_SYMBOLS[idx] ?? '#'
}

// Generador de clipPath continuo para la curva superior de reloj de arena
const topClipD = computed(() => {
  const steps = 32
  const startX = 500 - SPAN_WIDTH / 2 - 10
  const endX = 500 + SPAN_WIDTH / 2 + 10
  let d = `M ${startX.toFixed(1)} ${Y_SEAM_1}`
  for (let i = 0; i <= steps; i++) {
    const x = startX + (i / steps) * (SPAN_WIDTH + 20)
    const u = (x - 500) / (SPAN_WIDTH / 2)
    const uCurve = Math.pow(Math.min(1, Math.abs(u)), 1.9)
    const h = 80 + 210 * uCurve
    const y = Y_SEAM_1 - h
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`
  }
  d += ` L ${endX.toFixed(1)} ${Y_SEAM_1} Z`
  return d
})

// Generador de clipPath continuo para la curva inferior de reloj de arena
const bottomClipD = computed(() => {
  const steps = 32
  const startX = 500 - SPAN_WIDTH / 2 - 10
  const endX = 500 + SPAN_WIDTH / 2 + 10
  let d = `M ${startX.toFixed(1)} ${Y_SEAM_2}`
  for (let i = 0; i <= steps; i++) {
    const x = startX + (i / steps) * (SPAN_WIDTH + 20)
    const u = (x - 500) / (SPAN_WIDTH / 2)
    const uCurve = Math.pow(Math.min(1, Math.abs(u)), 1.9)
    const h = 80 + 210 * uCurve
    const y = Y_SEAM_2 + h
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`
  }
  d += ` L ${endX.toFixed(1)} ${Y_SEAM_2} Z`
  return d
})

// Posiciones y transformaciones de los glifos (cada palabra aparece ya deformada en su posición)
const computedLine1 = computed(() => {
  return line1Glyphs.map((g) => {
    let opacity = 0
    let scale = 1

    if (g.group === 'hey') {
      opacity = heyOpacity.value
      scale = heyScale.value
    } else if (g.group === 'hola') {
      opacity = holaOpacity.value
      scale = holaScale.value
    }

    return {
      char: g.char,
      x: g.warpedX,
      scaleX: g.scaleX * scale,
      scaleY: g.scaleY * scale,
      opacity,
    }
  })
})

const computedLine2 = computed(() => {
  return line2Glyphs.map((g) => {
    const opacity = soyOpacity.value
    const scale = soyScale.value

    return {
      char: g.char,
      x: g.warpedX,
      scaleX: g.scaleX * scale,
      scaleY: g.scaleY * scale,
      opacity,
    }
  })
})

const triggerCavityPulse = () => {
  const pulse: CavityPulse = {
    time: performance.now(),
    strength: 950,
  }
  cavityPulseData.value = pulse
  emit('cavity-pulse', pulse)
}

const updateAnimation = (now: number) => {
  if (!startTime) startTime = now
  const t = (now - startTime) / 1000
  elapsed.value = t

  // [FASE 1: THE GREETING — ENTRADAS SECUENCIALES DEFORMADAS]
  if (t < 6.0) {
    isGreetingVisible.value = true
    isResolutionVisible.value = false
    greetingOpacity.value = 1
    greetingScale.value = 1

    // Acto 1: 0.0s - 1.2s -> "¡HEY!" entra con resorte ya deformado en el ala izquierda
    if (t < 1.2) {
      heyOpacity.value = Math.min(1, t / 0.18)
      heyScale.value = Math.max(0, calculateSpring(t))
      holaOpacity.value = 0
      holaScale.value = 0
      soyOpacity.value = 0
      soyScale.value = 0
      metaOpacity.value = 0
    }
    // Acto 2: 1.2s - 2.4s -> "HOLA" entra con resorte ya deformado en el ala derecha
    else if (t >= 1.2 && t < 2.4) {
      const t2 = t - 1.2
      heyOpacity.value = 1
      heyScale.value = 1
      holaOpacity.value = Math.min(1, t2 / 0.18)
      holaScale.value = Math.max(0, calculateSpring(t2))
      soyOpacity.value = 0
      soyScale.value = 0
      metaOpacity.value = 0
    }
    // Acto 3: 2.4s - 4.2s -> "SOY ANDREY" entra con resorte ya deformado en la base
    else if (t >= 2.4 && t < 4.2) {
      const t3 = t - 2.4
      heyOpacity.value = 1
      heyScale.value = 1
      holaOpacity.value = 1
      holaScale.value = 1
      soyOpacity.value = Math.min(1, t3 / 0.18)
      soyScale.value = Math.max(0, calculateSpring(t3))
      metaOpacity.value = Math.min(1, Math.max(0, (t - 3.4) / 0.6))
    }
    // Acto 4: 4.2s - 6.0s -> Fijación completa y contemplación de la silueta reloj de arena
    else {
      heyOpacity.value = 1
      heyScale.value = 1
      holaOpacity.value = 1
      holaScale.value = 1
      soyOpacity.value = 1
      soyScale.value = 1
      metaOpacity.value = 1
    }
  }
  // [FASE 1 -> 2: 6.0s - 6.4s] — CONTRACCIÓN ESPEJO HACIA LA SINGULARIDAD
  else if (t >= 6.0 && t < 6.4) {
    isGreetingVisible.value = true
    isResolutionVisible.value = false
    const snapT = (t - 6.0) / 0.4 // 0 -> 1
    const invSnap = Math.max(0, 1 - snapT)
    greetingScale.value = invSnap * invSnap * (1 + 0.2 * Math.sin(Math.PI * snapT))
    greetingOpacity.value = Math.max(0, 1 - snapT * snapT)
  } else {
    isGreetingVisible.value = false
    greetingOpacity.value = 0
    greetingScale.value = 0
  }

  // [FASE 2: 6.4s - Inf] — 3-TIER SCRAMBLE, RESOLUCIÓN "DESARROLLADOR DE SOFTWARE" & SLANT
  if (t >= 6.4) {
    isResolutionVisible.value = true
    const resT = t - 6.4

    // Pop-in elástico
    if (resT < 0.6) {
      resolutionScale.value = Math.max(0, calculateSpring(resT))
      resolutionOpacity.value = Math.min(1, resT / 0.15)
    } else {
      resolutionScale.value = 1
      resolutionOpacity.value = 1
    }

    // Mutación y resolución progresiva de glifos (7.0s - 8.2s)
    // Tier 1: DESARROLLADOR
    for (let i = 0; i < TARGET_TIER_1.length; i++) {
      const lockTime = 7.0 + (i / TARGET_TIER_1.length) * 0.45
      if (t >= lockTime) {
        displayedTier1.value[i] = TARGET_TIER_1[i]!
      } else {
        displayedTier1.value[i] = getRandomSymbol()
      }
    }

    // Tier 2: DE
    for (let i = 0; i < TARGET_TIER_2.length; i++) {
      const lockTime = 7.35 + (i / TARGET_TIER_2.length) * 0.2
      if (t >= lockTime) {
        displayedTier2.value[i] = TARGET_TIER_2[i]!
      } else {
        displayedTier2.value[i] = getRandomSymbol()
      }
    }

    // Tier 3: SOFTWARE
    for (let i = 0; i < TARGET_TIER_3.length; i++) {
      const lockTime = 7.5 + (i / TARGET_TIER_3.length) * 0.5
      if (t >= lockTime) {
        displayedTier3.value[i] = TARGET_TIER_3[i]!
      } else {
        displayedTier3.value[i] = getRandomSymbol()
      }
    }

    // [8.2s - Inf] : Kinetic Slant & Breathing Loop
    for (let i = 0; i < TARGET_TIER_1.length; i++) {
      tier1Skews.value[i] = Math.sin(t * 2.5 + i * 0.28) * 5.0
    }
    for (let i = 0; i < TARGET_TIER_2.length; i++) {
      tier2Skews.value[i] = Math.sin(t * 2.5 + (i + 13) * 0.28) * 5.0
    }
    for (let i = 0; i < TARGET_TIER_3.length; i++) {
      tier3Skews.value[i] = Math.sin(t * 2.5 + (i + 15) * 0.28) * 5.0
    }
  }

  // Botones CTA interactivos y visibles
  ctaOpacity.value = 1
  ctaTranslateY.value = 0
  ctaInteractable.value = true

  if (isRunning) {
    rafId = requestAnimationFrame(updateAnimation)
  }
}

const startAnimation = () => {
  if (isRunning) return
  isRunning = true
  startTime = performance.now()
  triggerCavityPulse()
  rafId = requestAnimationFrame(updateAnimation)
}

const stopAnimation = () => {
  isRunning = false
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
}

const onPointerUp = (soundEnabled = true) => {
  suppressClick = true
  emit('enter', soundEnabled)
}

const onClick = (soundEnabled = true) => {
  if (suppressClick) {
    suppressClick = false
    return
  }
  emit('enter', soundEnabled)
}

let ctaResizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (typeof window !== 'undefined') {
    startAnimation()
    // medir CTA tras layout para el fade de constelación (opción B)
    requestAnimationFrame(() => {
      updateCtaExclusion()
      requestAnimationFrame(updateCtaExclusion)
    })
    window.addEventListener('resize', updateCtaExclusion)
    if (typeof ResizeObserver !== 'undefined' && ctaSecondaryRef.value) {
      ctaResizeObserver = new ResizeObserver(updateCtaExclusion)
      ctaResizeObserver.observe(ctaSecondaryRef.value)
    }
  }
})

watch(
  () => props.active,
  (active) => {
    if (active) {
      startTime = performance.now()
      startAnimation()
      requestAnimationFrame(updateCtaExclusion)
    } else {
      stopAnimation()
    }
  },
)

onBeforeUnmount(() => {
  stopAnimation()
  window.removeEventListener('resize', updateCtaExclusion)
  if (ctaResizeObserver) {
    ctaResizeObserver.disconnect()
    ctaResizeObserver = null
  }
})
</script>

<template>
  <section class="intro-gate">
    <ConstellationGrid :active="active" :pulse="cavityPulseData" :exclusion="ctaExclusion" />

    <div class="intro-gate__kinetic-stage" aria-live="polite">
      <!-- FASE 1: THE GREETING (WebGL Extreme Culture Hourglass Shader + Fluid Melt) -->
      <div
        v-if="isGreetingVisible"
        class="greeting-stage-wrapper"
        :style="{
          transform: `scale(${greetingScale})`,
          opacity: greetingOpacity,
        }"
      >
        <!-- Meta superior: 25—28.11 -->
        <span class="extreme-meta extreme-meta--top" :style="{ opacity: metaOpacity }">
          25—28.11
        </span>

        <!-- Componente WebGL ShaderMaterial con Three.js puro -->
        <GreetingShader :auto-play="true" :warp-strength="0.88" />

        <!-- Meta inferior: 2026 -->
        <span class="extreme-meta extreme-meta--bottom" :style="{ opacity: metaOpacity }">
          2026
        </span>
      </div>

      <!-- FASE 2: THE 3-TIER RESOLUTION ("DESARROLLADOR DE SOFTWARE") -->
      <div
        v-if="isResolutionVisible"
        class="kinetic-resolution"
        :style="{
          transform: `scale(${resolutionScale}) skewY(-4deg)`,
          opacity: resolutionOpacity,
        }"
      >
        <div class="tier tier-1">
          <span class="font-display tier-text black-text">{{ displayedTier1.join('') }}</span>
        </div>
        <div class="tier tier-2">
          <span class="font-display tier-text box-text">{{ displayedTier2.join('') }}</span>
        </div>
        <div class="tier tier-3">
          <span class="font-display tier-text red-text">{{ displayedTier3.join('') }}</span>
        </div>
      </div>
    </div>

    <!-- SECCIÓN CTA (Posicionado a Y ≈ 78%-85%) -->
    <div
      class="intro-gate__cta-container"
      :style="{
        opacity: ctaOpacity,
        transform: `translate(-50%, calc(-50% + ${ctaTranslateY}px))`,
        pointerEvents: ctaInteractable ? 'auto' : 'none',
      }"
    >
      <!-- CTA Principal (Pill) -->
      <button
        class="cta-pill"
        type="button"
        @click="onClick(true)"
        @pointerup="onPointerUp(true)"
        @pointercancel="onPointerUp(true)"
      >
        ingresar con sonido
      </button>

      <!-- CTA Secundario (Texto con subrayado) -->
      <button
        ref="ctaSecondaryRef"
        class="cta-secondary"
        type="button"
        @click="onClick(false)"
        @pointerup="onPointerUp(false)"
        @pointercancel="onPointerUp(false)"
      >
        ingresar sin sonido
      </button>
    </div>
  </section>
</template>

<style scoped>
@import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,900&display=swap');

.font-display {
  font-family: 'Cabinet Grotesk', sans-serif !important;
  font-weight: 900 !important;
}

@font-face {
  font-family: 'Cabinet Grotesk';
  src: url('/fonts/CabinetGrotesk-800.woff2') format('woff2');
  font-weight: 800;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Cabinet Grotesk';
  src: url('/fonts/CabinetGrotesk-900.woff2') format('woff2');
  font-weight: 900;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Space Grotesk Variable';
  src: url('/fonts/space-grotesk-variable.woff2') format('woff2');
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
}

.intro-gate {
  position: fixed;
  inset: 0;
  z-index: 10;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  opacity: 1;
  transform: scale(1);
  transition:
    opacity 1.8s cubic-bezier(0.22, 1, 0.36, 1),
    transform 1.8s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: auto;
  user-select: none;
  -webkit-user-select: none;
}

.intro-gate--hidden {
  opacity: 0;
  transform: scale(0.98);
  pointer-events: none;
  visibility: hidden;
  transition:
    opacity 1.8s cubic-bezier(0.64, 0, 0.78, 0),
    transform 1.8s cubic-bezier(0.64, 0, 0.78, 0),
    visibility 0s linear 1.9s;
}

.intro-gate--hidden :deep(.constellation-grid),
.intro-gate--hidden :deep(.constellation-lines) {
  opacity: 0;
  transition: opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.intro-gate__kinetic-stage {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  padding: clamp(1rem, 4vw, 3rem);
  box-sizing: border-box;
}

/* WEBGL GREETING STAGE */
.greeting-stage-wrapper {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  will-change: transform, opacity;
}

.extreme-meta {
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 700;
  font-size: clamp(14px, 1.8vw, 20px);
  letter-spacing: 0.28em;
  color: #FF1818;
  user-select: none;
  transition: opacity 0.4s ease;
}

.extreme-meta--top {
  position: absolute;
  top: clamp(8%, 14vh, 18%);
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
}

.extreme-meta--bottom {
  position: absolute;
  bottom: clamp(18%, 22vh, 26%);
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
}

.extreme-glyph {
  font-family: 'Cabinet Grotesk', sans-serif !important;
  font-weight: 900 !important;
  font-size: 110px;
  fill: #F72119;
  user-select: none;
}

/* THE WAG ASYMMETRIC 3-TIER LAYOUT */
.kinetic-resolution {
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: skewY(-4deg); /* Global base slant */
}

.tier {
  display: flex;
  justify-content: center;
  line-height: 0.85;
}

/* Tier 1: Left bias */
.tier-1 { transform: translateX(-5%) skewX(-6deg); z-index: 2; }
.black-text { color: #15131a; font-size: clamp(3rem, 10vw, 7rem); letter-spacing: -0.02em; }

/* Tier 2: The Wedge */
.tier-2 { transform: translateX(15%) translateY(-10%) skewX(4deg) rotate(2deg); z-index: 3; }
.box-text { 
  background: #15131a; 
  color: #ffffff; 
  padding: 0.1em 0.3em; 
  font-size: clamp(2rem, 6vw, 4.5rem); 
}

/* Tier 3: Right bias, Massive */
.tier-3 { transform: translateX(5%) translateY(-15%) skewX(-8deg); z-index: 1; }
.red-text { color: #FF2200; font-size: clamp(3.5rem, 12vw, 8.5rem); letter-spacing: -0.04em; }

/* DUAL CTA (Posicionado debajo del bloque principal a Y ≈ 84%) */
.intro-gate__cta-container {
  position: absolute;
  top: 88%;
  left: 50%;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: auto;
  will-change: transform, opacity;
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.cta-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 700;
  font-size: 0.8125rem;
  letter-spacing: 0.22em;
  color: #15131a;
  background-color: #ffffff;
  border: 1.5px solid #15131a;
  border-radius: 9999px;
  padding: 0.75rem 1.6rem 0.75rem calc(1.6rem + 0.11em);
  min-height: 44px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  transition:
    background-color 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    color 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.cta-secondary {
  position: relative;
  margin-top: 16px;
  background: none;
  border: none;
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 400;
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  color: #71717a;
  padding: 0.4rem 0.8rem;
  min-height: 32px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  transition: color 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.cta-secondary::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 4px;
  width: 0;
  height: 1px;
  background: currentColor;
  border-radius: 9999px;
  transform: translateX(-50%);
  transition: width 0.55s linear;
  will-change: width;
  pointer-events: none;
}

@media (hover: hover) {
  .cta-pill:hover {
    background-color: #15131a;
    color: #ffffff;
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(21, 19, 26, 0.12);
  }

  .cta-pill:active {
    transform: translateY(1px);
  }

  .cta-secondary:hover,
  .cta-secondary:focus-visible {
    color: #15131a;
  }
}

.cta-secondary:hover::after,
.cta-secondary:focus-visible::after {
  width: calc(100% - 1.6rem);
}

.cta-pill:focus-visible {
  box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.4);
}

.cta-secondary:focus-visible {
  color: #15131a;
  outline: 2px auto #0066ff;
}

.cta-secondary:active {
  color: #15131a;
}

.cta-secondary:active::after {
  width: calc(100% - 1.6rem);
}

@media (prefers-reduced-motion: reduce) {
  .cta-secondary::after {
    transition: none;
  }
}

/* RESPONSIVE BREAKPOINTS (Mobile 320px - 430px) */
@media (max-width: 640px) {
  .kinetic-resolution {
    margin-top: -4vh;
  }

  .intro-gate__cta-container {
    top: 79%;
    width: 90vw;
  }

  .cta-pill {
    padding: 0.85rem 1.4rem 0.85rem calc(1.4rem + 0.11em);
    width: 100%;
    max-width: 250px;
  }
}
</style>