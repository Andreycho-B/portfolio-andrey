<script setup lang="ts">
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/700.css'
import '@fontsource/playfair-display/700.css'
import type { SceneContext } from '~/components/WebGLScene.vue'

const webglSupported = ref(true)
const sceneCtx = ref<SceneContext | null>(null)

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
      :clear-color="0xfafafa"
      :fov="75"
      :camera-z="5"
      @webgl-unsupported="handleWebGLUnsupported"
      @scene-ready="handleSceneReady"
    >
      <ClusterContra v-if="sceneCtx" :ctx="sceneCtx" />
      <div class="overlay">
        <header class="header">
          <p class="role">Portfolio</p>
          <h1 class="name">Andrey Rondón</h1>
          <p class="status">AI Agent Engineer · En construcción</p>
        </header>
      </div>
    </WebGLScene>

    <div v-if="!webglSupported" class="fallback">
      <header class="header">
        <p class="role">Portfolio</p>
        <h1 class="name">Andrey Rondón</h1>
        <p class="status">AI Agent Engineer</p>
        <p class="fallback-msg">
          Tu navegador no soporta WebGL2. Para experimentar el portafolio completo
          usa Chrome, Edge o Firefox reciente.
        </p>
      </header>
    </div>
  </main>
</template>

<style scoped>
.page {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #fafafa;
  color: #0a0a0a;
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 1;
}

.header {
  max-width: 32rem;
  text-align: center;
}

.role {
  margin: 0 0 0.75rem;
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.125em;
  text-transform: uppercase;
  color: #525252;
}

.name {
  margin: 0 0 1rem;
  font-family: 'Playfair Display', serif;
  font-size: clamp(2.5rem, 8vw, 5rem);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: #0a0a0a;
}

.status {
  margin: 0;
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  font-weight: 400;
  color: #525252;
}

.fallback {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
  background: #fafafa;
}

.fallback-msg {
  margin: 1.5rem 0 0;
  font-size: 0.875rem;
  color: #525252;
  max-width: 24rem;
  line-height: 1.5;
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation: none;
    transition: none;
  }
}
</style>
