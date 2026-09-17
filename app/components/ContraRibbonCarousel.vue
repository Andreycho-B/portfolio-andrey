<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { SceneContext } from '~/components/WebGLScene.vue'

export interface Point2D {
  x: number
  y: number
}

export interface CurvedCard {
  id: string
  name: string
  ribbon: 'upper' | 'lower'
  color: string
  drawType: string
  // 4 esquinas canónicas:
  // p1: Top-Left, p2: Top-Right, p4: Bottom-Right, p3: Bottom-Left
  p1: Point2D
  p2: Point2D
  p3: Point2D
  p4: Point2D
  // Puntos de control de curvatura Bézier:
  cTop: Point2D   // p1 -> p2 (Borde superior)
  cRight: Point2D // p2 -> p4 (Borde derecho)
  cBot: Point2D   // p4 -> p3 (Borde inferior)
  cLeft: Point2D  // p3 -> p1 (Borde izquierdo)
  minX: number
  minY: number
  w: number
  h: number
}

export interface CardItemData {
  id: string
  name: string
  ribbon: 'upper' | 'lower'
  drawType: string
  color: string
}

const props = defineProps<{
  ctx?: SceneContext | null
  paused?: boolean
}>()

defineEmits<{
  'select-card': [card: CardItemData]
}>()

// ============================================================================
// RANURAS EXACTAS CALIBRADAS POR EL AUTOR (PRESERVACIÓN 100% FIEL DE FORMAS)
// Los 4 vértices y 4 arcos reproducen al milímetro la calibración de la referencia
// u1..u4 (cinta superior) y l1..l4 (cinta inferior).
// ============================================================================
const upperCalibratedSlots: CurvedCard[] = [
  // Slot 0: Entrada por la izquierda (fuera del encuadre para transición fluida)
  {
    id: 'u0',
    name: '0. Entrada Izq',
    ribbon: 'upper',
    color: '#64748b',
    drawType: 'spatial-design',
    p1: { x: -160, y: -28 },
    p2: { x: 81, y: -20 },
    p3: { x: -260, y: -10 },
    p4: { x: -20, y: 2 },
    cTop: { x: -40, y: -24 },
    cRight: { x: 30, y: -9 },
    cBot: { x: -140, y: -4 },
    cLeft: { x: -210, y: -19 },
    minX: -265, minY: -30, w: 350, h: 40,
  },
  // Slot 1: Flor Azul (Calibrada 1:1 por el autor)
  {
    id: 'u1',
    name: '1. Flor Azul (Izq)',
    ribbon: 'upper',
    color: '#3b82f6',
    drawType: 'contra-asterisk',
    p1: { x: 81, y: -20 },
    p2: { x: 322, y: -11 },
    p3: { x: -20, y: 2 },
    p4: { x: 224, y: 142 },
    cTop: { x: 202, y: -16 },
    cRight: { x: 273, y: 65 },
    cBot: { x: 89, y: 91 },
    cLeft: { x: 30, y: -9 },
    minX: -20, minY: -20, w: 342, h: 162,
  },
  // Slot 2: Ladrillo (Calibrada 1:1 por el autor)
  {
    id: 'u2',
    name: '2. Ladrillo (Centro-Izq)',
    ribbon: 'upper',
    color: '#f97316',
    drawType: 'urban-sketch',
    p1: { x: 368, y: -18 },
    p2: { x: 495, y: 44 },
    p3: { x: 257, y: 154 },
    p4: { x: 451, y: 188 },
    cTop: { x: 431, y: 13 },
    cRight: { x: 478, y: 124 },
    cBot: { x: 354, y: 171 },
    cLeft: { x: 319, y: 72 },
    minX: 257, minY: -18, w: 238, h: 206,
  },
  // Slot 3: Retrato Mujer (Calibrada 1:1 por el autor)
  {
    id: 'u3',
    name: '3. Retrato Mujer',
    ribbon: 'upper',
    color: '#eab308',
    drawType: 'editorial-beauty',
    p1: { x: 513, y: 49 },
    p2: { x: 633, y: 72 },
    p3: { x: 477, y: 186 },
    p4: { x: 625, y: 180 },
    cTop: { x: 574, y: 69 },
    cRight: { x: 627, y: 127 },
    cBot: { x: 555, y: 191 },
    cLeft: { x: 495, y: 117 },
    minX: 477, minY: 49, w: 156, h: 137,
  },
  // Slot 4: Trueform Music (Calibrada 1:1 por el autor)
  {
    id: 'u4',
    name: '4. Trueform (Der Fuga)',
    ribbon: 'upper',
    color: '#ef4444',
    drawType: 'trueform-music',
    p1: { x: 641, y: 73 },
    p2: { x: 745, y: 67 },
    p3: { x: 634, y: 180 },
    p4: { x: 744, y: 152 },
    cTop: { x: 695, y: 75 },
    cRight: { x: 744, y: 109 },
    cBot: { x: 694, y: 167 },
    cLeft: { x: 639, y: 127 },
    minX: 634, minY: 67, w: 111, h: 113,
  },
  // Slot 5: Salida en fuga profunda
  {
    id: 'u5',
    name: '5. Salida Der',
    ribbon: 'upper',
    color: '#0ea5e9',
    drawType: 'ai-blueprint',
    p1: { x: 745, y: 67 },
    p2: { x: 830, y: 62 },
    p3: { x: 744, y: 152 },
    p4: { x: 825, y: 130 },
    cTop: { x: 787, y: 65 },
    cRight: { x: 828, y: 96 },
    cBot: { x: 784, y: 141 },
    cLeft: { x: 744, y: 109 },
    minX: 744, minY: 62, w: 90, h: 90,
  },
]

const lowerCalibratedSlots: CurvedCard[] = [
  // Slot 0: Entrada por la izquierda
  {
    id: 'l0',
    name: '0. Entrada Izq',
    ribbon: 'lower',
    color: '#2563eb',
    drawType: 'motion-lab',
    p1: { x: -140, y: 440 },
    p2: { x: 78, y: 424 },
    p3: { x: -140, y: 450 },
    p4: { x: 201, y: 434 },
    cTop: { x: -30, y: 432 },
    cRight: { x: 140, y: 429 },
    cBot: { x: 30, y: 442 },
    cLeft: { x: -140, y: 445 },
    minX: -140, minY: 424, w: 341, h: 26,
  },
  // Slot 1: Swiss PMM (Calibrada 1:1 por el autor)
  {
    id: 'l1',
    name: '5. Swiss PMM',
    ribbon: 'lower',
    color: '#3b82f6',
    drawType: 'swiss-pmm',
    p1: { x: 78, y: 424 },
    p2: { x: 303, y: 297 },
    p3: { x: 201, y: 434 },
    p4: { x: 371, y: 427 },
    cTop: { x: 172, y: 348 },
    cRight: { x: 337, y: 362 },
    cBot: { x: 286, y: 430 },
    cLeft: { x: 140, y: 429 },
    minX: 78, minY: 297, w: 293, h: 137,
  },
  // Slot 2: Neural Portrait (Calibrada 1:1 por el autor)
  {
    id: 'l2',
    name: '6. Inf Centro',
    ribbon: 'lower',
    color: '#ec4899',
    drawType: 'red-duotone',
    p1: { x: 336, y: 290 },
    p2: { x: 496, y: 251 },
    p3: { x: 406, y: 425 },
    p4: { x: 543, y: 398 },
    cTop: { x: 409, y: 259 },
    cRight: { x: 520, y: 324 },
    cBot: { x: 497, y: 432 },
    cLeft: { x: 371, y: 357 },
    minX: 336, minY: 251, w: 207, h: 174,
  },
  // Slot 3: Harbor Waves (Calibrada 1:1 por el autor)
  {
    id: 'l3',
    name: '7. Harbor (Ondas)',
    ribbon: 'lower',
    color: '#6366f1',
    drawType: 'harbor-waves',
    p1: { x: 520, y: 251 },
    p2: { x: 644, y: 251 },
    p3: { x: 565, y: 386 },
    p4: { x: 662, y: 365 },
    cTop: { x: 577, y: 244 },
    cRight: { x: 649, y: 304 },
    cBot: { x: 612, y: 372 },
    cLeft: { x: 542, y: 318 },
    minX: 520, minY: 251, w: 142, h: 135,
  },
  // Slot 4: Digital Craft (Calibrada 1:1 por el autor)
  {
    id: 'l4',
    name: '8. Inf Der (Fuga)',
    ribbon: 'lower',
    color: '#10b981',
    drawType: 'digital-craft',
    p1: { x: 655, y: 253 },
    p2: { x: 747, y: 263 },
    p3: { x: 670, y: 361 },
    p4: { x: 748, y: 359 },
    cTop: { x: 698, y: 256 },
    cRight: { x: 747, y: 311 },
    cBot: { x: 710, y: 359 },
    cLeft: { x: 660, y: 304 },
    minX: 655, minY: 253, w: 93, h: 108,
  },
  // Slot 5: Salida en fuga
  {
    id: 'l5',
    name: '5. Salida Der',
    ribbon: 'lower',
    color: '#8b5cf6',
    drawType: 'creative-code',
    p1: { x: 747, y: 263 },
    p2: { x: 820, y: 270 },
    p3: { x: 748, y: 359 },
    p4: { x: 820, y: 355 },
    cTop: { x: 783, y: 266 },
    cRight: { x: 820, y: 312 },
    cBot: { x: 784, y: 357 },
    cLeft: { x: 747, y: 311 },
    minX: 747, minY: 263, w: 75, h: 96,
  },
]

// Catálogo de tarjetas en hilera continua (8 por cinta)
const upperItems: CardItemData[] = [
  { id: 'u-asterisk', name: 'Contra Asterisk', ribbon: 'upper', drawType: 'contra-asterisk', color: '#0052ff' },
  { id: 'u-urban', name: 'Urban Architecture', ribbon: 'upper', drawType: 'urban-sketch', color: '#ff6600' },
  { id: 'u-editorial', name: 'Editorial Beauty', ribbon: 'upper', drawType: 'editorial-beauty', color: '#ede8df' },
  { id: 'u-trueform', name: 'Trueform Music', ribbon: 'upper', drawType: 'trueform-music', color: '#8b1515' },
  { id: 'u-spatial', name: 'Spatial Interfaces', ribbon: 'upper', drawType: 'spatial-design', color: '#f4f2eb' },
  { id: 'u-ai', name: 'AI Architecture', ribbon: 'upper', drawType: 'ai-blueprint', color: '#1e293b' },
  { id: 'u-archive', name: 'System Archive', ribbon: 'upper', drawType: 'neutral-archive', color: '#f1efe7' },
  { id: 'u-kinetic', name: 'Kinetic Display', ribbon: 'upper', drawType: 'kinetic-type', color: '#18181b' },
]

const lowerItems: CardItemData[] = [
  { id: 'l-swiss', name: 'Swiss PMM', ribbon: 'lower', drawType: 'swiss-pmm', color: '#0052ff' },
  { id: 'l-neural', name: 'Neural Portrait', ribbon: 'lower', drawType: 'red-duotone', color: '#ec4899' },
  { id: 'l-harbor', name: 'Harbor Brand', ribbon: 'lower', drawType: 'harbor-waves', color: '#0f224a' },
  { id: 'l-digital', name: 'Digital Craft', ribbon: 'lower', drawType: 'digital-craft', color: '#1e3a5f' },
  { id: 'l-motion', name: 'Motion Lab', ribbon: 'lower', drawType: 'motion-lab', color: '#0047bb' },
  { id: 'l-creative', name: 'Creative Code', ribbon: 'lower', drawType: 'creative-code', color: '#f8fafc' },
  { id: 'l-andrey', name: 'Andrey Rondón', ribbon: 'lower', drawType: 'andrey-signature', color: '#15131a' },
  { id: 'l-audio', name: 'Experimental Sound', ribbon: 'lower', drawType: 'audio-visual', color: '#121118' },
]

const cornerRadius = ref(10) // Radio de curvatura en esquinas G1

// ============================================================================
// DINÁMICA FÍSICA DE ARRASTRE E INERCIA CONTINUA (HILERA SIN SOLAPAMIENTO)
// ============================================================================
const currentScroll = ref(0)
const targetScroll = ref(0)
const pointerVelocity = ref(0)
const isDragging = ref(false)

let lastPointerX = 0
let lastPointerTime = 0
let animationFrameId: number | null = null
let lastFrameTime = performance.now()

const LERP_LAMBDA = 11.0
const DRAG_SENSITIVITY = 1.95
const FLICK_MULTIPLIER = 0.40
const ITEMS_COUNT = 8

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpPoint(a: Point2D, b: Point2D, t: number): Point2D {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
  }
}

// Evalúa la geometría exacta que corresponde a cualquier posición continua p en la pista [0..5]
function interpolateSlotShape(slots: CurvedCard[], p: number) {
  const clamped = Math.max(0, Math.min(5, p))
  const slotA = Math.floor(clamped)
  const slotB = Math.min(5, slotA + 1)
  const frac = clamped - slotA
  // Smoothstep C1: derivada continua para suavidad total
  const t = frac * frac * (3 - 2 * frac)

  const sA = slots[slotA]!
  const sB = slots[slotB]!

  const p1 = lerpPoint(sA.p1, sB.p1, t)
  const p2 = lerpPoint(sA.p2, sB.p2, t)
  const p3 = lerpPoint(sA.p3, sB.p3, t)
  const p4 = lerpPoint(sA.p4, sB.p4, t)
  const cTop = lerpPoint(sA.cTop, sB.cTop, t)
  const cRight = lerpPoint(sA.cRight, sB.cRight, t)
  const cBot = lerpPoint(sA.cBot, sB.cBot, t)
  const cLeft = lerpPoint(sA.cLeft, sB.cLeft, t)

  const xs = [p1.x, p2.x, p3.x, p4.x, cTop.x, cBot.x, cLeft.x, cRight.x]
  const ys = [p1.y, p2.y, p3.y, p4.y, cTop.y, cBot.y, cLeft.y, cRight.y]
  const minX = Math.min(...xs) - 4
  const minY = Math.min(...ys) - 4
  const w = Math.max(...xs) - minX + 8
  const h = Math.max(...ys) - minY + 8

  return { p1, p2, p3, p4, cTop, cRight, cBot, cLeft, minX, minY, w, h }
}

interface ActiveRowCard extends CurvedCard {
  opacity: number
  zIndex: number
  visible: boolean
}

// Tarjetas activas calculadas en estricta hilera continua
const activeRowCards = computed<ActiveRowCard[]>(() => {
  const result: ActiveRowCard[] = []
  const scroll = currentScroll.value

  // 1. CINTA SUPERIOR: hilera estricta, una tras de otra
  for (let k = 0; k < upperItems.length; k++) {
    const item = upperItems[k]!
    const rawPos = (k + 1) - scroll
    // Envoltura modular limpia
    const pos = (((rawPos - (-1.5)) % ITEMS_COUNT) + ITEMS_COUNT) % ITEMS_COUNT + (-1.5)

    if (pos < -0.8 || pos > 5.2) continue

    const shape = interpolateSlotShape(upperCalibratedSlots, pos)

    let op = 1.0
    if (pos < 0.6) {
      op = Math.max(0, Math.min(1, (pos - (-0.4)) / 1.0))
    } else if (pos > 4.1) {
      op = Math.max(0, Math.min(1, (5.1 - pos) / 1.0))
    }

    const zIndex = Math.round(50 - pos * 8)

    result.push({
      id: item.id,
      name: item.name,
      ribbon: 'upper',
      color: item.color,
      drawType: item.drawType,
      ...shape,
      opacity: op,
      zIndex,
      visible: op > 0.01,
    })
  }

  // 2. CINTA INFERIOR: hilera estricta, una tras de otra
  for (let k = 0; k < lowerItems.length; k++) {
    const item = lowerItems[k]!
    const rawPos = (k + 1) - scroll
    const pos = (((rawPos - (-1.5)) % ITEMS_COUNT) + ITEMS_COUNT) % ITEMS_COUNT + (-1.5)

    if (pos < -0.8 || pos > 5.2) continue

    const shape = interpolateSlotShape(lowerCalibratedSlots, pos)

    let op = 1.0
    if (pos < 0.6) {
      op = Math.max(0, Math.min(1, (pos - (-0.4)) / 1.0))
    } else if (pos > 4.1) {
      op = Math.max(0, Math.min(1, (5.1 - pos) / 1.0))
    }

    const zIndex = Math.round(50 - pos * 8)

    result.push({
      id: item.id,
      name: item.name,
      ribbon: 'lower',
      color: item.color,
      drawType: item.drawType,
      ...shape,
      opacity: op,
      zIndex,
      visible: op > 0.01,
    })
  }

  return result
})

// ============================================================================
// BUCLE DE FÍSICA E INERCIA FLUÍDA
// ============================================================================
const runPhysicsLoop = () => {
  const now = performance.now()
  const dt = Math.min((now - lastFrameTime) / 1000, 0.05)
  lastFrameTime = now

  const alpha = 1.0 - Math.exp(-LERP_LAMBDA * dt)
  currentScroll.value += (targetScroll.value - currentScroll.value) * alpha

  if (!isDragging.value && Math.abs(pointerVelocity.value) > 0.0001) {
    targetScroll.value += pointerVelocity.value * dt
    pointerVelocity.value *= Math.exp(-4.2 * dt)
  }

  animationFrameId = requestAnimationFrame(runPhysicsLoop)
}

// ============================================================================
// GESTOS TÁCTILES Y RATÓN
// ============================================================================
const svgRef = ref<SVGSVGElement | null>(null)

const onStagePointerDown = (e: PointerEvent) => {
  if (e.button !== 0) return
  isDragging.value = true
  lastPointerX = e.clientX
  lastPointerTime = performance.now()
  pointerVelocity.value = 0
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

const onStagePointerMove = (e: PointerEvent) => {
  if (!isDragging.value || !svgRef.value) return
  const now = performance.now()
  const dt = Math.max(now - lastPointerTime, 1)
  const dx = e.clientX - lastPointerX

  const stageWidth = svgRef.value.getBoundingClientRect().width || 800
  const dragScale = DRAG_SENSITIVITY / stageWidth

  targetScroll.value -= dx * dragScale
  pointerVelocity.value = (-dx / dt) * 1000 * dragScale

  lastPointerX = e.clientX
  lastPointerTime = now
}

const onStagePointerUp = (e: PointerEvent) => {
  if (!isDragging.value) return
  isDragging.value = false

  const elapsed = performance.now() - lastPointerTime
  if (elapsed > 85) {
    pointerVelocity.value = 0
  } else {
    pointerVelocity.value = Math.max(-14, Math.min(14, pointerVelocity.value * FLICK_MULTIPLIER))
  }
}

const onStageWheel = (e: WheelEvent) => {
  const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
  targetScroll.value += Math.sign(delta) * Math.min(Math.abs(delta) * 0.0018, 0.35)
}

// ============================================================================
// ESQUINAS CURVAS TANGENCIALES BÉZIER CONTINUAS (FILLET G1)
// ============================================================================
function evalQuad(p0: Point2D, p1: Point2D, p2: Point2D, t: number): Point2D {
  const mt = 1 - t
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  }
}

function subQuadControl(p0: Point2D, p1: Point2D, p2: Point2D, t1: number, t2: number): Point2D {
  const mt1 = 1 - t1
  const mt2 = 1 - t2
  return {
    x: mt1 * mt2 * p0.x + (mt1 * t2 + t1 * mt2) * p1.x + t1 * t2 * p2.x,
    y: mt1 * mt2 * p0.y + (mt1 * t2 + t1 * mt2) * p1.y + t1 * t2 * p2.y,
  }
}

function getCurvedCardPath(c: CurvedCard, radius = cornerRadius.value): string {
  if (radius <= 0.5) {
    return `
      M ${c.p1.x.toFixed(1)} ${c.p1.y.toFixed(1)}
      Q ${c.cTop.x.toFixed(1)} ${c.cTop.y.toFixed(1)}, ${c.p2.x.toFixed(1)} ${c.p2.y.toFixed(1)}
      Q ${c.cRight.x.toFixed(1)} ${c.cRight.y.toFixed(1)}, ${c.p4.x.toFixed(1)} ${c.p4.y.toFixed(1)}
      Q ${c.cBot.x.toFixed(1)} ${c.cBot.y.toFixed(1)}, ${c.p3.x.toFixed(1)} ${c.p3.y.toFixed(1)}
      Q ${c.cLeft.x.toFixed(1)} ${c.cLeft.y.toFixed(1)}, ${c.p1.x.toFixed(1)} ${c.p1.y.toFixed(1)}
      Z
    `
  }

  const lenTop = Math.hypot(c.p2.x - c.p1.x, c.p2.y - c.p1.y)
  const lenRight = Math.hypot(c.p4.x - c.p2.x, c.p4.y - c.p2.y)
  const lenBot = Math.hypot(c.p3.x - c.p4.x, c.p3.y - c.p4.y)
  const lenLeft = Math.hypot(c.p1.x - c.p3.x, c.p1.y - c.p3.y)

  const tTop = Math.min(radius / Math.max(lenTop, 1), 0.35)
  const tRight = Math.min(radius / Math.max(lenRight, 1), 0.35)
  const tBot = Math.min(radius / Math.max(lenBot, 1), 0.35)
  const tLeft = Math.min(radius / Math.max(lenLeft, 1), 0.35)

  const topStart = evalQuad(c.p1, c.cTop, c.p2, tTop)
  const topEnd = evalQuad(c.p1, c.cTop, c.p2, 1 - tTop)
  const topCtrl = subQuadControl(c.p1, c.cTop, c.p2, tTop, 1 - tTop)

  const rightStart = evalQuad(c.p2, c.cRight, c.p4, tRight)
  const rightEnd = evalQuad(c.p2, c.cRight, c.p4, 1 - tRight)
  const rightCtrl = subQuadControl(c.p2, c.cRight, c.p4, tRight, 1 - tRight)

  const botStart = evalQuad(c.p4, c.cBot, c.p3, tBot)
  const botEnd = evalQuad(c.p4, c.cBot, c.p3, 1 - tBot)
  const botCtrl = subQuadControl(c.p4, c.cBot, c.p3, tBot, 1 - tBot)

  const leftStart = evalQuad(c.p3, c.cLeft, c.p1, tLeft)
  const leftEnd = evalQuad(c.p3, c.cLeft, c.p1, 1 - tLeft)
  const leftCtrl = subQuadControl(c.p3, c.cLeft, c.p1, tLeft, 1 - tLeft)

  return `
    M ${topStart.x.toFixed(1)} ${topStart.y.toFixed(1)}
    Q ${topCtrl.x.toFixed(1)} ${topCtrl.y.toFixed(1)}, ${topEnd.x.toFixed(1)} ${topEnd.y.toFixed(1)}
    Q ${c.p2.x.toFixed(1)} ${c.p2.y.toFixed(1)}, ${rightStart.x.toFixed(1)} ${rightStart.y.toFixed(1)}
    Q ${rightCtrl.x.toFixed(1)} ${rightCtrl.y.toFixed(1)}, ${rightEnd.x.toFixed(1)} ${rightEnd.y.toFixed(1)}
    Q ${c.p4.x.toFixed(1)} ${c.p4.y.toFixed(1)}, ${botStart.x.toFixed(1)} ${botStart.y.toFixed(1)}
    Q ${botCtrl.x.toFixed(1)} ${botCtrl.y.toFixed(1)}, ${botEnd.x.toFixed(1)} ${botEnd.y.toFixed(1)}
    Q ${c.p3.x.toFixed(1)} ${c.p3.y.toFixed(1)}, ${leftStart.x.toFixed(1)} ${leftStart.y.toFixed(1)}
    Q ${leftCtrl.x.toFixed(1)} ${leftCtrl.y.toFixed(1)}, ${leftEnd.x.toFixed(1)} ${leftEnd.y.toFixed(1)}
    Q ${c.p1.x.toFixed(1)} ${c.p1.y.toFixed(1)}, ${topStart.x.toFixed(1)} ${topStart.y.toFixed(1)}
    Z
  `
}

// ============================================================================
// GENERACIÓN DE TEXTURAS OFICIALES EN ALTA DEFINICIÓN
// ============================================================================
const textureUrls = ref<Record<string, string>>({})

const allUniqueDrawTypes = [
  'contra-asterisk', 'urban-sketch', 'editorial-beauty', 'trueform-music',
  'spatial-design', 'ai-blueprint', 'neutral-archive', 'kinetic-type',
  'swiss-pmm', 'red-duotone', 'harbor-waves', 'digital-craft',
  'motion-lab', 'creative-code', 'andrey-signature', 'audio-visual',
]

const generateTextures = () => {
  const w = 800
  const h = 600
  const cx = w / 2
  const cy = h / 2

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  allUniqueDrawTypes.forEach((type) => {
    ctx.clearRect(0, 0, w, h)

    switch (type) {
      case 'contra-asterisk': {
        ctx.fillStyle = '#0052ff'
        ctx.fillRect(0, 0, w, h)

        ctx.save()
        ctx.translate(cx, cy - 20)
        ctx.rotate(-0.42)
        ctx.fillStyle = '#faf6ea'
        ctx.beginPath()
        ctx.ellipse(0, 0, 260, 160, 0, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#0a1945'
        for (let i = 0; i < 8; i++) {
          const ang = (i * Math.PI) / 4
          ctx.save()
          ctx.rotate(ang)
          ctx.beginPath()
          ctx.ellipse(0, -65, 24, 55, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
        ctx.beginPath()
        ctx.arc(0, 0, 34, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        break
      }

      case 'urban-sketch': {
        ctx.fillStyle = '#ff6600'
        ctx.fillRect(0, 0, w, h)

        ctx.fillStyle = '#f05a00'
        ctx.fillRect(cx - 150, 40, 300, h - 80)

        ctx.strokeStyle = '#18151c'
        ctx.lineWidth = 2.5
        for (let y = 60; y < h - 60; y += 28) {
          ctx.beginPath()
          ctx.moveTo(cx - 140, y)
          ctx.lineTo(cx + 140, y)
          ctx.stroke()
        }

        ctx.fillStyle = '#ffe2b0'
        ctx.beginPath()
        ctx.arc(cx - 20, cy - 60, 35, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = '#18151c'
        ctx.beginPath()
        ctx.ellipse(cx - 20, cy - 85, 45, 15, -0.15, 0, Math.PI * 2)
        ctx.fill()
        break
      }

      case 'editorial-beauty': {
        ctx.fillStyle = '#ede8df'
        ctx.fillRect(0, 0, w, h)

        const skinGrad = ctx.createRadialGradient(cx + 20, cy - 10, 30, cx + 20, cy, 220)
        skinGrad.addColorStop(0, '#c78964')
        skinGrad.addColorStop(1, '#5c2d1b')
        ctx.fillStyle = skinGrad
        ctx.beginPath()
        ctx.arc(cx + 20, cy, 180, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#181315'
        for (let i = 0; i < 16; i++) {
          const ang = (i / 16) * Math.PI * 2
          ctx.beginPath()
          ctx.arc(cx + 20 + Math.cos(ang) * 190, cy + Math.sin(ang) * 190, 50, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.fillStyle = '#00d2ff'
        ctx.beginPath()
        ctx.ellipse(cx - 20, cy - 40, 30, 14, -0.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(cx + 60, cy - 36, 30, 14, 0.2, 0, Math.PI * 2)
        ctx.fill()
        break
      }

      case 'trueform-music': {
        const bgGrad = ctx.createLinearGradient(0, 0, w, h)
        bgGrad.addColorStop(0, '#8b1515')
        bgGrad.addColorStop(0.5, '#350a0a')
        bgGrad.addColorStop(1, '#15131a')
        ctx.fillStyle = bgGrad
        ctx.fillRect(0, 0, w, h)

        const glow = ctx.createRadialGradient(w - 100, 120, 10, w - 100, 120, 180)
        glow.addColorStop(0, 'rgba(255, 75, 55, 0.9)')
        glow.addColorStop(1, 'rgba(255, 75, 55, 0)')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(w - 100, 120, 180, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#ffffff'
        ctx.font = '900 82px "Space Grotesk Variable", sans-serif'
        ctx.fillText('TRUEFORM', 50, h - 140)
        ctx.font = '900 64px "Space Grotesk Variable", sans-serif'
        ctx.fillStyle = '#fca5a5'
        ctx.fillText('MUSIC™', 50, h - 70)
        break
      }

      case 'spatial-design': {
        ctx.fillStyle = '#f4f2eb'
        ctx.fillRect(0, 0, w, h)

        ctx.fillStyle = '#18151c'
        ctx.font = '700 54px "Space Grotesk Variable", sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText('SPATIAL INTERFACES', 80, 150)

        ctx.fillStyle = '#71717a'
        ctx.font = '500 26px "Space Grotesk Variable", sans-serif'
        ctx.fillText('DESIGN SYSTEM TOKENS // 2026', 80, 205)

        ctx.fillStyle = '#0052ff'
        ctx.beginPath()
        ctx.roundRect(80, 270, w - 160, 140, 16)
        ctx.fill()

        ctx.fillStyle = '#ffffff'
        ctx.font = '700 36px "Space Grotesk Variable", sans-serif'
        ctx.fillText('IMMERSIVE 3D MANIFOLD', 120, 355)
        break
      }

      case 'ai-blueprint': {
        ctx.fillStyle = '#1e293b'
        ctx.fillRect(0, 0, w, h)

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
        ctx.lineWidth = 1.5
        for (let x = 0; x < w; x += 60) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, h)
          ctx.stroke()
        }
        for (let y = 0; y < h; y += 60) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(w, y)
          ctx.stroke()
        }

        ctx.strokeStyle = '#38bdf8'
        ctx.lineWidth = 3.5
        ctx.strokeRect(cx - 200, cy - 120, 400, 240)

        ctx.fillStyle = '#ffffff'
        ctx.font = '700 48px "Space Grotesk Variable", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('AI ARCHITECTURE', cx, cy - 10)
        break
      }

      case 'swiss-pmm': {
        ctx.fillStyle = '#f6f5ee'
        ctx.fillRect(0, 0, w, h)

        const pad = 40
        const cw = (w - pad * 3) / 2
        const ch = (h - pad * 3) / 2

        ctx.fillStyle = '#0052ff'
        ctx.beginPath()
        ctx.roundRect(pad, pad, cw, ch, 14)
        ctx.fill()

        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.roundRect(pad * 2 + cw, pad, cw, ch, 14)
        ctx.fill()

        ctx.fillStyle = '#18151c'
        ctx.beginPath()
        ctx.roundRect(pad, pad * 2 + ch, cw, ch, 14)
        ctx.fill()

        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.roundRect(pad * 2 + cw, pad * 2 + ch, cw, ch, 14)
        ctx.fill()

        ctx.fillStyle = '#0d2561'
        ctx.font = '900 90px "Space Grotesk Variable", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('PMM', pad * 2 + cw + cw / 2, pad * 2 + ch + ch * 0.6)
        break
      }

      case 'red-duotone': {
        const bgGrad = ctx.createRadialGradient(cx, cy, 50, cx, cy, 320)
        bgGrad.addColorStop(0, '#ff4500')
        bgGrad.addColorStop(0.6, '#cc1100')
        bgGrad.addColorStop(1, '#5c0000')
        ctx.fillStyle = bgGrad
        ctx.fillRect(0, 0, w, h)

        ctx.fillStyle = '#ffaa44'
        ctx.beginPath()
        ctx.arc(cx - 20, cy - 10, 160, 0, Math.PI * 2)
        ctx.fill()
        break
      }

      case 'harbor-waves': {
        ctx.fillStyle = '#0f224a'
        ctx.fillRect(0, 0, w, h)

        ctx.lineWidth = 2.5
        for (let r = 0; r < 12; r++) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.06 + r * 0.04})`
          ctx.beginPath()
          ctx.ellipse(cx - 50 + r * 15, cy + 40, 180 + r * 22, 110 + r * 14, 0.45, 0, Math.PI * 2)
          ctx.stroke()
        }

        ctx.fillStyle = '#ffffff'
        ctx.font = '700 52px "Space Grotesk Variable", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Harbor', cx, cy + 18)
        break
      }

      case 'digital-craft': {
        ctx.fillStyle = '#1e3a5f'
        ctx.fillRect(0, 0, w, h)

        const screenGrad = ctx.createLinearGradient(cx - 160, cy - 110, cx + 160, cy + 110)
        screenGrad.addColorStop(0, '#00b4d8')
        screenGrad.addColorStop(1, '#0077b6')
        ctx.fillStyle = screenGrad
        ctx.beginPath()
        ctx.roundRect(cx - 160, cy - 110, 320, 220, 18)
        ctx.fill()

        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 6
        ctx.beginPath()
        ctx.moveTo(cx - 50, cy + 50)
        ctx.lineTo(cx + 80, cy - 80)
        ctx.stroke()
        break
      }

      case 'motion-lab': {
        ctx.fillStyle = '#0047bb'
        ctx.fillRect(0, 0, w, h)

        ctx.fillStyle = '#ffffff'
        ctx.font = '900 78px "Space Grotesk Variable", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('MOTION LAB', cx, cy - 20)

        ctx.font = '500 28px "Space Grotesk Variable", sans-serif'
        ctx.fillStyle = '#93c5fd'
        ctx.fillText('PHYSICS & INERTIAL FLOW', cx, cy + 45)
        break
      }

      case 'creative-code': {
        ctx.fillStyle = '#f8fafc'
        ctx.fillRect(0, 0, w, h)

        ctx.fillStyle = '#15131a'
        ctx.font = '900 68px "Space Grotesk Variable", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('CREATIVE CODE', cx, cy - 25)

        ctx.font = '500 26px "Space Grotesk Variable", sans-serif'
        ctx.fillStyle = '#0052ff'
        ctx.fillText('HIGH-PERFORMANCE INTERFACE', cx, cy + 35)
        break
      }

      case 'neutral-archive': {
        ctx.fillStyle = '#f1efe7'
        ctx.fillRect(0, 0, w, h)

        ctx.fillStyle = '#18181b'
        ctx.font = '700 58px "Space Grotesk Variable", sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText('SYSTEM ARCHIVE', 80, 150)

        ctx.fillStyle = '#71717a'
        ctx.font = '500 26px "Space Grotesk Variable", sans-serif'
        ctx.fillText('COLLECTION 2026 // INDEX 08', 80, 205)
        break
      }

      case 'kinetic-type': {
        ctx.fillStyle = '#18181b'
        ctx.fillRect(0, 0, w, h)

        ctx.fillStyle = '#ffffff'
        ctx.font = '900 96px "Space Grotesk Variable", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('KINETIC', cx, cy - 35)
        ctx.fillText('DISPLAY', cx, cy + 65)
        break
      }

      case 'andrey-signature': {
        ctx.fillStyle = '#15131a'
        ctx.fillRect(0, 0, w, h)

        ctx.fillStyle = '#ffffff'
        ctx.font = '900 64px "Space Grotesk Variable", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('ANDREY RONDÓN', cx, cy - 20)

        ctx.fillStyle = '#9ca3af'
        ctx.font = '500 26px "Space Grotesk Variable", sans-serif'
        ctx.fillText('PORTFOLIO 2026', cx, cy + 35)
        break
      }

      case 'audio-visual': {
        ctx.fillStyle = '#121118'
        ctx.fillRect(0, 0, w, h)

        ctx.fillStyle = '#ffffff'
        ctx.font = '700 52px "Space Grotesk Variable", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('EXPERIMENTAL SOUND', cx, cy)
        break
      }
    }

    textureUrls.value[type] = canvas.toDataURL('image/jpeg', 0.92)
  })
}

onMounted(() => {
  generateTextures()
  runPhysicsLoop()
})

onBeforeUnmount(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
})
</script>

<template>
  <div class="contra-carousel-root">
    <div class="stage-wrapper">
      <div
        class="stage-frame"
        :class="{ 'stage-frame--grabbing': isDragging }"
        @pointerdown="onStagePointerDown"
        @pointermove="onStagePointerMove"
        @pointerup="onStagePointerUp"
        @wheel.passive="onStageWheel"
      >
        <!-- SVG DE RENDER DE LAS TARJETAS EN HILERA CONTINUA CON FORMAS CALIBRADAS 1:1 -->
        <svg
          ref="svgRef"
          class="stage-svg"
          viewBox="0 0 735 414"
          preserveAspectRatio="none"
        >
          <defs>
            <!-- ClipPath con esquinas curvas exactas para cada tarjeta activa -->
            <clipPath v-for="c in activeRowCards" :key="'clip-' + c.id" :id="'clip-' + c.id">
              <path :d="getCurvedCardPath(c)" />
            </clipPath>
          </defs>

          <!-- RENDER DE CADA TARJETA EN LA HILERA -->
          <g
            v-for="c in activeRowCards"
            :key="c.id"
            :style="{ opacity: c.opacity, zIndex: c.zIndex }"
            class="card-group"
            @click="$emit('select-card', c)"
          >
            <!-- Imagen de textura recortada con bordes curvos calibrados y esquinas redondeadas -->
            <image
              v-if="textureUrls[c.drawType]"
              :href="textureUrls[c.drawType]"
              :x="c.minX"
              :y="c.minY"
              :width="c.w"
              :height="c.h"
              preserveAspectRatio="none"
              :clip-path="`url(#clip-${c.id})`"
              class="card-texture-img"
            />

            <!-- Borde exterior curvado elegante con esquinas redondeadas -->
            <path
              :d="getCurvedCardPath(c)"
              fill="none"
              stroke="rgba(255, 255, 255, 0.92)"
              stroke-width="1.3"
              class="card-curved-path"
            />
          </g>
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.contra-carousel-root {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.stage-wrapper {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.stage-frame {
  position: relative;
  aspect-ratio: 735 / 414;
  width: min(100vw, calc(100vh * (735 / 414)));
  height: min(100vh, calc(100vw * (414 / 735)));
  pointer-events: auto;
  user-select: none;
  touch-action: none;
  cursor: grab;
}

.stage-frame--grabbing {
  cursor: grabbing !important;
}

.stage-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.card-group {
  cursor: pointer;
  pointer-events: auto;
  transition: opacity 0.08s ease;
}

.card-texture-img {
  cursor: grab;
  filter: drop-shadow(0 10px 28px rgba(0, 0, 0, 0.32));
  transition: opacity 0.15s ease;
}

.stage-frame--grabbing .card-texture-img {
  cursor: grabbing;
}

.card-curved-path {
  pointer-events: none;
}
</style>
