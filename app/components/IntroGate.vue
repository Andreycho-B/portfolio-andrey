<script setup lang="ts">
import ConstellationGrid from './ConstellationGrid.vue'

defineProps<{ active?: boolean }>()
const emit = defineEmits<{ enter: [] }>()

// la salida se dispara en pointerup: en iOS, mantener el botón unos segundos
// anula el click nativo (long-press) y sin esto no redirigiría
let suppressClick = false

const onPointerUp = () => {
  suppressClick = true
  emit('enter')
}

// el click solo dispara cuando no hubo pointer (teclado: a11y); el click del
// navegador que sigue al pointerup ya fue cubierto por onPointerUp
const onClick = () => {
  if (suppressClick) {
    suppressClick = false
    return
  }
  emit('enter')
}
</script>

<template>
  <section class="intro-gate">
    <ConstellationGrid :active="active" />
    <div class="intro-gate__content">
      <button
        class="intro-gate__enter intro-gate__enter--show"
        type="button"
        @click="onClick"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        ingresar con sonido
      </button>
    </div>
  </section>
</template>

<style scoped>
@font-face {
  font-family: 'Space Grotesk Variable';
  src: url('/fonts/space-grotesk-variable.woff2') format('woff2');
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
}
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
  /* el botón se centra en la mitad de la mitad inferior de la pantalla (75%) */
  position: absolute;
  top: 75%;
  left: 50%;
  transform: translate(-50%, -50%);
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

/* los puntos y las líneas se retiran suave al salir, en ritmo con el texto y el
   panel; :deep para que el selector no quede atado al data-v del hijo */
.intro-gate--hidden :deep(.constellation-grid),
.intro-gate--hidden :deep(.constellation-lines) {
  opacity: 0;
  transition: opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1);
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
  /* el resaltado gris translúcido que iOS/Android pintan al tocar (el "recuadro"
     que aparecía detrás de enter solo en mobile) */
  -webkit-tap-highlight-color: transparent;
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

/* el texto sale en el mismo ritmo que las partículas (0.6s, mismo easing):
   desvanecimiento y ascenso sincronizados con la malla */
.intro-gate--hidden .intro-gate__enter {
  opacity: 0;
  transform: translateY(-10px);
  transition-duration: 0.6s;
  transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}

/* hover real (desktop): el cambio de letter-spacing re-disponé el texto, por eso
   se restringe a dispositivos con hover físico — el toque del móvil lo activaría
   como sticky hover y partiría "ingresar con sonido" en dos líneas */
@media (hover: hover) {
  .intro-gate__enter:hover,
  .intro-gate__enter:focus-visible {
    color: #15131a;
    letter-spacing: 0.35em;
    outline: none;
  }
}

/* área táctil mínima en móvil (recomendación 44px) */
@media (max-width: 640px) {
  .intro-gate__enter {
    padding: 1.1em 1.6em;
  }
}
</style>