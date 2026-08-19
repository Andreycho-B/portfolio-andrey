<script setup lang="ts">
import ConstellationGrid from './ConstellationGrid.vue'

defineProps<{ active?: boolean }>()
defineEmits<{ enter: [] }>()
</script>

<template>
  <section class="intro-gate">
    <ConstellationGrid :active="active" />
    <div class="intro-gate__content">
      <button
        class="intro-gate__enter intro-gate__enter--show"
        type="button"
        @click="$emit('enter')"
      >
        enter
      </button>
    </div>
  </section>
</template>

<style scoped>
.intro-gate {
  position: fixed;
  inset: 0;
  z-index: 10;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  opacity: 1;
  transform: scale(1);
  transition:
    opacity 1.8s cubic-bezier(0.22, 1, 0.36, 1),
    transform 1.8s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: auto;
}

.intro-gate__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.intro-gate--hidden {
  opacity: 0;
  transform: scale(0.98);
  pointer-events: none;
  /* al terminar la salida el panel sale del árbol de composición (evita una capa
     fullscreen transparente sobre el carrusel, que en algunos motores interfería
     con las capas de debajo) */
  visibility: hidden;
  transition:
    opacity 1.8s cubic-bezier(0.64, 0, 0.78, 0),
    transform 1.8s cubic-bezier(0.64, 0, 0.78, 0),
    visibility 0s linear 1.9s;
}

/* los puntos se retiran rápido al salir; el panel blanco continúa su asentamiento lento */
.intro-gate--hidden .constellation-grid {
  opacity: 0;
  transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.intro-gate__enter {
  position: relative;
  z-index: 1;
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 400;
  font-size: 0.85rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #9ca3af;
  background: none;
  border: none;
  padding: 0.6em 1.2em;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transform: translateY(6px);
  transition:
    color 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    letter-spacing 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.intro-gate__enter--show {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.intro-gate--hidden .intro-gate__enter {
  opacity: 0;
  transform: translateY(-10px);
  transition-delay: 0s;
  transition-timing-function: cubic-bezier(0.64, 0, 0.78, 0);
}

.intro-gate__enter:hover,
.intro-gate__enter:focus-visible {
  color: #15131a;
  letter-spacing: 0.35em;
  outline: none;
}
</style>