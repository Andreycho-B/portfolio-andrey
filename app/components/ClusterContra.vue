<script setup lang="ts">
import * as THREE from 'three'
import { cardVertexShader, cardFragmentShader } from '~/shaders/cardShader'
import type { SceneContext } from '~/components/WebGLScene.vue'

const CARD_COUNT = 8
const PROJECT_COUNT = 4
const CARD_WIDTH = 1.2
const CARD_HEIGHT = 1.6
const CARD_SEGMENTS = 32
const SPACING = 1.8
const ARC_CURVATURE = 0.3
const ARC_RADIUS = 6.0
const RECYCLE_THRESHOLD = (CARD_COUNT / 2) * SPACING

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

const cardPositions: number[] = []

const buildCluster = () => {
  sharedGeometry = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_SEGMENTS, CARD_SEGMENTS)

  for (let i = 0; i < CARD_COUNT; i++) {
    const arcOffset = (i - (CARD_COUNT - 1) / 2) * SPACING
    const angle = arcOffset / ARC_RADIUS
    const x = Math.sin(angle) * ARC_RADIUS
    const z = Math.cos(angle) * ARC_RADIUS - ARC_RADIUS
    cardPositions.push(arcOffset)

    const projectIndex = i % PROJECT_COUNT
    const project = PROJECTS[projectIndex]

    const material = new THREE.ShaderMaterial({
      vertexShader: cardVertexShader,
      fragmentShader: cardFragmentShader,
      uniforms: {
        uCurvature: { value: ARC_CURVATURE },
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
    mesh.position.set(x, 0, z)
    mesh.lookAt(0, 0, 0)
    mesh.userData = { cardIndex: i, projectIndex }

    props.ctx.scene.add(mesh)
    meshes.push(mesh)
    materials.push(material)
  }

  let offset = 0

  renderCallback = (_delta: number, elapsed: number) => {
    offset += 0.003

    for (let i = 0; i < CARD_COUNT; i++) {
      const mesh = meshes[i]
      const material = materials[i]
      material.uniforms.uTime.value = elapsed

      let pos = cardPositions[i] + offset

      while (pos > RECYCLE_THRESHOLD) {
        pos -= CARD_COUNT * SPACING
        cardPositions[i] -= CARD_COUNT * SPACING
        const newProjectIndex = (Math.floor((cardPositions[i] + 1000) / SPACING) % PROJECT_COUNT + PROJECT_COUNT) % PROJECT_COUNT
        mesh.userData.projectIndex = newProjectIndex
        material.uniforms.uColor.value = new THREE.Color(PROJECTS[newProjectIndex].color)
      }
      while (pos < -RECYCLE_THRESHOLD) {
        pos += CARD_COUNT * SPACING
        cardPositions[i] += CARD_COUNT * SPACING
        const newProjectIndex = (Math.floor((cardPositions[i] + 1000) / SPACING) % PROJECT_COUNT + PROJECT_COUNT) % PROJECT_COUNT
        mesh.userData.projectIndex = newProjectIndex
        material.uniforms.uColor.value = new THREE.Color(PROJECTS[newProjectIndex].color)
      }

      const angle = pos / ARC_RADIUS
      const x = Math.sin(angle) * ARC_RADIUS
      const z = Math.cos(angle) * ARC_RADIUS - ARC_RADIUS
      mesh.position.set(x, 0, z)
      mesh.lookAt(0, 0, 0)
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

