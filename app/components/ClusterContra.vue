<script setup lang="ts">
import * as THREE from 'three'
import { bulgeVertexShader, bulgeFragmentShader } from '~/shaders/bulge'
import {
  createClusterBody,
  createClusterFrameOptions,
  composeClusterFrame,
  applyScrollImpulse,
  type ClusterBody,
  type ClusterFrameOptions,
} from '~/composables/useClusterPhysics'
import type { SceneContext } from '~/components/WebGLScene.vue'

interface ClusterCard {
  id: string
  label: string
  color: number
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
  curvature: number
  radius: number
  placeholderNote: string
}

const ARC_CARDS: ClusterCard[] = [
  {
    id: 'card-1',
    label: 'Arco superior · 1',
    color: 0x0020c2,
    position: [-3.8, 1.6, 0.4],
    rotation: [0.18, -0.42, -0.05],
    scale: 1.45,
    curvature: 0.45,
    radius: 0.12,
    placeholderNote: 'Azul cobalto · texto simbólico omitido en placeholder',
  },
  {
    id: 'card-2',
    label: 'Arco superior · 2',
    color: 0xe66826,
    position: [-1.4, 0.95, 0.0],
    rotation: [0.08, -0.22, 0.04],
    scale: 1.05,
    curvature: 0.28,
    radius: 0.12,
    placeholderNote: 'Radiant Earth · ilustración line-art omitida en placeholder',
  },
  {
    id: 'card-3',
    label: 'Arco superior · 3',
    color: 0xf5d4b0,
    position: [1.1, 0.45, -0.6],
    rotation: [0.04, 0.04, 0.02],
    scale: 0.72,
    curvature: 0.18,
    radius: 0.12,
    placeholderNote: 'Retrato cálido · fotografía omitida en placeholder',
  },
  {
    id: 'card-4',
    label: 'Arco superior · 4',
    color: 0x8b0000,
    position: [3.2, 0.05, -1.4],
    rotation: [-0.04, 0.22, -0.02],
    scale: 0.5,
    curvature: 0.12,
    radius: 0.12,
    placeholderNote: 'TRUEFORM MUSIC™ · tipografía omitida en placeholder',
  },
  {
    id: 'card-5',
    label: 'Arco inferior · 5',
    color: 0x0020c2,
    position: [-3.8, -1.6, 0.4],
    rotation: [-0.18, -0.42, 0.05],
    scale: 1.45,
    curvature: 0.45,
    radius: 0.12,
    placeholderNote: 'PMM People Made Machines · UI screenshots omitidos en placeholder',
  },
  {
    id: 'card-6',
    label: 'Arco inferior · 6',
    color: 0xc14629,
    position: [-1.4, -0.95, 0.0],
    rotation: [-0.08, -0.22, -0.04],
    scale: 1.05,
    curvature: 0.28,
    radius: 0.12,
    placeholderNote: 'Saturación rojo/naranja · fotografía omitida en placeholder',
  },
  {
    id: 'card-7',
    label: 'Arco inferior · 7',
    color: 0x1e3a8a,
    position: [1.1, -0.45, -0.6],
    rotation: [-0.04, 0.04, -0.02],
    scale: 0.72,
    curvature: 0.18,
    radius: 0.12,
    placeholderNote: 'Harbor · isotipo de ondas omitido en placeholder',
  },
  {
    id: 'card-8',
    label: 'Arco inferior · 8',
    color: 0xb0b0b0,
    position: [3.2, -0.05, -1.4],
    rotation: [0.04, 0.22, 0.02],
    scale: 0.5,
    curvature: 0.12,
    radius: 0.12,
    placeholderNote: 'Lápiz óptico · fotografía omitida en placeholder',
  },
]

interface Props {
  ctx: SceneContext
}

const props = defineProps<Props>()

const meshes: THREE.Mesh[] = []
const materials: THREE.ShaderMaterial[] = []
let sharedGeometry: THREE.PlaneGeometry | null = null
const bodies: ClusterBody[] = []
let frameOptions: ClusterFrameOptions | null = null
let renderCallback: ((deltaTime: number, elapsedTime: number) => void) | null = null
let wheelHandler: ((event: WheelEvent) => void) | null = null

const CARD_WIDTH = 1.1
const CARD_HEIGHT = 0.75
const CARD_SEGMENTS = 64

const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false

const buildCluster = () => {
  sharedGeometry = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_SEGMENTS, CARD_SEGMENTS)

  for (const card of ARC_CARDS) {
    const material = new THREE.ShaderMaterial({
      vertexShader: bulgeVertexShader,
      fragmentShader: bulgeFragmentShader,
      uniforms: {
        uCurvature: { value: card.curvature },
        uColor: { value: new THREE.Color(card.color) },
        uOpacity: { value: 0.92 },
        uRadius: { value: card.radius },
      },
      transparent: true,
      side: THREE.DoubleSide,
    })

    const mesh = new THREE.Mesh(sharedGeometry, material)
    mesh.position.set(...card.position)
    mesh.rotation.set(...card.rotation)
    mesh.scale.setScalar(card.scale)
    mesh.userData = {
      cardId: card.id,
      cardLabel: card.label,
      placeholderNote: card.placeholderNote,
    }

    props.ctx.scene.add(mesh)
    meshes.push(mesh)
    materials.push(material)

    const mass = 1.0 + (card.scale - 0.5) * 0.4
    bodies.push(createClusterBody(card.id, mesh, mass))
  }

  frameOptions = createClusterFrameOptions(new THREE.Vector3(0, 0, -0.3))

  if (!prefersReducedMotion) {
    renderCallback = (deltaTime: number) => {
      if (!frameOptions) return
      const speed = composeClusterFrame(bodies, frameOptions, Math.min(deltaTime, 0.033))
      if (props.ctx.updateRadialBlurVelocity) {
        props.ctx.updateRadialBlurVelocity(speed)
      }
    }
    props.ctx.registerRenderCallback(renderCallback)

    wheelHandler = (event: WheelEvent) => {
      if (!bodies.length) return
      event.preventDefault()
      const delta = Math.sign(event.deltaY) * Math.min(Math.abs(event.deltaY), 80) / 80
      applyScrollImpulse(bodies, delta, 0.6)
    }
    window.addEventListener('wheel', wheelHandler, { passive: false })
  }
}

onMounted(buildCluster)

onBeforeUnmount(() => {
  if (renderCallback && props.ctx.unregisterRenderCallback) {
    props.ctx.unregisterRenderCallback(renderCallback)
    renderCallback = null
  }
  if (wheelHandler) {
    window.removeEventListener('wheel', wheelHandler)
    wheelHandler = null
  }
  for (const mesh of meshes) {
    props.ctx.scene.remove(mesh)
  }
  for (const material of materials) {
    material.dispose()
  }
  sharedGeometry?.dispose()
  meshes.length = 0
  materials.length = 0
  bodies.length = 0
  sharedGeometry = null
})

defineExpose({ meshes, bodies, prefersReducedMotion })
</script>

<template>
  <span aria-hidden="true" style="display: none" />
</template>