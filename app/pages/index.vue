<script setup lang="ts">
import '@fontsource/playfair-display/700.css'
import WebGLScene from '~/components/WebGLScene.vue'
import ClusterContra from '~/components/ClusterContra.vue'
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
      :clear-color="0xffffff"
      :fov="60"
      :camera-z="6"
      @webgl-unsupported="handleWebGLUnsupported"
      @scene-ready="handleSceneReady"
    >
      <ClusterContra v-if="sceneCtx" :ctx="sceneCtx" />
      <div class="overlay">
        <h1 class="portfolio-text">portfolio</h1>
      </div>
    </WebGLScene>

    <div v-if="!webglSupported" class="fallback">
      <h1 class="portfolio-text">portfolio</h1>
    </div>
  </main>
</template>

<style scoped>
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
  justify-content: center;
  pointer-events: none;
  z-index: 1;
}

.portfolio-text {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #9ca3af;
  letter-spacing: 0.05em;
  margin: 0;
  text-transform: lowercase;
}

.fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
</style>
