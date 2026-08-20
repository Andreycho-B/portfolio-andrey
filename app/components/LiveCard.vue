<script setup lang="ts">
import * as THREE from 'three'
import type { SceneContext } from '~/components/WebGLScene.vue'

// Tarjeta tipo fotografía impresa (polaroid) compuesta en canvas 2D con las fuentes
// del documento y subida a WebGL como CanvasTexture. El dibujo es programático:
// mismo control que una composición DOM/CSS pero sin dependencias ni captura de DOM.

const CARD_W = 512
const CARD_H = 640
const MARGIN = 40
const PHOTO_SIZE = CARD_W - MARGIN * 2
const RADIUS = 14
const SHADOW_ALPHA = 0.09
const SHADOW_BLUR = 28
const SHADOW_OFFSET = 12

const props = withDefaults(
  defineProps<{
    ctx: SceneContext
    name: string
    index: string
    color?: string
    position?: [number, number, number]
  }>(),
  {
    color: '#0066ff',
    position: () => [1.7, 0, 0],
  },
)

const meshRef = shallowRef<THREE.Mesh | null>(null)

let texture: THREE.CanvasTexture | null = null
let material: THREE.MeshBasicMaterial | null = null
let geometry: THREE.PlaneGeometry | null = null
let disposed = false

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

const drawCard = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // sombra suave de la fotografía impresa
  ctx.save()
  ctx.shadowColor = `rgba(21, 19, 26, ${SHADOW_ALPHA})`
  ctx.shadowBlur = SHADOW_BLUR
  ctx.shadowOffsetY = SHADOW_OFFSET
  ctx.fillStyle = '#ffffff'
  drawRoundedRect(ctx, 0, 0, CARD_W, CARD_H, RADIUS)
  ctx.fill()
  ctx.restore()

  // borde del papel
  ctx.save()
  ctx.strokeStyle = '#e8eaee'
  ctx.lineWidth = 2
  drawRoundedRect(ctx, 1, 1, CARD_W - 2, CARD_H - 2, RADIUS - 1)
  ctx.stroke()
  ctx.restore()

  // zona de fotografía: color sólido en tonos azules (imágenes reales pendientes)
  ctx.save()
  drawRoundedRect(ctx, MARGIN, MARGIN, PHOTO_SIZE, PHOTO_SIZE, 10)
  ctx.fillStyle = props.color
  ctx.fill()
  ctx.restore()

  // separador sutil entre la foto y la zona de texto
  ctx.save()
  ctx.strokeStyle = '#f0f2f5'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(MARGIN + 8, MARGIN + PHOTO_SIZE + 22)
  ctx.lineTo(CARD_W - MARGIN - 8, MARGIN + PHOTO_SIZE + 22)
  ctx.stroke()
  ctx.restore()

  // nombre en Le Murmure (firma tipográfica del autor)
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#15131a'
  ctx.font = '44px "Le Murmure", sans-serif'
  ctx.fillText(props.name, CARD_W / 2, MARGIN + PHOTO_SIZE + 96)
  ctx.restore()

  // índice y año en Space Grotesk
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#9ca3af'
  ctx.font = '500 21px "Space Grotesk Variable", sans-serif'
  ctx.letterSpacing = '8px'
  ctx.fillText(`${props.index}`, CARD_W / 2, MARGIN + PHOTO_SIZE + 146)
  ctx.restore()

  // punto de acento azul eléctrico (identidad)
  ctx.save()
  ctx.fillStyle = '#0066ff'
  ctx.beginPath()
  ctx.arc(CARD_W / 2, MARGIN + PHOTO_SIZE + 176, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

onMounted(async () => {
  try {
    await Promise.all([
      document.fonts.load('400 44px "Le Murmure"'),
      document.fonts.load('500 21px "Space Grotesk Variable"'),
      document.fonts.ready,
    ])
  } catch {
    // fuentes sin cargar: se dibuja igual con las fallbacks
  }
  if (disposed) return

  const canvas = document.createElement('canvas')
  canvas.width = CARD_W
  canvas.height = CARD_H
  drawCard(canvas)

  texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.needsUpdate = true

  material = new THREE.MeshBasicMaterial({ map: texture })
  geometry = new THREE.PlaneGeometry(CARD_W / CARD_H * 1.7, 1.7)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(...props.position)
  props.ctx.scene.add(mesh)
  meshRef.value = mesh
})

onBeforeUnmount(() => {
  disposed = true
  meshRef.value?.removeFromParent()
  geometry?.dispose()
  material?.dispose()
  texture?.dispose()
})
</script>

<template>
  <div class="live-card" aria-hidden="true" />
</template>

<style scoped>
.live-card {
  display: none;
}
</style>