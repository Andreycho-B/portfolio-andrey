<script setup lang="ts">
interface Props {
  bg: string
  ratio?: string
  rot?: number
  ty?: number
  label: string
  copy?: string
}

const props = withDefaults(defineProps<Props>(), {
  ratio: '1 / 1',
  rot: 0,
  ty: 0,
  copy: undefined,
})

const tileStyle = computed(() => ({
  '--rot': `${props.rot}deg`,
  '--ty': `${props.ty}px`,
  transform: `rotate(var(--rot)) translateY(var(--ty))`,
  aspectRatio: props.ratio,
}))
</script>

<template>
  <figure
    class="showcase-tile"
    :class="`bg-${bg}`"
    :style="tileStyle"
    role="img"
    :aria-label="label"
  >
    <div class="tile-placeholder">
      <span>{{ copy ?? label }}</span>
    </div>
  </figure>
</template>

<style scoped>
.showcase-tile {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-tile);
  border: 1px solid var(--color-card-border);
  box-shadow: var(--shadow-tile);
  margin: 0;
  transition: transform 0.3s ease-out, box-shadow 0.3s ease-out;
}

.showcase-tile:hover {
  transform: rotate(var(--rot)) translateY(calc(var(--ty) - 2px));
  box-shadow: var(--shadow-tile-up);
}

.showcase-tile:focus-within {
  outline: 2px solid rgba(21, 19, 26, 0.4);
  outline-offset: 2px;
  box-shadow: var(--shadow-tile-up);
}

.tile-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 500;
  padding: 1rem;
  text-align: center;
}

.bg-navy { background-color: var(--color-navy); }
.bg-amber { background-color: var(--color-amber); }
.bg-sand { background-color: var(--color-sand); }
.bg-crimson { background-color: var(--color-crimson); }
.bg-cobalt { background-color: var(--color-cobalt); }
.bg-lagoon { background-color: var(--color-lagoon); }
.bg-canvasSoft { background-color: var(--color-canvas-soft); }

.bg-sand .tile-placeholder,
.bg-amber .tile-placeholder,
.bg-canvasSoft .tile-placeholder {
  color: var(--color-sand-ink);
}

@media (max-width: 767px) {
  .showcase-tile {
    --rot: 0deg !important;
    --ty: 0px !important;
    transform: rotate(0deg) translateY(0px) !important;
  }
  .showcase-tile:hover {
    transform: translateY(-2px) !important;
  }
}
</style>
