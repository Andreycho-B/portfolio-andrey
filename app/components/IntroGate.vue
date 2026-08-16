<script setup lang="ts">
// Portada de entrada inspirada en la primera página de Pacôme Pertant
// (https://pacomepertant.com/): saludo + "entrar con sonido" / "entrar sin sonido".
// El arcoíris ascendente es una adaptación a Vue + CSS plano (sin Tailwind, PAP-004)
// de "Ruixen Gradient Footer" (21st.dev/ruixen.ui/ruixen-gradient-footer):
// un <svg> inline sin dependencias, anclado al suelo del viewport, que sube
// (scaleY) con el scroll y llega a altura completa justo al final del recorrido.

const emit = defineEmits<{
  enter: []
  'enter-silent': []
}>()

const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')

const VBW = 1271
const VBH = 599
const GRADIENT_HEIGHT = '65vh'
const MIN_REVEAL = 0.045
const BARS = 9
const BLUR = 15
const PEAK = 0.98
const VALLEY = 0.55

// Paradas del arcoíris de Ruixen, suelo (0) → techo (1).
const STOPS: Array<{ offset: number; color: string }> = [
  { offset: 0, color: '#340B05' },
  { offset: 0.1827, color: '#0358F7' },
  { offset: 0.2837, color: '#5092C7' },
  { offset: 0.4135, color: '#E1ECFE' },
  { offset: 0.5866, color: '#FFD400' },
  { offset: 0.6827, color: '#FA3D1D' },
  { offset: 0.8029, color: '#FD02F5' },
  { offset: 1, color: '#FFC0FD00' },
]

const bandRef = ref<HTMLElement | null>(null)
const progress = ref(MIN_REVEAL)

// Curva de alturas: caída de potencia suave, pico en el centro (como el footer original).
const bellHeights = (n: number, peak: number, valley: number): number[] => {
  const out: number[] = []
  const mid = (n - 1) / 2
  for (let i = 0; i < n; i++) {
    const t = mid === 0 ? 0 : Math.abs(i - mid) / mid
    const eased = 1 - Math.pow(t, 1.24)
    out.push(peak * VBH * (valley + (1 - valley) * eased))
  }
  return out
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

const measure = () => {
  const el = bandRef.value
  if (!el) return
  const doc = el.ownerDocument
  const win = doc.defaultView
  if (!win) return
  const h = el.offsetHeight || 1
  // Scroll restante antes del final de la página: el arcoíris sube en el
  // último tramo y llega a plena altura justo al llegar al final.
  const left = doc.documentElement.scrollHeight - win.innerHeight - win.scrollY
  const t = clamp01((h - left) / h)
  progress.value = MIN_REVEAL + (1 - MIN_REVEAL) * t
}

onMounted(() => {
  measure()
  window.addEventListener('scroll', measure, { passive: true })
  window.addEventListener('resize', measure, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', measure)
  window.removeEventListener('resize', measure)
})

const bars = bellHeights(BARS, PEAK, VALLEY)
const colWidth = VBW / BARS
</script>

<template>
  <section class="intro-gate">
    <div ref="bandRef" class="intro-gate__band" aria-hidden="true">
      <svg
        viewBox="0 0 1271 599"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            :id="`intro-grad-${uid}`"
            x1="0"
            y1="1"
            x2="0"
            y2="0"
          >
            <stop
              v-for="(stop, i) in STOPS"
              :key="i"
              :offset="stop.offset"
              :stop-color="stop.color"
            />
          </linearGradient>
          <filter
            :id="`intro-blur-${uid}`"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur :stdDeviation="BLUR" />
          </filter>
        </defs>
        <g
          v-for="(barH, i) in bars"
          :key="i"
          :filter="`url(#intro-blur-${uid})`"
        >
          <rect
            :x="i * colWidth"
            :y="VBH - barH"
            :width="colWidth * 1.23"
            :height="barH"
            :fill="`url(#intro-grad-${uid})`"
          />
        </g>
      </svg>
    </div>

    <div class="intro-gate__content">
      <h1 class="intro-gate__title">hola soy andrey</h1>
      <p class="intro-gate__subtitle">analista y desarrollador de software</p>
      <div class="intro-gate__actions">
        <button
          class="intro-gate__link"
          type="button"
          @click="emit('enter')"
        >
          entrar con sonido
        </button>
        <span class="intro-gate__divider" aria-hidden="true">·</span>
        <button
          class="intro-gate__link"
          type="button"
          @click="emit('enter-silent')"
        >
          entrar sin sonido
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.intro-gate {
  position: relative;
  height: 100vh;
  background-color: #ffffff;
  overflow: hidden;
}

.intro-gate__band {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: v-bind(GRADIENT_HEIGHT);
  pointer-events: none;
  transform-origin: bottom;
  transform: scaleY(v-bind(progress));
  will-change: transform;
  z-index: 0;
}

.intro-gate__band svg {
  display: block;
  width: 100%;
  height: 100%;
}

.intro-gate__content {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.6rem;
  padding: 0 6%;
  text-align: center;
}

.intro-gate__title {
  font-family: 'Le Murmure', 'Space Grotesk Variable', sans-serif;
  font-size: clamp(2.4rem, 7vw, 4.2rem);
  font-weight: 400;
  color: #15131a;
  margin: 0;
  opacity: 0;
  animation: intro-rise 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards;
}

.intro-gate__subtitle {
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 300;
  font-size: clamp(0.95rem, 2.2vw, 1.2rem);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #6b7280;
  margin: 0;
  opacity: 0;
  animation: intro-rise 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards;
}

.intro-gate__actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  opacity: 0;
  animation: intro-rise 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.65s forwards;
}

.intro-gate__link {
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 400;
  font-size: 0.8rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #6b7280;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  transition:
    color 0.6s cubic-bezier(0.16, 1, 0.3, 1),
    letter-spacing 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.intro-gate__link:hover,
.intro-gate__link:focus-visible {
  color: #0000ff;
  letter-spacing: 0.3em;
  outline: none;
}

.intro-gate__divider {
  color: #cbd5e1;
  user-select: none;
}

@keyframes intro-rise {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (width <= 640px) {
  .intro-gate__content {
    gap: 1.2rem;
  }

  .intro-gate__actions {
    flex-direction: column;
    gap: 0.9rem;
    margin-top: 0.5rem;
  }

  .intro-gate__divider {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .intro-gate__title,
  .intro-gate__subtitle,
  .intro-gate__actions {
    animation: none;
    opacity: 1;
  }
}
</style>
