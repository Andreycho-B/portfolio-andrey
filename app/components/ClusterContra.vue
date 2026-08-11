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
const SPACING = 4.0
const Y_OFFSET = 1.6
const VERTICAL_CURVE = 0.008
const ARC_DEPTH = 3.5
const SPAN_CAPE = SPACING * 3.0
const SCALE_FALLOFF = 0.45
const MESH_CURVATURE = 0.8
const STRETCH_FACTOR = 0.6
const ROTATION_BLEND = 0.25
const FADE_BAND = SPACING

const PROJECTS = [
  { color: 0x1B2A5E, texture: '/images/projects/project-0.webp' },
  { color: 0xE89A3F, texture: '/images/projects/project-1.webp' },
  { color: 0xB83A2A, texture: '/images/projects/project-2.webp' },
  { color: 0x2747A8, texture: '/images/projects/project-3.webp' },
]

interface Props {
  ctx: SceneContext
}

const props = defineProps<Props>()

const meshes: THREE.Mesh[] = []
const materials: THREE.ShaderMaterial[] = []
const textures: THREE.Texture[] = []
let sharedGeometry: THREE.PlaneGeometry | null = null
let renderCallback: ((deltaTime: number, elapsedTime: number) => void) | null = null

const cardOffsets: number[] = []
const cardArcUpper: boolean[] = []
const scratchP = new THREE.Vector3()
const scratchAhead = new THREE.Vector3()
const scratchTangent = new THREE.Vector3()
const scratchTarget = new THREE.Vector3()
const scratchCamTarget = new THREE.Vector3()

const { state: scroll, step: scrollStep, bind: bindScroll, unbind: unbindScroll } = useGalleryScroll()
const { resume: resumeAudio, playClick } = useAudioClick()

const computeArcPoint = (t: number, isUpper: boolean, out: THREE.Vector3) => {
  const r = t / SPAN_CAPE
  const r2 = r * r
  const cape = Math.min(1.0, r2)
  const y = isUpper
    ? Y_OFFSET + VERTICAL_CURVE * t * t
    : -(Y_OFFSET + VERTICAL_CURVE * t * t)
  const z = -ARC_DEPTH * cape
  out.set(t, y, z)
}

const computeScale = (t: number) => {
  const r2 = (t / SPAN_CAPE) * (t / SPAN_CAPE)
  const cape = Math.min(1.0, r2)
  return Math.max(0.25, 1.0 - SCALE_FALLOFF * cape)
}

const loadProjectTextures = async () => {
  const loader = new THREE.TextureLoader()
  const aspectMap = new Map<number, number>()

  for (let i = 0; i < PROJECT_COUNT; i++) {
    const url = PROJECTS[i].texture
    try {
      const tex = await new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(url, resolve, undefined, reject)
      })
      tex.colorSpace = THREE.SRGBColorSpace
      tex.minFilter = THREE.LinearMipMapLinearFilter
      tex.magFilter = THREE.LinearFilter
      tex.generateMipmaps = true
      tex.anisotropy = 4
      tex.needsUpdate = true
      textures.push(tex)
      const img = (tex as THREE.Texture & { image?: HTMLImageElement }).image
      if (img && img.width && img.height) {
        aspectMap.set(i, img.width / img.height)
      } else {
        aspectMap.set(i, 1.0)
      }
    } catch {
      textures.push(new THREE.Texture())
      aspectMap.set(i, 1.0)
    }
  }

  for (let i = 0; i < CARD_COUNT; i++) {
    const projectIndex = i % PROJECT_COUNT
    if (materials[i] && textures[projectIndex]) {
      materials[i].uniforms.uTexture.value = textures[projectIndex]
      materials[i].uniforms.uTextureAspect.value = aspectMap.get(projectIndex) ?? 1.0
      materials[i].uniforms.uHasTexture.value = 1.0
      materials[i].needsUpdate = true
    }
  }
}

const buildCluster = () => {
  sharedGeometry = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_SEGMENTS, CARD_SEGMENTS)

  for (let i = 0; i < CARD_COUNT; i++) {
    const t = (i + 0.5 - CARD_COUNT / 2) * SPACING
    cardOffsets.push(t)
    const isUpper = i % 2 === 0
    cardArcUpper.push(isUpper)

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
        uTexture: { value: new THREE.Texture() },
        uTextureAspect: { value: 1.0 },
        uHasTexture: { value: 0.0 },
      },
      transparent: true,
      side: THREE.DoubleSide,
    })

    const mesh = new THREE.Mesh(sharedGeometry, material)

    const p = new THREE.Vector3()
    computeArcPoint(t, isUpper, p)
    mesh.position.copy(p)
    mesh.scale.setScalar(computeScale(t))

    const ahead = new THREE.Vector3()
    computeArcPoint(t + 0.1, isUpper, ahead)
    const tangent = new THREE.Vector3().subVectors(ahead, p).normalize()
    const target = new THREE.Vector3().addVectors(p, tangent)
    mesh.lookAt(target)

    mesh.userData = { cardIndex: i, projectIndex }

    props.ctx.scene.add(mesh)
    meshes.push(mesh)
    materials.push(material)
  }

  loadProjectTextures()

  renderCallback = (delta: number, elapsed: number) => {
    scrollStep(delta)
    const camZ = props.ctx.camera.position.z
    const span = (CARD_COUNT - 1) * SPACING
    const limit = span / 2 + SPACING * 1.5

    for (let i = 0; i < CARD_COUNT; i++) {
      const mesh = meshes[i]
      const material = materials[i]
      const isUpper = cardArcUpper[i]
      material.uniforms.uTime.value = elapsed

      let t = cardOffsets[i] + scroll.current

      while (t > limit) {
        t -= span + SPACING * 2
        cardOffsets[i] -= span + SPACING * 2
        const idx = ((Math.round(cardOffsets[i] / SPACING) % PROJECT_COUNT) + PROJECT_COUNT) % PROJECT_COUNT
        mesh.userData.projectIndex = idx
        material.uniforms.uColor.value = new THREE.Color(PROJECTS[idx].color)
        if (textures[idx]) {
          material.uniforms.uTexture.value = textures[idx]
          material.uniforms.uHasTexture.value = 1.0
        }
      }
      while (t < -limit) {
        t += span + SPACING * 2
        cardOffsets[i] += span + SPACING * 2
        const idx = ((Math.round(cardOffsets[i] / SPACING) % PROJECT_COUNT) + PROJECT_COUNT) % PROJECT_COUNT
        mesh.userData.projectIndex = idx
        material.uniforms.uColor.value = new THREE.Color(PROJECTS[idx].color)
        if (textures[idx]) {
          material.uniforms.uTexture.value = textures[idx]
          material.uniforms.uHasTexture.value = 1.0
        }
      }

      computeArcPoint(t, isUpper, scratchP)
      mesh.position.copy(scratchP)
      mesh.scale.setScalar(computeScale(t))

      computeArcPoint(t + 0.1, isUpper, scratchAhead)
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
  for (const tex of textures) {
    tex.dispose()
  }
  meshes.length = 0
  materials.length = 0
  textures.length = 0
  sharedGeometry?.dispose()
  sharedGeometry = null
})
</script>

<template>
  <span aria-hidden="true" style="display: none" />
</template>
