<script setup lang="ts">
import * as THREE from 'three'
import { cardVertexShader, cardFragmentShader } from '~/shaders/cardShader'
import { useGalleryScroll } from '~/composables/useGalleryScroll'
import { useAudioClick } from '~/composables/useAudioClick'
import type { SceneContext } from '~/components/WebGLScene.vue'

const CARD_COUNT = 8
const PROJECT_COUNT = 4
const CARD_WIDTH = 2.0
const CARD_HEIGHT = 2.6
const CARD_SEGMENTS = 32
const SPACING = 3.0
const ARC_DEPTH = 3.0
const ARC_AMPLITUDE = 1.2
const ARC_FREQUENCY = 0.28
const MESH_CURVATURE = 0.8
const SPAN = (CARD_COUNT - 1) * SPACING
const SCROLL_SCALE = 1.0
const STRETCH_FACTOR = 0.6
const ROTATION_BLEND = 0.7
const FADE_BAND = SPACING

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
const scratchP = new THREE.Vector3()
const scratchAhead = new THREE.Vector3()
const scratchTangent = new THREE.Vector3()
const scratchTarget = new THREE.Vector3()
const scratchCamTarget = new THREE.Vector3()

const { state: scroll, bind: bindScroll, unbind: unbindScroll } = useGalleryScroll()
const { resume: resumeAudio, playClick } = useAudioClick()

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

    const projectIndex = i % PROJECT_COUNT
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
        uStretch: { value: 0 },
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
    const target = new THREE.Vector3().addVectors(p, tangent)
    mesh.lookAt(target)

    mesh.userData = { cardIndex: i, projectIndex }

    props.ctx.scene.add(mesh)
    meshes.push(mesh)
    materials.push(material)
  }

  renderCallback = (delta: number, elapsed: number) => {
    scroll.step(delta)
    const camZ = props.ctx.camera.position.z

    for (let i = 0; i < CARD_COUNT; i++) {
      const mesh = meshes[i]
      const material = materials[i]
      material.uniforms.uTime.value = elapsed

      let t = cardOffsets[i] + scroll.current * SCROLL_SCALE
      const limit = SPAN / 2 + SPACING * 1.5

      while (t > limit) {
        t -= SPAN + SPACING * 2
        cardOffsets[i] -= SPAN + SPACING * 2
        const idx = Math.round(cardOffsets[i] / SPACING) % PROJECT_COUNT
        const safeIdx = idx < 0 ? idx + PROJECT_COUNT : idx
        mesh.userData.projectIndex = safeIdx
        material.uniforms.uColor.value = new THREE.Color(PROJECTS[safeIdx].color)
      }
      while (t < -limit) {
        t += SPAN + SPACING * 2
        cardOffsets[i] += SPAN + SPACING * 2
        const idx = Math.round(cardOffsets[i] / SPACING) % PROJECT_COUNT
        const safeIdx = idx < 0 ? idx + PROJECT_COUNT : idx
        mesh.userData.projectIndex = safeIdx
        material.uniforms.uColor.value = new THREE.Color(PROJECTS[safeIdx].color)
      }

      computeArcPoint(t, scratchP)
      mesh.position.copy(scratchP)

      computeArcPoint(t + 0.1, scratchAhead)
      scratchTangent.subVectors(scratchAhead, scratchP).normalize()
      scratchTarget.copy(scratchP).add(scratchTangent)
      scratchCamTarget.set(0, 0, camZ)
      scratchTarget.lerp(scratchCamTarget, ROTATION_BLEND)
      mesh.lookAt(scratchTarget)

      const dist = Math.abs(t)
      const fade = THREE.MathUtils.clamp((limit - dist) / FADE_BAND, 0, 1)
      material.uniforms.uOpacity.value = 0.95 * fade

      const stretch = THREE.MathUtils.clamp(scroll.velocity * STRETCH_FACTOR, -2.0, 2.0)
      material.uniforms.uStretch.value = stretch
    }

    if (Math.abs(scroll.velocity) > 0.05) {
      playClick(scroll.velocity)
    }
  }

  props.ctx.registerRenderCallback(renderCallback)
}

async function handleFirstInput() {
  await resumeAudio()
  window.removeEventListener('wheel', handleFirstInput)
  window.removeEventListener('touchstart', handleFirstInput)
  window.removeEventListener('pointerdown', handleFirstInput)
}

onMounted(() => {
  buildCluster()
  bindScroll()
  if (typeof window !== 'undefined') {
    window.addEventListener('wheel', handleFirstInput, { passive: false })
    window.addEventListener('touchstart', handleFirstInput, { passive: true })
    window.addEventListener('pointerdown', handleFirstInput)
  }
})

onBeforeUnmount(() => {
  if (renderCallback && props.ctx.unregisterRenderCallback) {
    props.ctx.unregisterRenderCallback(renderCallback)
    renderCallback = null
  }
  unbindScroll()
  if (typeof window !== 'undefined') {
    window.removeEventListener('wheel', handleFirstInput)
    window.removeEventListener('touchstart', handleFirstInput)
    window.removeEventListener('pointerdown', handleFirstInput)
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