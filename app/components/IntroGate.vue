<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ConstellationGrid from './ConstellationGrid.vue'
import GreetingShader from './GreetingShader.vue'
import LiquidMetalButton from './LiquidMetalButton.vue'
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

// Estado de pulsos de cavidad y exclusión del CTA
const cavityPulseData = ref<CavityPulse | null>(null)

const ctaContainerRef = ref<HTMLElement | null>(null)
const ctaSecondaryRef = ref<HTMLElement | null>(null)
const ctaExclusion = ref<ExclusionRect | null>(null)
const isCtaSoundHovered = ref(false)

const updateCtaExclusion = () => {
  const el = ctaContainerRef.value || ctaSecondaryRef.value
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
    w: rect.width + 16,
    h: rect.height + 8,
  }
}

let rafId = 0
const startTime = ref(0)
let isRunning = false
let suppressClick = false

const triggerCavityPulse = (strength = 950, normX = 0.5, normY = 0.5) => {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1000
  const h = typeof window !== 'undefined' ? window.innerHeight : 800
  const pulse: CavityPulse = {
    x: w * normX,
    y: h * normY,
    time: performance.now(),
    strength,
  }
  cavityPulseData.value = pulse
  emit('cavity-pulse', pulse)
}

let pulsedWord1 = false
let pulsedWord2 = false
let pulsedWord3 = false
let pulsedWord4 = false
let pulsedExit1 = false
let pulsedExit2 = false
let pulsedExit3 = false
let pulsedExitFinal = false

const updateAnimation = (now: number) => {
  if (!startTime.value) startTime.value = now
  const t = (now - startTime.value) / 1000

  // [FASE 1: THE GREETING (0.0s - 3.00s) — Ondas de cavidad viscosas en la constelación]
  if (t < 3.00) {
    if (t >= 0.00 && !pulsedWord1) {
      triggerCavityPulse(900, 0.40, 0.45)
      pulsedWord1 = true
    }
    if (t >= 0.20 && !pulsedWord2) {
      triggerCavityPulse(800, 0.60, 0.45)
      pulsedWord2 = true
    }
    if (t >= 0.40 && !pulsedWord3) {
      triggerCavityPulse(800, 0.38, 0.55)
      pulsedWord3 = true
    }
    if (t >= 0.60 && !pulsedWord4) {
      triggerCavityPulse(900, 0.62, 0.55)
      pulsedWord4 = true
    }
  }
  // [FASE 1 -> SALIDA: 3.00s - 4.08s] — ESPAGUETIFICACIÓN HACIA EL PUNTO DE FUGA CENTRAL
  else if (t >= 3.00 && t < 4.08) {
    if (t >= 3.52 && !pulsedExit1) {
      triggerCavityPulse(700, 0.48, 0.48)
      pulsedExit1 = true
    }
    if (t >= 3.70 && !pulsedExit2) {
      triggerCavityPulse(750, 0.52, 0.48)
      pulsedExit2 = true
    }
    if (t >= 3.88 && !pulsedExit3) {
      triggerCavityPulse(800, 0.48, 0.52)
      pulsedExit3 = true
    }
    if (t >= 4.06 && !pulsedExitFinal) {
      // Onda de choque líquida expansiva en toda la constelación al concluir la absorción
      triggerCavityPulse(1350, 0.50, 0.50)
      pulsedExitFinal = true
    }
  } else if (!pulsedExitFinal) {
    triggerCavityPulse(1350, 0.50, 0.50)
    pulsedExitFinal = true
  }

  if (isRunning) {
    rafId = requestAnimationFrame(updateAnimation)
  }
}

const startAnimation = () => {
  if (isRunning) return
  isRunning = true
  suppressClick = false
  startTime.value = performance.now()
  pulsedWord1 = false
  pulsedWord2 = false
  pulsedWord3 = false
  pulsedWord4 = false
  pulsedExit1 = false
  pulsedExit2 = false
  pulsedExit3 = false
  pulsedExitFinal = false
  rafId = requestAnimationFrame(updateAnimation)
}

const stopAnimation = () => {
  isRunning = false
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
}

const onPointerUp = (e: PointerEvent, soundEnabled = true) => {
  if (e.button !== 0) return
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
    if (props.active) {
      startAnimation()
    }
    // Medir CTA tras layout para el fade de constelación
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
      suppressClick = false
      startTime.value = performance.now()
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
      <!-- WebGL Shader Escénico: Fase 1 (Saludo Reloj de Arena) + Fase 2 (DESARROLLADOR / CREATIVO Deformación de Malla en Arco) -->
      <GreetingShader
        :active="active"
        :start-time="startTime"
        :auto-play="true"
        :warp-strength="0.88"
      />
    </div>

    <!-- SECCIÓN CTA (Posicionado a Y ≈ 78%-88%) -->
    <div ref="ctaContainerRef" class="intro-gate__cta-container">
      <div
        class="intro-gate__cta-row"
        @mouseenter="isCtaSoundHovered = true"
        @mouseleave="isCtaSoundHovered = false"
      >
        <!-- CTA Principal (Liquid Metal Button con Kinetic Rolling Text) -->
        <LiquidMetalButton
          :active="active"
          :hovered="isCtaSoundHovered"
          label="ingresar con sonido"
          @hover-change="isCtaSoundHovered = $event"
          @click="onClick(true)"
          @pointerup="onPointerUp($event, true)"
        />

        <!-- CTA Circular Acompañante con Icono de Altavoz -->
        <LiquidMetalButton
          :active="active"
          :hovered="isCtaSoundHovered"
          view-mode="icon"
          aria-label="activar sonido"
          @hover-change="isCtaSoundHovered = $event"
          @click="onClick(true)"
          @pointerup="onPointerUp($event, true)"
        />
      </div>

      <!-- CTA Secundario (Texto con línea inferior que expande desde el centro) -->
      <button
        ref="ctaSecondaryRef"
        class="cta-secondary"
        type="button"
        @click="onClick(false)"
        @pointerup="onPointerUp($event, false)"
      >
        <span class="cta-secondary__text">ingresar sin sonido</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
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
  box-sizing: border-box;
}

/* DUAL CTA (Posicionado debajo del bloque principal a Y ≈ 84%) */
.intro-gate__cta-container {
  position: absolute;
  top: 88%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: auto;
  pointer-events: auto;
  will-change: transform, opacity;
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.intro-gate__cta-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.cta-secondary {
  position: relative;
  margin-top: 14px;
  background: none;
  border: none;
  padding: 8px 16px;
  min-height: 44px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.cta-secondary__text {
  position: relative;
  display: inline-block;
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 500;
  font-size: 0.8125rem;
  letter-spacing: 0.16em;
  color: #52525b;
  transition: color 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Línea inferior que coincide exactamente con el ancho del texto y abre fluidamente desde el centro al hacer hover/focus */
.cta-secondary__text::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  height: 1px;
  background-color: #15131a;
  transform-origin: center center;
  transform: scaleX(0);
  pointer-events: none;
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.cta-secondary:active .cta-secondary__text {
  color: #15131a;
}

.cta-secondary:active .cta-secondary__text::after {
  transform: scaleX(0.92);
}

.cta-secondary:focus-visible {
  outline: 2px auto #0066ff;
}

.cta-secondary:focus-visible .cta-secondary__text {
  color: #15131a;
}

.cta-secondary:focus-visible .cta-secondary__text::after {
  transform: scaleX(1);
}

@media (hover: hover) {
  .cta-secondary:hover .cta-secondary__text {
    color: #15131a;
  }

  .cta-secondary:hover .cta-secondary__text::after {
    transform: scaleX(1);
  }
}

/* RESPONSIVE BREAKPOINTS (Mobile 320px - 430px) */
@media (max-width: 640px) {
  .intro-gate__cta-container {
    top: 79%;
    width: 90vw;
  }

  .cta-secondary {
    min-height: 44px;
    padding: 10px 16px;
  }
}
</style>