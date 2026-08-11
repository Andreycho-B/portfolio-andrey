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
        <div class="brand-row" aria-label="Marca central del portafolio de proyectos">
          <span class="brand-tagline">GET MORE CREATIVE</span>
          <span class="brand-glyph" aria-hidden="true">&#10022;</span>
          <span class="brand-name">contra</span>
        </div>
      </div>
    </WebGLScene>

    <div v-if="!webglSupported" class="fallback">
      <div class="brand-row">
        <span class="brand-tagline">GET MORE CREATIVE</span>
        <span class="brand-glyph" aria-hidden="true">&#10022;</span>
        <span class="brand-name">contra</span>
      </div>
      <p class="fallback-msg">
        WebGL2 no está disponible en este navegador. Para ver el cluster de
        proyectos usa Chrome, Edge o Firefox reciente.
      </p>
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

.brand-row {
  display: flex;
  align-items: baseline;
  gap: clamp(1.5rem, 4vw, 3rem);
}

.brand-tagline {
  font-family: 'Inter', sans-serif;
  font-size: clamp(0.875rem, 1.5vw, 1.25rem);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.25em;
  color: #0a0a0a;
}

.brand-glyph {
  font-family: 'Inter', sans-serif;
  font-size: clamp(1.25rem, 2.5vw, 2rem);
  font-weight: 400;
  color: #0020c2;
  line-height: 1;
}

.brand-name {
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.5rem, 3vw, 2.5rem);
  font-weight: 700;
  color: #0a0a0a;
  letter-spacing: -0.01em;
}

.fallback {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 2rem 1.5rem;
  background: #fafafa;
}

.fallback-msg {
  margin: 0;
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  color: #525252;
  max-width: 24rem;
  line-height: 1.5;
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation: none;
    transition: none;
  }
}
</style>
