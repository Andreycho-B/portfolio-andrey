<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getDPR } from '~/composables/useWebGLTier'

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  baseX: number
  baseY: number
  radius: number
  label: string
  pulse: number
  orbit: number
  offX: number
  offY: number
}

const SPACING = 55
const MAX_CONN_DIST = 75
const MOUSE_RADIUS = 220
const COMPACT_MOUSE_RADIUS = 120
// el desvanecido de las líneas cerca del cursor empieza más lejos que la zona de repulsión
const LINE_FADE_RADIUS = 1.4
// las diagonales largas (las "X" que se forman entre celdas) se atenúan extra: son
// más visibles porque el cruce superpone dos trazos; desde esta longitud hasta el
// máximo de conexión la opacidad decae hasta LEN_FADE_MIN
const LEN_FADE_START = 60
const LEN_FADE_MIN = 0.5
const NEAR_ZONE = 90
const COMPACT_NEAR_ZONE = 60
const SPRING_K = 18
const DAMPING = 0.82
// velocidad angular de las órbitas: omega = ORBIT_SPEED / radio (los interiores giran más rápido)
const ORBIT_SPEED = 90
// atracción tipo agujero negro: acercamiento lento y fluido de los nodos al cursor
const ATTRACT_RADIUS = 180
const COMPACT_ATTRACT_RADIUS = 110
const ATTRACT_PULL = 30
const COMPACT_ATTRACT_PULL = 20
const ATTRACT_EASE = 2.2
// cursor lento atrae, cursor rápido repele: blend suave entre ambos umbrales
const SLOW_SPEED = 100
const FAST_SPEED = 500
const REPEL_PULL = 60
const COMPACT_REPEL_PULL = 40
const REPEL_EASE_BONUS = 2
// flujo por scroll: los nodos se desplazan con la velocidad y dirección del carrusel
const FLOW_STRENGTH = 0.09
const FLOW_CAP = 70
const FLOW_DECAY = 1.4
const WHEEL_SCALE = 16
const NODE_RGB = '0, 102, 255'
const ACCENT_RGB = '0, 102, 255'
const EXCLUSION_FADE = 28
const EXCLUSION_PADDING = 6
// capa de lineas: se dibuja solo cuando cambian (cursor activo, nodos en
// movimiento o dirty tras resize/tier); en reposo persiste del ultimo frame,
// sin parpadeo ni re-dibujo (el canvas de nodos se limpia aparte, arriba)
const CELL_SIZE = MAX_CONN_DIST
// tier dinámico: si el frame se sostiene lento (ahorro de batería, gama media),
// se baja la carga (DPR y densidad de la malla); se recupera al volver la fluidez
const TIER_DOWN_FPS = 31
const TIER_UP_FPS = 50
const TIER_HYSTERESIS = 60
const LIGHT_SPACING = 80
const LIGHT_DPR = 1

export interface CavityPulse {
  x?: number
  y?: number
  radius?: number
  strength?: number
  time: number
}

export interface ExclusionRect {
  x: number
  y: number
  w: number
  h: number
}

const props = withDefaults(
  defineProps<{
    active?: boolean
    anchor?: readonly [number, number] | null
    compact?: boolean
    pulse?: CavityPulse | null
    exclusion?: ExclusionRect | null
  }>(),
  { active: true, anchor: null, compact: false, pulse: null, exclusion: null },
)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const lineRef = ref<HTMLCanvasElement | null>(null)

let animationFrameId = 0
let running = false
let width = 0
let height = 0
let ctx: CanvasRenderingContext2D | null = null
let lineCtx: CanvasRenderingContext2D | null = null
let nodes: Node[] = []
let lastTime = performance.now()
let flowVel = 0
let lastTouchY = 0
let linesDirty = true
let tier = 0
let tierTimer = 0
let frameEMA = 0.016

const mouse = {
  x: -1000,
  y: -1000,
  prevX: -1000,
  prevY: -1000,
  vx: 0,
  vy: 0,
}

const cursor = {
  x: -1000,
  y: -1000,
  prevX: -1000,
  prevY: -1000,
  vx: 0,
  vy: 0,
}

const initNodes = (spacing = SPACING) => {
  nodes = []
  const cols = Math.ceil(width / spacing) + 1
  const rows = Math.ceil(height / spacing) + 1
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = i * spacing
      const y = j * spacing
      nodes.push({
        x,
        y,
        vx: 0,
        vy: 0,
        baseX: x,
        baseY: y,
        radius: Math.random() * 1.2 + 1.2,
        label: `${(i * 7).toString(16).toUpperCase()}:${(j * 11).toString(16).toUpperCase()}`,
        pulse: Math.random() * Math.PI * 2,
        orbit: Math.random() * Math.PI * 2,
        offX: 0,
        offY: 0,
      })
    }
  }
}

const currentDpr = () => (tier === 1 ? LIGHT_DPR : getDPR())
const currentSpacing = () => (tier === 1 ? LIGHT_SPACING : SPACING)

// aplica tamaño + DPR a ambas capas, limpia la de líneas y la marca para redibujo
const setupCanvas = (dpr: number) => {
  const canvas = canvasRef.value
  const lineCanvas = lineRef.value
  if (!canvas || !ctx || !lineCanvas || !lineCtx) return
  width = window.innerWidth
  height = window.innerHeight
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  lineCanvas.width = width * dpr
  lineCanvas.height = height * dpr
  lineCanvas.style.width = `${width}px`
  lineCanvas.style.height = `${height}px`
  // setTransform (no scale): reasignar canvas.width resetea el transform y scale
  // acumularía el factor DPR en cada resize
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  lineCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
  // la capa de líneas es transparente: el fondo lo provee el contenedor (blanco)
  lineCtx.clearRect(0, 0, width, height)
  linesDirty = true
}

const handleResize = () => {
  setupCanvas(currentDpr())
  if (props.anchor) {
    mouse.x = props.anchor[0] * width
    mouse.y = props.anchor[1] * height
    mouse.prevX = mouse.x
    mouse.prevY = mouse.y
  }
  initNodes(currentSpacing())
}

const applyTier = (next: number) => {
  if (tier === next) return
  tier = next
  setupCanvas(currentDpr())
  initNodes(currentSpacing())
}

const handleMouseMove = (e: MouseEvent) => {
  cursor.x = e.clientX
  cursor.y = e.clientY
  // primer contacto real: sincronizar el prev para que la velocidad calculada
  // no explote por el salto desde la posición fantasma (-1000)
  if (cursor.prevX === -1000) {
    cursor.prevX = cursor.x
    cursor.prevY = cursor.y
  }
  if (!props.anchor) {
    mouse.x = cursor.x
    mouse.y = cursor.y
    if (mouse.prevX === -1000) {
      mouse.prevX = mouse.x
      mouse.prevY = mouse.y
    }
  }
}

const handleMouseLeave = () => {
  cursor.x = -1000
  cursor.y = -1000
  cursor.prevX = -1000
  cursor.prevY = -1000
  if (!props.anchor) {
    mouse.x = -1000
    mouse.y = -1000
  }
}

const handleWheel = (e: WheelEvent) => {
  flowVel += e.deltaY * (e.deltaMode === 1 ? WHEEL_SCALE : 1)
}

// el dedo actúa como el cursor: repulsión, fade de líneas, anillos y etiquetas
// responden igual que con el mouse; al soltar, el cursor se retira (vuelven a casa)
const handleTouchStart = (e: TouchEvent) => {
  const t = e.touches[0]
  if (!t) return
  lastTouchY = t.clientY
  cursor.x = t.clientX
  cursor.y = t.clientY
  // el dedo aparece de golpe: el prev debe arrancar en la misma posición o la
  // velocidad del primer frame explota (repulsión descontrolada, nodos dispersos)
  cursor.prevX = cursor.x
  cursor.prevY = cursor.y
  if (!props.anchor) {
    mouse.x = cursor.x
    mouse.y = cursor.y
    mouse.prevX = mouse.x
    mouse.prevY = mouse.y
  }
}

const handleTouchMove = (e: TouchEvent) => {
  const t = e.touches[0]
  if (!t) return
  const y = t.clientY
  flowVel += (y - lastTouchY) * 1.5
  lastTouchY = y
  cursor.x = t.clientX
  cursor.y = t.clientY
  if (!props.anchor) {
    mouse.x = cursor.x
    mouse.y = cursor.y
  }
}

const handleTouchEnd = () => {
  cursor.x = -1000
  cursor.y = -1000
  cursor.prevX = -1000
  cursor.prevY = -1000
  if (!props.anchor) {
    mouse.x = -1000
    mouse.y = -1000
  }
}

const render = (now: number) => {
  if (!ctx) return
  const dt = Math.min((now - lastTime) / 1000, 0.05)
  lastTime = now

  // tier dinámico: el frame time real (EMA) decide la carga; histéresis para no
  // oscilar entre niveles (el ahorro de batería de iOS/Android baja el CPU y el rAF)
  frameEMA += (dt - frameEMA) * 0.05
  if (tier === 0 && frameEMA > 1 / TIER_DOWN_FPS) {
    tierTimer++
    if (tierTimer > TIER_HYSTERESIS) {
      tierTimer = 0
      applyTier(1)
    }
  } else if (tier === 1 && frameEMA < 1 / TIER_UP_FPS) {
    tierTimer++
    if (tierTimer > TIER_HYSTERESIS) {
      tierTimer = 0
      applyTier(0)
    }
  } else {
    tierTimer = 0
  }

  mouse.vx = (mouse.x - mouse.prevX) / (dt * 1000 || 1)
  mouse.vy = (mouse.y - mouse.prevY) / (dt * 1000 || 1)
  mouse.prevX = mouse.x
  mouse.prevY = mouse.y

  cursor.vx = (cursor.x - cursor.prevX) / (dt * 1000 || 1)
  cursor.vy = (cursor.y - cursor.prevY) / (dt * 1000 || 1)
  cursor.prevX = cursor.x
  cursor.prevY = cursor.y

  flowVel *= Math.exp(-FLOW_DECAY * dt)

  const speed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy)
  const mouseRadius = props.compact ? COMPACT_MOUSE_RADIUS : MOUSE_RADIUS
  const nearZone = props.compact ? COMPACT_NEAR_ZONE : NEAR_ZONE
  const attractRadius = props.compact ? COMPACT_ATTRACT_RADIUS : ATTRACT_RADIUS
  const attractPull = props.compact ? COMPACT_ATTRACT_PULL : ATTRACT_PULL
  const repelPull = props.compact ? COMPACT_REPEL_PULL : REPEL_PULL

  // el fondo blanco lo pinta la capa de líneas (persiste entre frames); la capa
  // de nodos es transparente y se limpia cada frame
  ctx.clearRect(0, 0, width, height)

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!
    n.pulse += dt * 3

    // modo anclado: los nodos del clúster orbitan el centro como planetas;
    // el resto descansa en su punto de malla
    if (props.anchor) {
      const orbitDist = Math.hypot(n.baseX - mouse.x, n.baseY - mouse.y)
      if (orbitDist < mouseRadius && orbitDist > 0) {
        n.orbit += (ORBIT_SPEED / orbitDist) * dt
        n.x = mouse.x + Math.cos(n.orbit) * orbitDist
        n.y = mouse.y + Math.sin(n.orbit) * orbitDist
      } else {
        n.x = n.baseX
        n.y = n.baseY
      }
      // el cursor atrae al pasar lento y controlado (agujero negro) y repele al
      // pasar rápido: blend suave entre ambos según la velocidad del cursor;
      // el flujo de scroll desplaza los nodos con la velocidad y dirección del carrusel
      const adx = cursor.x - n.x
      const ady = cursor.y - n.y
      const adist = Math.hypot(adx, ady)
      const flowOffset = Math.max(-FLOW_CAP, Math.min(FLOW_CAP, flowVel * FLOW_STRENGTH))
      if (adist < attractRadius && adist > 0) {
        const cSpeed = Math.hypot(cursor.vx, cursor.vy)
        const blend = Math.min(Math.max((cSpeed - SLOW_SPEED) / (FAST_SPEED - SLOW_SPEED), 0), 1)
        const pull = (1 - adist / attractRadius) * (attractPull * (1 - blend) + repelPull * blend)
        const dirX = (adx / adist) * (1 - 2 * blend)
        const dirY = (ady / adist) * (1 - 2 * blend)
        const ease = 1 - Math.exp(-(ATTRACT_EASE + blend * REPEL_EASE_BONUS) * dt)
        n.offX += (dirX * pull + flowOffset - n.offX) * ease
        n.offY += (dirY * pull - n.offY) * ease
      } else {
        const ease = 1 - Math.exp(-ATTRACT_EASE * dt)
        n.offX += (flowOffset - n.offX) * ease
        n.offY -= n.offY * ease
      }
      n.x += n.offX
      n.y += n.offY
      continue
    }

    const dx = mouse.x - n.x
    const dy = mouse.y - n.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < mouseRadius && dist > 0) {
      const power = 1 - dist / mouseRadius
      const force = power * (1500 + speed * 150)
      const angle = Math.atan2(dy, dx)
      n.vx -= Math.cos(angle) * force * dt
      n.vy -= Math.sin(angle) * force * dt
    }

    if (props.pulse) {
      const pAge = (now - props.pulse.time) / 1000
      if (pAge >= 0 && pAge < 1.4) {
        const pX = props.pulse.x ?? width * 0.5
        const pY = props.pulse.y ?? height * 0.5
        const pRadius = props.pulse.radius ?? Math.min(width, height) * 0.55
        const pStrength = props.pulse.strength ?? 800
        const pDecay = Math.exp(-4.2 * pAge)
        const pdx = n.x - pX
        const pdy = n.y - pY
        const pDist = Math.hypot(pdx, pdy)
        if (pDist < pRadius && pDist > 0.1) {
          const push = (1 - pDist / pRadius) * pStrength * pDecay
          n.vx += (pdx / pDist) * push * dt
          n.vy += (pdy / pDist) * push * dt
        }
      }
    }

    const homeDx = n.baseX - n.x
    const homeDy = n.baseY - n.y
    n.vx += homeDx * SPRING_K * dt
    n.vy += homeDy * SPRING_K * dt
    n.vx *= DAMPING
    n.vy *= DAMPING
    n.x += n.vx * dt * 60
    n.y += n.vy * dt * 60
  }

  // capa de líneas: se redibuja solo cuando cambian (cursor activo, nodos en
  // movimiento o dirty tras resize/tier); en reposo persiste del último frame
  const cursorActivo = mouse.x > -1000 || cursor.x > -1000
  let moving = false
  if (!cursorActivo) {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]!
      if (Math.abs(n.x - n.baseX) > 1 || Math.abs(n.y - n.baseY) > 1) {
        moving = true
        break
      }
    }
  }
  if (lineCtx && (cursorActivo || moving || linesDirty)) {
    linesDirty = false
    lineCtx.clearRect(0, 0, width, height)
    // hash espacial: solo se comparan nodos de celdas vecinas (pocos pares reales)
    // en vez del barrido completo O(n^2); el guard j > i evita pares duplicados
    const grid = new Map<string, number[]>()
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]!
      const key = `${Math.floor(n.x / CELL_SIZE)},${Math.floor(n.y / CELL_SIZE)}`
      let cell = grid.get(key)
      if (!cell) {
        cell = []
        grid.set(key, cell)
      }
      cell.push(i)
    }
    const maxDistSq = MAX_CONN_DIST * MAX_CONN_DIST
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]!
      const cx = Math.floor(n.x / CELL_SIZE)
      const cy = Math.floor(n.y / CELL_SIZE)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const cell = grid.get(`${cx + dx},${cy + dy}`)
          if (!cell) continue
          for (let v = 0; v < cell.length; v++) {
            const j = cell[v]!
            if (j <= i) continue
            const n2 = nodes[j]!
            const ndx = n.x - n2.x
            const ndy = n.y - n2.y
            const distSq = ndx * ndx + ndy * ndy
            if (distSq < maxDistSq) {
              const nDist = Math.sqrt(distSq)
              // desvanecido uniforme: la línea se funde al acercarse al cursor y desaparece en su zona
              const tSeg = Math.max(0, Math.min(1, ((mouse.x - n.x) * ndx + (mouse.y - n.y) * ndy) / Math.max(distSq, 1e-6)))
              const projX = n.x + tSeg * ndx
              const projY = n.y + tSeg * ndy
              const distSeg = Math.hypot(mouse.x - projX, mouse.y - projY)
              const lengthFade = 1 - Math.min(1, Math.max(0, (nDist - LEN_FADE_START) / (MAX_CONN_DIST - LEN_FADE_START))) * (1 - LEN_FADE_MIN)
              let exclusionFadeLine = 1
              if (props.exclusion) {
                const mx = (n.x + n2.x) * 0.5
                const my = (n.y + n2.y) * 0.5
                const halfW = props.exclusion.w * 0.5 + EXCLUSION_PADDING
                const halfH = props.exclusion.h * 0.5 + EXCLUSION_PADDING
                const edx = Math.max(Math.abs(mx - props.exclusion.x) - halfW, 0)
                const edy = Math.max(Math.abs(my - props.exclusion.y) - halfH, 0)
                const distEx = Math.hypot(edx, edy)
                exclusionFadeLine = Math.min(1, distEx / EXCLUSION_FADE)
              }
              const alpha = 0.15 * Math.min(1, distSeg / (mouseRadius * LINE_FADE_RADIUS)) * lengthFade * exclusionFadeLine
              if (alpha < 0.001) continue
              lineCtx.strokeStyle = `rgba(${NODE_RGB}, ${alpha})`
              lineCtx.lineWidth = 0.7
              lineCtx.beginPath()
              lineCtx.moveTo(n.x, n.y)
              lineCtx.lineTo(n2.x, n2.y)
              lineCtx.stroke()
            }
          }
        }
      }
    }
  }

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!
    const dx = mouse.x - n.x
    const dy = mouse.y - n.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const isNear = dist < mouseRadius

    // fade suave cerca del CTA (opción B): desvanecido sin desplazar nodos
    let exclusionFade = 1
    if (props.exclusion) {
      const halfW = props.exclusion.w * 0.5 + EXCLUSION_PADDING
      const halfH = props.exclusion.h * 0.5 + EXCLUSION_PADDING
      const edx = Math.max(Math.abs(n.x - props.exclusion.x) - halfW, 0)
      const edy = Math.max(Math.abs(n.y - props.exclusion.y) - halfH, 0)
      const distEx = Math.hypot(edx, edy)
      exclusionFade = Math.min(1, distEx / EXCLUSION_FADE)
      if (exclusionFade <= 0.01) continue
    }

    const baseAlpha = 1 * exclusionFade
    ctx.fillStyle = isNear ? `rgba(${ACCENT_RGB}, ${baseAlpha})` : `rgba(${NODE_RGB}, ${baseAlpha})`
    const currentRadius = isNear ? n.radius * 2.2 : n.radius + Math.sin(n.pulse) * 0.3
    ctx.beginPath()
    ctx.arc(n.x, n.y, Math.max(0.5, currentRadius), 0, Math.PI * 2)
    ctx.fill()

    if (dist < nearZone) {
      const pulseRing = ((n.pulse * 20) % 30) + 4
      const ringAlpha = (1 - pulseRing / 34) * 0.4 * exclusionFade
      if (ringAlpha > 0.01) {
        ctx.strokeStyle = `rgba(${ACCENT_RGB}, ${ringAlpha})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(n.x, n.y, pulseRing, 0, Math.PI * 2)
        ctx.stroke()
      }

      ctx.font = '8px ui-monospace, SFMono-Regular, Consolas, monospace'
      ctx.fillStyle = `rgba(${ACCENT_RGB}, ${0.85 * exclusionFade})`
      ctx.fillText(n.label, n.x + 10, n.y - 10)
    }
  }

  if (running) animationFrameId = requestAnimationFrame(render)
}

const startLoop = () => {
  if (running) return
  running = true
  lastTime = performance.now()
  animationFrameId = requestAnimationFrame(render)
}

const stopLoop = () => {
  running = false
  cancelAnimationFrame(animationFrameId)
}

onMounted(() => {
  const canvas = canvasRef.value
  const lineCanvas = lineRef.value
  if (!canvas || !lineCanvas) return
  ctx = canvas.getContext('2d', { alpha: true })
  lineCtx = lineCanvas.getContext('2d', { alpha: true })
  if (!ctx || !lineCtx) return
  handleResize()
  window.addEventListener('resize', handleResize)
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseleave', handleMouseLeave)
  window.addEventListener('wheel', handleWheel, { passive: true })
  window.addEventListener('touchstart', handleTouchStart, { passive: true })
  window.addEventListener('touchmove', handleTouchMove, { passive: true })
  window.addEventListener('touchend', handleTouchEnd, { passive: true })
  window.addEventListener('touchcancel', handleTouchEnd, { passive: true })
  if (props.active !== false) startLoop()
})

watch(
  () => props.active,
  (active) => {
    if (active) startLoop()
    else stopLoop()
  },
)

watch(
  () => props.exclusion,
  () => {
    linesDirty = true
  },
  { deep: true },
)

onBeforeUnmount(() => {
  stopLoop()
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseleave', handleMouseLeave)
  window.removeEventListener('wheel', handleWheel)
  window.removeEventListener('touchstart', handleTouchStart)
  window.removeEventListener('touchmove', handleTouchMove)
  window.removeEventListener('touchend', handleTouchEnd)
  window.removeEventListener('touchcancel', handleTouchEnd)
})
</script>

<template>
  <canvas ref="lineRef" class="constellation-lines" aria-hidden="true" />
  <canvas ref="canvasRef" class="constellation-grid" aria-hidden="true" />
</template>

<style scoped>
.constellation-lines,
.constellation-grid {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  user-select: none;
}
</style>