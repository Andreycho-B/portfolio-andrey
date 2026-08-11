<script setup lang="ts">
import * as THREE from 'three'
import { cardVertexShader, cardFragmentShader } from '~/shaders/cardShader'
import type { SceneContext } from '~/components/WebGLScene.vue'

const CARD_COUNT = 8
const PROJECT_COUNT = 4
const CARD_WIDTH = 2.0
const CARD_HEIGHT = 2.6
const CARD_SEGMENTS = 32
const SPACING = 2.2
const ARC_DEPTH = 3.0
const ARC_AMPLITUDE = 1.2
const ARC_FREQUENCY = 0.35
const MESH_CURVATURE = 0.8
const SPAN = (CARD_COUNT - 1) * SPACING

const PROJECTS = [
  { color: 0x1B2A5E },
  { color: 0xE89A3F },
  { color: 0xB83A2A },
  { color: 0x2747A8 },
]

interface Props {
  ctx: SceneContext
}

const props = defineProps<Props>()

const meshes: THREE.Mesh[] = []
const materials: THREE.ShaderMaterial[] = []
let sharedGeometry: THREE.PlaneGeometry | null = null
let renderCallback: ((deltaTime: number, elapsedTime: number) => void) | null = null

const cardOffsets: number[] = []

const computeArcPoint = (t: number, out: THREE.Vector3) => {
  out.set(
    t,
    Math.sin(t * ARC_FREQUENCY) * ARC_AMPLITUDE,
    -((t * t) / SPAN) * ARC_DEPTH,
  )
}

const buildCluster = () => {
  sharedGeometry = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_SEGMENTS, CARD_SEGMENTS)

  for (let i = 0; i < CARD_COUNT; i++) {
    const t = (i - (CARD_COUNT - 1) / 2) * SPACING
    cardOffsets.push(t)

    const projectIndex = Math.abs(i % PROJECT_COUNT)
    const project = PROJECTS[projectIndex]

    const material = new THREE.ShaderMaterial({
      vertexShader: cardVertexShader,
      fragmentShader: cardFragmentShader,
      uniforms: {
        uCurvature: { value: MESH_CURVATURE },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(CARD_WIDTH, CARD_HEIGHT) },
        uColor: { value: new THREE.Color(project.color) },
        uRadius: { value: 0.08 },
        uOpacity: { value: 0.95 },
      },
      transparent: true,
      side: THREE.DoubleSide,
    })

    const mesh = new THREE.Mesh(sharedGeometry, material)

    const p = new THREE.Vector3()
    computeArcPoint(t, p)
    mesh.position.copy(p)

    const tangent = new THREE.Vector3()
    const ahead = new THREE.Vector3()
    computeArcPoint(t + 0.1, ahead)
    tangent.subVectors(ahead, p).normalize()
    const up = new THREE.Vector3(0, 1, 0)
    const target = new THREE.Vector3().addVectors(p, tangent)
    mesh.lookAt(target)

    mesh.userData = { cardIndex: i, projectIndex }

    props.ctx.scene.add(mesh)
    meshes.push(mesh)
    materials.push(material)
  }

  let offset = 0

  renderCallback = (_delta: number, elapsed: number) => {
    offset += 0.01

    for (let i = 0; i < CARD_COUNT; i++) {
      const mesh = meshes[i]
      const material = materials[i]
      material.uniforms.uTime.value = elapsed

      let t = cardOffsets[i] + offset
      const limit = SPAN / 2 + SPACING

      while (t > limit) {
        t -= SPAN + SPACING * 2
        cardOffsets[i] -= SPAN + SPACING * 2
        const idx = Math.abs(Math.round(cardOffsets[i] / SPACING) % PROJECT_COUNT)
        mesh.userData.projectIndex = idx
        material.uniforms.uColor.value = new THREE.Color(PROJECTS[idx].color)
      }
      while (t < -limit) {
        t += SPAN + SPACING * 2
        cardOffsets[i] += SPAN + SPACING * 2
        const idx = Math.abs(Math.round(cardOffsets[i] / SPACING) % PROJECT_COUNT)
        mesh.userData.projectIndex = idx
        material.uniforms.uColor.value = new THREE.Color(PROJECTS[idx].color)
      }

      const p = new THREE.Vector3()
      computeArcPoint(t, p)
      mesh.position.copy(p)

      const ahead = new THREE.Vector3()
      computeArcPoint(t + 0.1, ahead)
      const tangent = new THREE.Vector3().subVectors(ahead, p).normalize()
      const target = new THREE.Vector3().addVectors(p, tangent)
      mesh.lookAt(target)
    }
  }

  props.ctx.registerRenderCallback(renderCallback)
}

onMounted(buildCluster)

onBeforeUnmount(() => {
  if (renderCallback && props.ctx.unregisterRenderCallback) {
    props.ctx.unregisterRenderCallback(renderCallback)
    renderCallback = null
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
  sharedGeometry = null
})
</script>

<template>
  <span aria-hidden="true" style="display: none" />
</template>