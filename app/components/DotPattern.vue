<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import ConstellationGrid from './ConstellationGrid.vue'

// punto fijo del clúster: centro de la máscara elíptica (20 % ancho / 50 % alto)
const ANCHOR = [0.2, 0.5] as const

// Mobile: clúster compacto (radio y zona de anillos/etiquetas escalados) para que
// el efecto quede contenido en la zona visible de la máscara sin robar protagonismo.
const isCompact = ref(false)
let mq: MediaQueryList | null = null

const handleMqChange = (e: MediaQueryListEvent) => {
  isCompact.value = e.matches
}

onMounted(() => {
  mq = window.matchMedia('(max-width: 640px)')
  isCompact.value = mq.matches
  mq.addEventListener('change', handleMqChange)
})

onBeforeUnmount(() => {
  mq?.removeEventListener('change', handleMqChange)
})
</script>

<template>
  <ConstellationGrid class="dot-pattern" :anchor="ANCHOR" :compact="isCompact" />
</template>

<style scoped>
.dot-pattern {
  opacity: 0.7;

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