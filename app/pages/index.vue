<script setup lang="ts">
import WebGLScene from '~/components/WebGLScene.vue'
import ClusterContra from '~/components/ClusterContra.vue'
import type { SceneContext } from '~/components/WebGLScene.vue'

useHead({
  link: [
    {
      rel: 'preload',
      href: '/fonts/space-grotesk-variable.woff2',
      as: 'font',
      type: 'font/woff2',
      crossorigin: '',
    },
    {
      rel: 'preload',
      href: '/fonts/LeMurmure-Regular.woff2',
      as: 'font',
      type: 'font/woff2',
      crossorigin: '',
    },
  ],
})

const webglSupported = ref(true)
const sceneCtx = ref<SceneContext | null>(null)
const fontReady = ref(false)
const mode = ref<'carrusel' | 'lista'>('carrusel')
const projects = ['AI ESTANDAR', 'TU SUPER', 'AMATISTA', 'CONFY HOUSE']
const marqueeVisible = ref(true)
const marqueeFading = ref(false)

const openList = () => {
  if (mode.value === 'lista') return
  mode.value = 'lista'
  marqueeFading.value = true
}

const closeList = () => {
  mode.value = 'carrusel'
  marqueeFading.value = false
  marqueeVisible.value = true
}

const handleMarqueeFaded = () => {
  marqueeVisible.value = false
}

onMounted(() => {
  const timeout = setTimeout(() => {
    fontReady.value = true
  }, 1500)
  const markReady = () => {
    fontReady.value = true
    clearTimeout(timeout)
  }
  document.fonts.load('700 1em "Space Grotesk Variable"').then(markReady).catch(markReady)
  document.fonts.load('400 1em "Le Murmure"').then(markReady).catch(markReady)
})

const handleSceneReady = (ctx: SceneContext) => {
  sceneCtx.value = ctx
}

const handleWebGLUnsupported = () => {
  webglSupported.value = false
}
</script>

<template>
  <main class="page">
    <WebGLScene
      v-if="webglSupported"
      :clear-color="0xffffff"
      :fov="57.8"
      :camera-z="3.5"
      :camera-x="0"
      @webgl-unsupported="handleWebGLUnsupported"
      @scene-ready="handleSceneReady"
    >
      <ClusterContra
        v-if="sceneCtx && marqueeVisible"
        :ctx="sceneCtx"
        :fading="marqueeFading"
        @fade-complete="handleMarqueeFaded"
      />
      <div class="overlay">
        <h1
          class="portfolio-text"
          :class="{ 'font-ready': fontReady, vertical: mode === 'lista' }"
        >
          <span
            class="word-sub"
            :class="{ active: mode === 'lista' }"
            @click="openList"
          >lista</span>
          <svg
            class="star"
            :class="{ rotated: mode === 'lista' }"
            viewBox="0 0 24 24"
            aria-hidden="true"
            @click="closeList"
          >
            <path d="M22.5 12 L14.47 9.53 L12 1.5 L9.53 9.53 L1.5 12 L9.53 14.47 L12 22.5 L14.47 14.47 Z" />
          </svg>
          <span class="word-main" @click="closeList">Carrusel</span>
        </h1>
        <ul v-if="mode === 'lista'" class="project-list">
          <li
            v-for="(project, i) in projects"
            :key="project"
            :style="{ '--i': i }"
          >{{ project }}</li>
        </ul>
      </div>
    </WebGLScene>

    <div v-if="!webglSupported" class="fallback">
      <h1 class="portfolio-text">portfolio</h1>
    </div>
  </main>
</template>

<style scoped>
@font-face {
  font-family: 'Space Grotesk Variable';
  src: url('/fonts/space-grotesk-variable.woff2') format('woff2');
  font-weight: 300 700;
  font-style: normal;
  font-display: block;
}

@font-face {
  font-family: 'Le Murmure';
  src: url('/fonts/LeMurmure-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: block;
}

.page {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  touch-action: none;
  background-color: #ffffff;
  margin: 0;
  padding: 0;
  user-select: none;
  -webkit-user-select: none;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 14%;
  pointer-events: none;
  z-index: 1;
}

.portfolio-text {
  position: relative;
  display: flex;
  align-items: center;
  font-family: 'Space Grotesk Variable', sans-serif;
  font-size: 1.6rem;
  color: #6b7280;
  margin: 0;
  opacity: 0;
  pointer-events: auto;
  transition: opacity 0.25s ease;
}

.portfolio-text.font-ready {
  opacity: 1;
}

.word-main {
  font-family: 'Le Murmure', 'Space Grotesk Variable', sans-serif;
  font-size: 2.4rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition:
    letter-spacing 0.6s cubic-bezier(0.16, 1, 0.3, 1),
    color 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.word-sub {
  font-weight: 400;
  font-variation-settings: 'wght' 400;
  letter-spacing: 0.04em;
  color: #cbd5e1;
  cursor: pointer;
  transition:
    letter-spacing 0.6s cubic-bezier(0.16, 1, 0.3, 1),
    font-variation-settings 0.6s cubic-bezier(0.16, 1, 0.3, 1),
    color 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.word-main:hover,
.word-sub:hover,
.star:hover {
  color: #0000ff;
}

.word-main:hover,
.word-sub:hover {
  letter-spacing: 0.12em;
}

.word-sub:hover {
  font-variation-settings: 'wght' 700;
}

.word-sub.active {
  color: #0000ff;
  font-variation-settings: 'wght' 700;
}

.star {
  width: 0.7em;
  height: 0.7em;
  margin: 0 0.5em;
  fill: currentColor;
  vertical-align: -0.08em;
  cursor: pointer;
  transition:
    color 0.6s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.star.rotated {
  transform: rotate(45deg);
}

.project-list {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: 'Space Grotesk Variable', sans-serif;
  color: #6b7280;
  pointer-events: none;
}

.project-list li {
  font-size: 1.4rem;
  font-weight: 400;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  pointer-events: auto;
  opacity: 0;
  animation: item-in 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: calc(0.5s + var(--i) * 0.07s);
  transition:
    color 0.4s ease,
    letter-spacing 0.4s ease;
}

.project-list li:hover {
  color: #0000ff;
  letter-spacing: 0.16em;
}

@keyframes item-in {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

@media (max-width: 640px) {
  .overlay {
    padding-right: 6%;
  }

  .portfolio-text {
    font-size: 1.15rem;
  }

  .portfolio-text.vertical {
    flex-direction: column;
  }

  .portfolio-text.vertical .star {
    margin: 0.35em 0;
  }

  .word-main {
    font-size: 1.7rem;
  }

  .project-list {
    gap: 1.9rem;
  }

  .project-list li {
    font-size: 1.1rem;
    letter-spacing: 0.1em;
    white-space: nowrap;
  }

  .project-list li:hover {
    letter-spacing: 0.14em;
  }
}
</style>
