<script setup lang="ts">
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/700.css'
import '@fontsource/playfair-display/600.css'
import '@fontsource/playfair-display/700.css'
import ShowcaseGallery from '~/components/ShowcaseGallery.vue'
import type { ShowcaseTileData, ShowcaseBrandBlockData } from '~/components/ShowcaseGallery.vue'

const tiles: ShowcaseTileData[] = [
  {
    id: 'T1',
    col: 1,
    span: 2,
    rot: -6,
    ty: 0,
    bg: 'navy',
    ratio: '1 / 1',
    label: 'Brand mark — círculo blanco parcial y flor navy de 6 puntas, marca ficticia del placeholder T1',
  },
  {
    id: 'T2',
    col: 3,
    span: 2,
    rot: 7,
    ty: -8,
    bg: 'amber',
    ratio: '1 / 1',
    label: 'Sketch — ilustración de línea sobre cuadrícula, figura humana con objeto, trazo color arena',
  },
  {
    id: 'T3',
    col: 1,
    span: 2,
    rot: 5,
    ty: 12,
    bg: 'sand',
    ratio: '1 / 1.15',
    label: 'Portrait — retrato recortado de mujer joven, cabello rizado, mirada arriba',
  },
  {
    id: 'T4',
    col: 4,
    span: 1,
    rot: 8,
    ty: -4,
    bg: 'crimson',
    ratio: '1 / 1',
    label: 'Vinyl cover — texto TRUEFORM MUSIC en sans-serif blanco, elemento de vinilo negro superpuesto',
    copy: 'TRUEFORM MUSIC',
  },
  {
    id: 'T5',
    col: 1,
    span: 2,
    rot: 4,
    ty: 0,
    bg: 'cobalt',
    ratio: '1 / 1',
    label: 'Phone mockup — marco de smartphone con dos pantallas UI, formulario izquierda y preview derecha',
  },
  {
    id: 'T6',
    col: 3,
    span: 2,
    rot: 10,
    ty: -10,
    bg: 'crimson',
    ratio: '1 / 1.1',
    label: 'Portrait close-up — rostro femenino cortado, iluminación rojo-naranja intensa',
  },
  {
    id: 'T7',
    col: 4,
    span: 1,
    rot: -5,
    ty: 6,
    bg: 'lagoon',
    ratio: '1 / 1',
    label: 'Harbor logo — wordmark Harbor con isotipo de ondas concéntricas y líneas blancas fluidas',
    copy: 'Harbor',
  },
  {
    id: 'T8',
    col: 4,
    span: 1,
    rot: -7,
    ty: -6,
    bg: 'canvasSoft',
    ratio: '1 / 1',
    label: 'Hand painting — mano con pincel pintando sobre superficie azul, cortado por el borde derecho',
  },
]

const brandBlock: ShowcaseBrandBlockData = {
  tagline: 'GET MORE CREATIVE',
  wordmark: 'contra',
}
</script>

<template>
  <main class="page">
    <section class="showcase-section">
      <div class="showcase-inner">
        <ShowcaseGallery :tiles="tiles" :brand-block="brandBlock" />
      </div>
    </section>
  </main>
</template>

<style scoped>
.page {
  background-color: var(--color-canvas);
  color: var(--color-ink);
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  min-height: 100vh;
}

.showcase-section {
  width: 100%;
  overflow: hidden;
  padding: 3rem 1.5rem;
}

.showcase-inner {
  position: relative;
  max-width: 1440px;
  margin: 0 auto;
}

@media (min-width: 1024px) {
  .showcase-section {
    padding: 5rem 1.5rem;
  }
}

@media (max-width: 767px) {
  .showcase-section {
    padding: 2rem 1rem;
  }
}
</style>
