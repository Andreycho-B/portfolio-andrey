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
      href: '/fonts/CabinetGrotesk-800.woff2',
      as: 'font',
      type: 'font/woff2',
      crossorigin: '',
    },
    {
      rel: 'preload',
      href: '/fonts/CabinetGrotesk-900.woff2',
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

const INTRO_ENTER_TIMEOUT = 1950

const introVisible = ref(false)
const introEntering = ref(true)
const webglSupported = ref(true)
const sceneCtx = ref<SceneContext | null>(null)

const dismissIntro = () => {
  if (!introVisible.value) return
  introVisible.value = false
  introEntering.value = false
  history.pushState({ view: 'portfolio' }, '', location.pathname)
}

const showIntro = () => {
  introVisible.value = true
}

const handlePopState = (e: PopStateEvent) => {
  introVisible.value = !e.state || e.state.view !== 'portfolio'
}

// back restaurado desde bfcache: Chrome no dispara popstate al volver entre
// entradas con la misma URL; pageshow con persisted cubre ese caso
const handlePageShow = (e: PageTransitionEvent) => {
  if (e.persisted) {
    introVisible.value = true
  }
}

const handleSceneReady = (ctx: SceneContext) => {
  sceneCtx.value = ctx
}

const handleWebGLUnsupported = () => {
  webglSupported.value = false
}

onMounted(() => {
  window.addEventListener('popstate', handlePopState)
  window.addEventListener('pageshow', handlePageShow)

  // URL limpia: elimina cualquier hash heredado de enlaces viejos (/#work) sin tocar el historial
  if (location.hash) {
    history.replaceState(history.state, '', location.pathname + location.search)
  }

  // entrada fluida del gate en la carga: pinta oculto un frame y luego transiciona (misma curva que la vuelta);
  // la escena (.page) permanece oculta durante la entrada para que la recarga inicie en pantalla blanca
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      introVisible.value = true
      setTimeout(() => {
        introEntering.value = false
      }, INTRO_ENTER_TIMEOUT)
    })
  })
})

onUnmounted(() => {
  window.removeEventListener('popstate', handlePopState)
  window.removeEventListener('pageshow', handlePageShow)
})
</script>

<template>
  <main class="layout">
    <IntroGate
      :active="introVisible"
      :class="{ 'intro-gate--hidden': !introVisible }"
      @enter="dismissIntro"
    />
    <div class="page" :class="{ 'page--hidden': introEntering }">
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
          color="#0066ff"
        />
      </WebGLScene>

      <div v-if="!webglSupported" class="fallback">
        <h1 class="portfolio-text">portfolio</h1>
      </div>
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

.page {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background-color: #ffffff;
}

.page--hidden {
  visibility: hidden;
}

.fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
</style>