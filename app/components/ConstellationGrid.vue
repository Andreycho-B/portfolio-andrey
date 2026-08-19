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
const BG_COLOR = '#ffffff'
const NODE_RGB = '0, 0, 255'
const ACCENT_RGB = '0, 0, 255'

const props = withDefaults(
  defineProps<{ active?: boolean; anchor?: readonly [number, number] | null; compact?: boolean }>(),
  { active: true, anchor: null, compact: false },
)

const canvasRef = ref<HTMLCanvasElement | null>(null)

let animationFrameId = 0
let running = false
let width = 0
let height = 0
let ctx: CanvasRenderingContext2D | null = null
let nodes: Node[] = []
let lastTime = performance.now()
let flowVel = 0
let lastTouchY = 0

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

const initNodes = () => {
  nodes = []
  const cols = Math.ceil(width / SPACING) + 1
  const rows = Math.ceil(height / SPACING) + 1
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = i * SPACING
      const y = j * SPACING
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

const handleResize = () => {
  const canvas = canvasRef.value
  if (!canvas || !ctx) return
  const dpr = getDPR()
  width = window.innerWidth
  height = window.innerHeight
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  // setTransform (no scale): reasignar canvas.width resetea el transform y scale
  // acumularía el factor DPR en cada resize
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  if (props.anchor) {
    mouse.x = props.anchor[0] * width
    mouse.y = props.anchor[1] * height
    mouse.prevX = mouse.x
    mouse.prevY = mouse.y
  }
  initNodes()
}

const handleMouseMove = (e: MouseEvent) => {
  cursor.x = e.clientX
  cursor.y = e.clientY
  if (!props.anchor) {
    mouse.x = cursor.x
    mouse.y = cursor.y
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

const handleTouchStart = (e: TouchEvent) => {
  lastTouchY = e.touches[0]?.clientY ?? 0
}

const handleTouchMove = (e: TouchEvent) => {
  const y = e.touches[0]?.clientY ?? 0
  flowVel += (y - lastTouchY) * 1.5
  lastTouchY = y
}

const render = (now: number) => {
  if (!ctx) return
  const dt = Math.min((now - lastTime) / 1000, 0.05)
  lastTime = now

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

  ctx.fillStyle = BG_COLOR
  ctx.fillRect(0, 0, width, height)

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

    const homeDx = n.baseX - n.x
    const homeDy = n.baseY - n.y
    n.vx += homeDx * SPRING_K * dt
    n.vy += homeDy * SPRING_K * dt
    n.vx *= DAMPING
    n.vy *= DAMPING
    n.x += n.vx * dt * 60
    n.y += n.vy * dt * 60
  }

  const maxDistSq = MAX_CONN_DIST * MAX_CONN_DIST
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!
    for (let j = i + 1; j < nodes.length; j++) {
      const n2 = nodes[j]!
      const ndx = n.x - n2.x
      const ndy = n.y - n2.y
      const distSq = ndx * ndx + ndy * ndy
      if (distSq < maxDistSq) {
        const nDist = Math.sqrt(distSq)
        const alpha = (1 - nDist / MAX_CONN_DIST) * 0.08
        ctx.strokeStyle = `rgba(${NODE_RGB}, ${alpha})`
        ctx.lineWidth = 0.7
        ctx.beginPath()
        ctx.moveTo(n.x, n.y)
        ctx.lineTo(n2.x, n2.y)
        ctx.stroke()
      }
    }
  }

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!
    const dx = mouse.x - n.x
    const dy = mouse.y - n.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const isNear = dist < mouseRadius

    const baseAlpha = isNear ? 0.95 : 0.25 + Math.sin(n.pulse) * 0.1
    ctx.fillStyle = isNear ? `rgba(${ACCENT_RGB}, ${baseAlpha})` : `rgba(${NODE_RGB}, ${baseAlpha})`
    const currentRadius = isNear ? n.radius * 2.2 : n.radius + Math.sin(n.pulse) * 0.3
    ctx.beginPath()
    ctx.arc(n.x, n.y, Math.max(0.5, currentRadius), 0, Math.PI * 2)
    ctx.fill()

    if (dist < nearZone) {
      const pulseRing = ((n.pulse * 20) % 30) + 4
      const ringAlpha = (1 - pulseRing / 34) * 0.4
      ctx.strokeStyle = `rgba(${ACCENT_RGB}, ${ringAlpha})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(n.x, n.y, pulseRing, 0, Math.PI * 2)
      ctx.stroke()

      ctx.font = '8px ui-monospace, SFMono-Regular, Consolas, monospace'
      ctx.fillStyle = `rgba(${ACCENT_RGB}, 0.85)`
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
  if (!canvas) return
  ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) return
  handleResize()
  window.addEventListener('resize', handleResize)
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseleave', handleMouseLeave)
  window.addEventListener('wheel', handleWheel, { passive: true })
  window.addEventListener('touchstart', handleTouchStart, { passive: true })
  window.addEventListener('touchmove', handleTouchMove, { passive: true })
  if (props.active !== false) startLoop()
})

watch(
  () => props.active,
  (active) => {
    if (active) startLoop()
    else stopLoop()
  },
)

onBeforeUnmount(() => {
  stopLoop()
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseleave', handleMouseLeave)
  window.removeEventListener('wheel', handleWheel)
  window.removeEventListener('touchstart', handleTouchStart)
  window.removeEventListener('touchmove', handleTouchMove)
})
</script>

<template>
  <canvas ref="canvasRef" class="constellation-grid" aria-hidden="true" />
</template>

<style scoped>
.constellation-grid {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  user-select: none;
}
</style>