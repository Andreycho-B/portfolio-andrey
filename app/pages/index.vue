<script setup lang="ts">
import '@fontsource/playfair-display/700.css'
import WebGLScene from '~/components/WebGLScene.vue'

const webglSupported = ref(true)

const handleWebGLUnsupported = () => {
  webglSupported.value = false
}
</script>

<template>
  <main class="page">
    <WebGLScene
      v-if="webglSupported"
      :clear-color="0xffffff"
      :fov="75"
      :camera-z="5"
      @webgl-unsupported="handleWebGLUnsupported"
    >
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
  font-size: 1.75rem;
  font-weight: 700;
  color: #6b7280;
  letter-spacing: -0.01em;
  margin: 0;
}

.fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
</style>
