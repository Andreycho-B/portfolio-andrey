<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    label?: string
  }>(),
  {
    label: 'ingresar con sonido',
  },
)

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
  (e: 'pointerup', event: PointerEvent): void
}>()

interface LetterMeta {
  char: string
  idx: number
  centerDist: number
}

const isHovered = ref(false)
const isPressed = ref(false)
let suppressClick = false

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

const handleMouseEnter = () => {
  isHovered.value = true
}

const handleMouseLeave = () => {
  isHovered.value = false
  isPressed.value = false
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
  if (suppressClick) {
    suppressClick = false
    return
  }
  emit('click', e)
}
</script>

<template>
  <button
    type="button"
    class="minimal-button"
    :class="{ 'minimal-button--pressed': isPressed }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @pointerdown="handlePointerDown"
    @pointerup="handlePointerUp"
    @pointercancel="handleMouseLeave"
    @click="handleClick"
  >
    <span class="roll-text" aria-hidden="true">
      <span
        v-for="item in lettersWithMeta"
        :key="item.idx"
        class="roll-cell"
        :style="{ '--center-dist': item.centerDist } as any"
      >
        <span class="roll-track" :class="{ 'roll-track--active': isHovered }">
          <span class="roll-char roll-char--top">{{ item.char === ' ' ? '\u00A0' : item.char }}</span>
          <span class="roll-char roll-char--bottom">{{ item.char === ' ' ? '\u00A0' : item.char }}</span>
        </span>
      </span>
    </span>
    <span class="sr-only">{{ label }}</span>
  </button>
</template>

<style scoped>
.minimal-button {
  width: 232px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border: 1px solid #15131a;
  border-radius: 9999px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  overflow: hidden;
  transition:
    background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.minimal-button:focus-visible {
  box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.5);
}

.minimal-button--pressed {
  background: #f0f0f2;
  transform: scale(0.98);
}

@media (hover: hover) {
  .minimal-button:hover {
    background: #f7f7f9;
    border-color: #15131a;
  }
}

/* KINETIC ROLLING SPLIT TEXT (Onda Simétrica Centro -> Extremos) */
.roll-text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 18px;
  overflow: hidden;
  padding-left: 0.11em;
  pointer-events: none;
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
}

.roll-char--bottom {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  display: flex;
  color: #000000;
}

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

@media (max-width: 640px) {
  .minimal-button {
    width: min(232px, 85vw);
    height: 44px;
  }
}
</style>
