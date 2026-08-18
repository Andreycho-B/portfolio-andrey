<script setup lang="ts">
// Componente de animación Lottie (JSON de Bodymovin/After Effects).
// Se carga solo en cliente: lottie-web necesita el DOM para renderizar.
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    src: string
    loop?: boolean
    autoplay?: boolean
  }>(),
  { loop: false, autoplay: true },
)

const emit = defineEmits<{ complete: [] }>()

const container = ref<HTMLDivElement | null>(null)
let animation: import('lottie-web').AnimationItem | null = null

onMounted(async () => {
  if (!container.value) return
  const lottie = await import('lottie-web')
  animation = lottie.default.loadAnimation({
    container: container.value,
    renderer: 'svg',
    loop: props.loop,
    autoplay: props.autoplay,
    path: props.src,
  })
  if (!props.loop) {
    animation.addEventListener('complete', () => emit('complete'))
  }
})

onBeforeUnmount(() => {
  animation?.destroy()
  animation = null
})
</script>

<template>
  <div ref="container" class="lottie-animation" aria-hidden="true" />
</template>

<style scoped>
.lottie-animation {
  width: 100%;
  pointer-events: none;
}

.lottie-animation :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}
</style>