<script setup lang="ts">
import WebGLScene from '~/components/WebGLScene.vue'
import LiveCard from '~/components/LiveCard.vue'
import IntroGate from '~/components/IntroGate.vue'
import type { SceneContext } from '~/components/WebGLScene.vue'

useHead({
  title: 'Andrey Rondón — Portfolio',
  meta: [
    { name: 'description', content: 'Portafolio de Andrey Rondón' },
  ],
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

const introVisible = ref(false)
const webglSupported = ref(true)
const sceneCtx = ref<SceneContext | null>(null)

const dismissIntro = () => {
  if (!introVisible.value) return
  introVisible.value = false
  history.pushState({ view: 'portfolio' }, '', '/#work')
}

const showIntro = () => {
  introVisible.value = true
}

const handlePopState = (e: PopStateEvent) => {
  introVisible.value = !e.state || e.state.view !== 'portfolio'
}

const handleSceneReady = (ctx: SceneContext) => {
  sceneCtx.value = ctx
}

const handleWebGLUnsupported = () => {
  webglSupported.value = false
}

onMounted(() => {
  window.addEventListener('popstate', handlePopState)

  // entrada fluida del gate en la carga: pinta oculto un frame y luego transiciona (misma curva que la vuelta);
  // la recarga inicia en pantalla blanca
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      introVisible.value = true
    })
  })
})

onUnmounted(() => {
  window.removeEventListener('popstate', handlePopState)
})
</script>

<template>
  <main class="layout">
    <IntroGate
      :active="introVisible"
      :class="{ 'intro-gate--hidden': !introVisible }"
      @enter="dismissIntro"
    />
    <WebGLScene
      v-if="webglSupported && !introVisible"
      :clear-color="0xffffff"
      :fov="72"
      :camera-z="3.8"
      :camera-x="0"
      @webgl-unsupported="handleWebGLUnsupported"
      @scene-ready="handleSceneReady"
    >
      <LiveCard
        v-if="sceneCtx"
        :ctx="sceneCtx"
        name="AI ESTANDAR"
        index="01 — 2025"
        color="#1d4ed8"
      />
    </WebGLScene>

    <div v-if="!webglSupported" class="fallback">
      <h1 class="portfolio-text">portfolio</h1>
    </div>
  </main>
</template>

<style scoped>
.layout {
  position: fixed;
  inset: 0;
  background-color: #ffffff;
  margin: 0;
  padding: 0;
  overflow: hidden;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
</style>