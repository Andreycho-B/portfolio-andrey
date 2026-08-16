<script setup lang="ts">
// Fondo de puntos decorativo (adaptación de MagicUI "Dot Pattern", 21st.dev/designali-in).
// Sin Tailwind ni dependencias: SVG nativo con <pattern> y máscara radial en CSS.
// El patrón se disuelve desde el centro de la mitad izquierda de la pantalla (20% del ancho, 50% del alto),
// extendido hacia la derecha: la elipse horizontal llega a desvanecerse más cerca del borde derecho (hasta ~65% del ancho).
const GRID_SIZE = 24
const DOT_X = 1
const DOT_Y = 1
const DOT_RADIUS = 1.5
</script>

<template>
  <svg class="dot-pattern" aria-hidden="true">
    <defs>
      <pattern
        id="dot-pattern-grid"
        :width="GRID_SIZE"
        :height="GRID_SIZE"
        patternUnits="userSpaceOnUse"
      >
        <circle :cx="DOT_X" :cy="DOT_Y" :r="DOT_RADIUS" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#dot-pattern-grid)" />
  </svg>
</template>

<style scoped>
.dot-pattern {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  color: #0000ff;
  opacity: 0.7;
  fill: currentColor;

  /* Centro del patrón: centro de la mitad izquierda de la pantalla (20% del ancho, 50% del alto);
     elipse ampliada hacia la derecha (rx 45%) para que el fade llegue cerca del 65% del ancho.
     Fracciones de la elipse calibrables si el look no convence. */
  -webkit-mask-image: radial-gradient(ellipse 45% 65% at 20% 50%, #000 0%, transparent 80%);
  mask-image: radial-gradient(ellipse 45% 65% at 20% 50%, #000 0%, transparent 80%);
}

/* Mobile: puntos más sutiles y elipse más contenida para no robar protagonismo
   a las tarjetas ni al texto vertical. */
@media (width <= 640px) {
  .dot-pattern {
    opacity: 0.5;
    -webkit-mask-image: radial-gradient(ellipse 40% 50% at 20% 50%, #000 0%, transparent 80%);
    mask-image: radial-gradient(ellipse 40% 50% at 20% 50%, #000 0%, transparent 80%);
  }
}
</style>
