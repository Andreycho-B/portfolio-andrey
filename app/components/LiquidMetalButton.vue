<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    label?: string
    viewMode?: 'text' | 'icon'
    ariaLabel?: string
    hovered?: boolean
    active?: boolean
  }>(),
  {
    label: 'ingresar con sonido',
    viewMode: 'text',
    ariaLabel: '',
    hovered: false,
    active: true,
  },
)

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
  (e: 'pointerup', event: PointerEvent): void
  (e: 'hover-change', isHovered: boolean): void
}>()

interface Ripple {
  x: number
  y: number
  id: number
}

interface LetterMeta {
  char: string
  idx: number
  centerDist: number
}

interface ShaderMountInstance {
  setSpeed?: (speed: number) => void
  dispose?: () => void
}

const shaderContainerRef = ref<HTMLDivElement | null>(null)
const buttonRef = ref<HTMLButtonElement | null>(null)
const isLocalHovered = ref(false)
const isPressed = ref(false)
const ripples = ref<Ripple[]>([])

let shaderMountInstance: ShaderMountInstance | null = null
let rippleIdCounter = 0
let suppressClick = false
let isDisposed = false
const activeTimeouts: number[] = []

const effectiveHovered = computed(() => isLocalHovered.value || props.hovered)

const lettersWithMeta = computed<LetterMeta[]>(() => {
  const chars = (props.label || '').split('')
  const total = chars.length
  const center = (total - 1) / 2
  return chars.map((char, idx) => ({
    char,
    idx,
    centerDist: Math.abs(idx - center),
  }))
})

const computedAriaLabel = computed(() => {
  if (props.ariaLabel) return props.ariaLabel
  return props.viewMode === 'icon' ? 'sonido' : props.label
})

const addTimeout = (fn: () => void, delay: number) => {
  const id = window.setTimeout(() => {
    const idx = activeTimeouts.indexOf(id)
    if (idx !== -1) activeTimeouts.splice(idx, 1)
    fn()
  }, delay)
  activeTimeouts.push(id)
  return id
}

const clearAllTimeouts = () => {
  for (const id of activeTimeouts) {
    window.clearTimeout(id)
  }
  activeTimeouts.length = 0
}

const initShader = async () => {
  if (typeof window === 'undefined' || !shaderContainerRef.value || shaderMountInstance || isDisposed || !props.active) return

  try {
    const { liquidMetalFragmentShader, ShaderMount } = await import('@paper-design/shaders')
    if (!shaderContainerRef.value || isDisposed || !props.active) return

    shaderMountInstance = new ShaderMount(
      shaderContainerRef.value,
      liquidMetalFragmentShader,
      {
        u_repetition: 4,
        u_softness: 0.5,
        u_shiftRed: 0.3,
        u_shiftBlue: 0.3,
        u_distortion: 0,
        u_contour: 0,
        u_angle: 45,
        u_scale: 8,
        u_shape: props.viewMode === 'icon' ? 1 : 0,
        u_offsetX: 0,
        u_offsetY: 0,
      },
      undefined,
      props.active ? (effectiveHovered.value ? 1.0 : 0.6) : 0,
      undefined,
      1.5, // minPixelRatio optimizado
      150000, // maxPixelCount clampado
    ) as ShaderMountInstance
  } catch (err) {
    console.error('[LiquidMetalButton] Shader error:', err)
  }
}

const destroyShader = () => {
  isDisposed = true
  clearAllTimeouts()
  if (shaderMountInstance) {
    if (typeof shaderMountInstance.dispose === 'function') {
      shaderMountInstance.dispose()
    }
    shaderMountInstance = null
  }
}

const handleMouseEnter = () => {
  isLocalHovered.value = true
  emit('hover-change', true)
}

const handleMouseLeave = () => {
  isLocalHovered.value = false
  isPressed.value = false
  emit('hover-change', false)
}

const handlePointerDown = (e: PointerEvent) => {
  if (e.button !== 0) return
  isPressed.value = true
}

const handlePointerUp = (e: PointerEvent) => {
  if (e.button !== 0) return
  isPressed.value = false
  suppressClick = true
  emit('pointerup', e)
}

const handleClick = (e: MouseEvent) => {
  if (shaderMountInstance?.setSpeed && props.active) {
    shaderMountInstance.setSpeed(2.4)
    addTimeout(() => {
      if (effectiveHovered.value && props.active) {
        shaderMountInstance?.setSpeed?.(1.0)
      } else if (props.active) {
        shaderMountInstance?.setSpeed?.(0.6)
      }
    }, 300)
  }

  if (buttonRef.value) {
    const rect = buttonRef.value.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const ripple: Ripple = { x, y, id: ++rippleIdCounter }
    ripples.value.push(ripple)
    addTimeout(() => {
      ripples.value = ripples.value.filter((r) => r.id !== ripple.id)
    }, 600)
  }

  if (suppressClick) {
    suppressClick = false
    return
  }
  emit('click', e)
}

onMounted(() => {
  nextTick(() => {
    if (props.active) {
      initShader()
    }
  })
})

watch(effectiveHovered, (hovered) => {
  if (props.active && shaderMountInstance) {
    shaderMountInstance.setSpeed?.(hovered ? 1.0 : 0.6)
  }
})

watch(
  () => props.active,
  (active) => {
    if (active) {
      suppressClick = false
      if (!shaderMountInstance) {
        initShader()
      } else {
        shaderMountInstance.setSpeed?.(effectiveHovered.value ? 1.0 : 0.6)
      }
    } else {
      // Cuando el gate no está activo, apaga el rAF completamente (0% GPU/CPU)
      shaderMountInstance?.setSpeed?.(0)
    }
  },
)

onBeforeUnmount(() => {
  destroyShader()
})
</script>

<template>
  <div class="liquid-metal-wrapper">
    <div class="liquid-metal-perspective">
      <div
        class="liquid-metal-root"
        :class="{
          'liquid-metal-root--icon': viewMode === 'icon',
          'liquid-metal-root--pressed': isPressed,
          'liquid-metal-root--hovered': effectiveHovered,
        }"
      >
        <!-- CAPA 1: WebGL Liquid Metal Shader (Efecto Mercurio Líquido en el Borde) -->
        <div class="liquid-metal-shader-layer">
          <div class="liquid-metal-shader-glow">
            <div ref="shaderContainerRef" class="liquid-metal-shader-canvas" />
          </div>
        </div>

        <!-- CAPA 2: Núcleo interior Blanco Cerámico / Platino -->
        <div class="liquid-metal-core-layer">
          <div
            class="liquid-metal-core-fill"
            :class="{ 'liquid-metal-core-fill--icon': viewMode === 'icon' }"
          />
        </div>

        <!-- CAPA 3: Kinetic Rolling Split Text o Icono con elevación 3D -->
        <div class="liquid-metal-label-layer">
          <template v-if="viewMode === 'icon'">
            <!-- Icono de altavoz cinético en Negro Obsidiana -->
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="liquid-metal-icon"
              :class="{ 'liquid-metal-icon--active': effectiveHovered }"
            >
              <polygon points="10 6 6 9 2 9 2 15 6 15 10 18 10 6" />
              <path class="sound-wave sound-wave--inner" d="M14 9.5a3.5 3.5 0 0 1 0 5" />
              <path class="sound-wave sound-wave--outer" d="M17.5 7a7 7 0 0 1 0 10" />
            </svg>
          </template>

          <template v-else>
            <!-- Kinetic Rolling Split Text (Onda Simétrica Centro -> Extremos) -->
            <div class="roll-text" aria-hidden="true">
              <span
                v-for="item in lettersWithMeta"
                :key="item.idx"
                class="roll-cell"
                :style="{ '--center-dist': item.centerDist }"
              >
                <span
                  class="roll-track"
                  :class="{ 'roll-track--active': effectiveHovered }"
                >
                  <span class="roll-char roll-char--top">{{ item.char === ' ' ? '\u00A0' : item.char }}</span>
                  <span class="roll-char roll-char--bottom">{{ item.char === ' ' ? '\u00A0' : item.char }}</span>
                </span>
              </span>
            </div>
            <span class="sr-only">{{ label }}</span>
          </template>
        </div>

        <!-- CAPA 4: Botón interactivo con ondas de choque (Ripple) -->
        <button
          ref="buttonRef"
          type="button"
          class="liquid-metal-interactive"
          :aria-label="computedAriaLabel"
          @click="handleClick"
          @pointerdown="handlePointerDown"
          @pointerup="handlePointerUp"
          @mouseenter="handleMouseEnter"
          @mouseleave="handleMouseLeave"
        >
          <span
            v-for="ripple in ripples"
            :key="ripple.id"
            class="liquid-metal-ripple"
            :style="{ left: `${ripple.x}px`, top: `${ripple.y}px` }"
          />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.liquid-metal-wrapper {
  position: relative;
  display: inline-block;
  user-select: none;
  -webkit-user-select: none;
  contain: layout style;
}

.liquid-metal-perspective {
  perspective: 1000px;
  perspective-origin: 50% 50%;
}

.liquid-metal-root {
  position: relative;
  width: 232px;
  height: 44px;
  transform-style: preserve-3d;
}

/* Modo Icono Circular */
.liquid-metal-root--icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
}

/* Capa 1: Shader de Metal Líquido */
.liquid-metal-shader-layer {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: translateZ(0px);
  z-index: 10;
}

.liquid-metal-shader-glow {
  width: 100%;
  height: 100%;
  border-radius: 9999px;
  box-shadow:
    0px 0px 0px 1px rgba(21, 19, 26, 0.35),
    0px 6px 14px -4px rgba(21, 19, 26, 0.05),
    0px 2px 4px rgba(21, 19, 26, 0.02);
  background: transparent;
}

.liquid-metal-shader-canvas {
  width: 100%;
  height: 100%;
  border-radius: 9999px;
  overflow: hidden;
  position: relative;
}

:deep(.liquid-metal-shader-canvas canvas) {
  width: 100% !important;
  height: 100% !important;
  display: block !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  border-radius: 9999px !important;
}

/* Capa 2: Núcleo interior Blanco Cerámico */
.liquid-metal-core-layer {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: translateZ(10px);
  z-index: 20;
  pointer-events: none;
}

.liquid-metal-core-fill {
  position: absolute;
  inset: 1.5px 2.45px;
  border-radius: 9999px;
  background: linear-gradient(180deg, #ffffff 0%, #f7f7f9 100%);
  border: 1px solid rgba(21, 19, 26, 0.35);
  box-shadow:
    inset 0px 1px 1px rgba(255, 255, 255, 0.9),
    0px 1px 2px rgba(21, 19, 26, 0.03);
}

.liquid-metal-core-fill--icon {
  inset: 1.5px;
  border-radius: 50%;
}

.liquid-metal-root--pressed .liquid-metal-core-fill {
  background: #f0f0f2;
  box-shadow:
    inset 0px 2px 4px rgba(21, 19, 26, 0.1),
    inset 0px 1px 2px rgba(21, 19, 26, 0.06);
}

/* Capa 3: Kinetic Rolling Split Text o Icono */
.liquid-metal-label-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-style: preserve-3d;
  transform: translateZ(20px);
  z-index: 30;
  pointer-events: none;
}

/* KINETIC ROLLING SPLIT TEXT (Onda Simétrica Centro -> Extremos) */
.roll-text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 18px;
  overflow: hidden;
  padding-left: 0.11em;
}

.roll-cell {
  position: relative;
  display: inline-block;
  height: 18px;
  overflow: hidden;
  vertical-align: middle;
}

.roll-track {
  display: block;
  position: relative;
  height: 18px;
  transform: translateY(0%);
  transition: transform 0.5s cubic-bezier(0.76, 0, 0.24, 1);
  transition-delay: calc(var(--center-dist) * 20ms);
  will-change: transform;
}

.roll-track--active {
  transform: translateY(-100%);
}

.roll-char {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 18px;
  line-height: 18px;
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 700;
  font-size: 0.8125rem;
  letter-spacing: 0.22em;
  white-space: nowrap;
}

.roll-char--top {
  display: flex;
  color: #15131a;
  text-shadow: 0px 1px 0px rgba(255, 255, 255, 0.6);
}

.roll-char--bottom {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  display: flex;
  color: #000000;
  text-shadow: 0px 1px 1px rgba(255, 255, 255, 0.8);
}

/* ICONO DE ALTAVOZ CINÉTICO (Negro Obsidiana sin recorte) */
.liquid-metal-icon {
  color: #15131a;
  stroke: #15131a;
  overflow: visible;
  transition:
    color 0.3s ease,
    stroke 0.3s ease;
}

.sound-wave {
  transform-origin: 10px 12px;
  transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.liquid-metal-icon--active .sound-wave--inner {
  transform: translateX(1px) scale(1.06);
}

.liquid-metal-icon--active .sound-wave--outer {
  transform: translateX(2px) scale(1.1);
  transition-delay: 35ms;
}

/* Capa 4: Botón interactivo */
.liquid-metal-interactive {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  outline: none;
  z-index: 40;
  transform-style: preserve-3d;
  transform: translateZ(25px);
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}

.liquid-metal-root--icon .liquid-metal-interactive {
  border-radius: 50%;
}

.liquid-metal-interactive:focus-visible {
  box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.5);
}

/* Screen reader utility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Animación de Ondas (Ripples) */
.liquid-metal-ripple {
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 102, 255, 0.3) 0%, rgba(21, 19, 26, 0.12) 45%, rgba(21, 19, 26, 0) 70%);
  pointer-events: none;
  transform: translate(-50%, -50%);
  animation: liquidMetalRipple 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes liquidMetalRipple {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 0.9;
  }
  100% {
    transform: translate(-50%, -50%) scale(8);
    opacity: 0;
  }
}

/* Micro-hundimiento al presionar (click) */
.liquid-metal-root--pressed .liquid-metal-shader-layer,
.liquid-metal-root--pressed .liquid-metal-core-layer,
.liquid-metal-root--pressed .liquid-metal-label-layer {
  transform: translateY(1px) scale(0.98);
}

/* Responsive móvil */
@media (max-width: 640px) {
  .liquid-metal-root:not(.liquid-metal-root--icon) {
    width: min(232px, 85vw);
    height: 44px;
  }
}
</style>
