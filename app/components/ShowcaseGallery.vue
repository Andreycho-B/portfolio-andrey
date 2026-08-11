<script setup lang="ts">
import ShowcaseTile from './ShowcaseTile.vue'
import ShowcaseBrandBlock from './ShowcaseBrandBlock.vue'

export interface ShowcaseTileData {
  id: string
  col: number
  span: number
  rot: number
  ty: number
  bg: string
  ratio?: string
  label: string
  copy?: string
}

export interface ShowcaseBrandBlockData {
  tagline: string
  wordmark: string
}

interface Props {
  tiles: ShowcaseTileData[]
  brandBlock: ShowcaseBrandBlockData
}

const props = defineProps<Props>()

const styleFor = (t: ShowcaseTileData) => ({
  gridColumn: `${t.col} / span ${t.span}`,
})
</script>

<template>
  <div class="showcase-grid">
    <template v-for="(t, i) in tiles" :key="t.id">
      <ShowcaseBrandBlock
        v-if="i === 4"
        :tagline="brandBlock.tagline"
        :wordmark="brandBlock.wordmark"
      />
      <ShowcaseTile
        v-bind="t"
        :style="styleFor(t)"
      />
    </template>
  </div>
</template>

<style scoped>
.showcase-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-gutter);
  position: relative;
}

@media (min-width: 768px) {
  .showcase-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .showcase-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }
}
</style>
