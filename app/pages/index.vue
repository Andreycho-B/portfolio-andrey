<script setup lang="ts">
import WebGLScene from '~/components/WebGLScene.vue'
import IntroGate from '~/components/IntroGate.vue'
import type { SceneContext } from '~/components/WebGLScene.vue'

useHead({
  title: 'Andrey Rondón — Portfolio',
  meta: [
    { name: 'description', content: 'Portafolio de Andrey Rondón' },
  ],
  link: [
    {
      rel: 'preload',
      href: '/fonts/space-grotesk-variable.woff2',
      as: 'font',
      type: 'font/woff2',
      crossorigin: '',
    },
    {
      rel: 'preload',
      href: '/fonts/CabinetGrotesk-800.woff2',
      as: 'font',
      type: 'font/woff2',
      crossorigin: '',
    },
    {
      rel: 'preload',
      href: '/fonts/CabinetGrotesk-900.woff2',
      as: 'font',
      type: 'font/woff2',
      crossorigin: '',
    },
    {
      rel: 'preload',
      href: '/fonts/LeMurmure-Regular.woff2',
      as: 'font',
      type: 'font/woff2',
      crossorigin: '',
    },
  ],
})

const INTRO_ENTER_TIMEOUT = 1950

const introVisible = ref(false)
const introEntering = ref(true)
const webglSupported = ref(true)
const sceneCtx = ref<SceneContext | null>(null)

// Audio: gate con sonido vs sin sonido (Web Audio desbloqueado por gesto)
let audioEl: HTMLAudioElement | null = null
const isAudioPlaying = ref(false)

const getAudio = () => {
  if (audioEl) return audioEl
  if (typeof window === 'undefined') return null
  audioEl = new Audio('/audio/whos-lovin-you-hoodtrap.mp3')
  audioEl.loop = true
  audioEl.volume = 0.38
  audioEl.preload = 'auto'
  return audioEl
}

const playAudio = async () => {
  const a = getAudio()
  if (!a) return
  try {
    await a.play()
    isAudioPlaying.value = true
  } catch (e) {
    console.warn('[audio] play bloqueado por policy', e)
  }
}

const pauseAudio = () => {
  if (audioEl) {
    audioEl.pause()
    isAudioPlaying.value = false
  }
}

const dismissIntro = (soundEnabled?: boolean) => {
  if (!introVisible.value) return
  introVisible.value = false
  introEntering.value = false
  history.pushState({ view: 'portfolio' }, '', location.pathname)
  if (soundEnabled) {
    playAudio()
    try { localStorage.setItem('soundEnabled', '1') } catch {}
  } else {
    pauseAudio()
    try { localStorage.setItem('soundEnabled', '0') } catch {}
  }
}

const showIntro = () => {
  introVisible.value = true
  pauseAudio()
  closeMenu()
}

const handlePopState = (e: PopStateEvent) => {
  const nextVisible = !e.state || e.state.view !== 'portfolio'
  introVisible.value = nextVisible
  if (nextVisible) {
    pauseAudio()
    closeMenu()
  }
}

// back restaurado desde bfcache: Chrome no dispara popstate al volver entre
// entradas con la misma URL; pageshow con persisted cubre ese caso
const handlePageShow = (e: PageTransitionEvent) => {
  if (e.persisted) {
    introVisible.value = true
    pauseAudio()
    closeMenu()
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (isNoteOpen.value) closeNote()
    else if (isMenuOpen.value) closeMenu()
  }
}

const handleSceneReady = (ctx: SceneContext) => {
  sceneCtx.value = ctx
}

const handleWebGLUnsupported = () => {
  webglSupported.value = false
}

const isMenuOpen = ref(false)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
  isMenuOpen.value = false
}

const viewMode = ref<'carousel' | 'list'>('carousel')

const isNoteOpen = ref(false)
const openNote = () => { isNoteOpen.value = true }
const closeNote = () => { isNoteOpen.value = false }

onMounted(() => {
  window.addEventListener('popstate', handlePopState)
  window.addEventListener('pageshow', handlePageShow)
  window.addEventListener('keydown', handleKeydown)

  // URL limpia: elimina cualquier hash heredado de enlaces viejos (/#work) sin tocar el historial
  if (location.hash) {
    history.replaceState(history.state, '', location.pathname + location.search)
  }

  // entrada fluida del gate en la carga: pinta oculto un frame y luego transiciona (misma curva que la vuelta);
  // la escena (.page) permanece oculta durante la entrada para que la recarga inicie en pantalla blanca
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      introVisible.value = true
      setTimeout(() => {
        introEntering.value = false
      }, INTRO_ENTER_TIMEOUT)
    })
  })
})

onUnmounted(() => {
  window.removeEventListener('popstate', handlePopState)
  window.removeEventListener('pageshow', handlePageShow)
  window.removeEventListener('keydown', handleKeydown)
  pauseAudio()
  if (audioEl) {
    audioEl.src = ''
    audioEl = null
  }
})
</script>

<template>
  <main class="layout">
    <IntroGate
      :active="introVisible"
      :class="{ 'intro-gate--hidden': !introVisible }"
      @enter="dismissIntro"
    />
    <div class="page" :class="{ 'page--hidden': introEntering }">
      <WebGLScene
        v-if="webglSupported && !introVisible"
        :clear-color="0xffffff"
        :fov="72"
        :camera-z="3.8"
        :camera-x="0"
        @webgl-unsupported="handleWebGLUnsupported"
        @scene-ready="handleSceneReady"
      />

      <button
        v-if="!introVisible"
        class="menu-toggle"
        type="button"
        :aria-label="isMenuOpen ? 'cerrar menú' : 'abrir menú'"
        :aria-expanded="isMenuOpen"
        @click="toggleMenu"
      >
        <span class="menu-toggle__label">{{ isMenuOpen ? 'cerrar' : 'menú' }}</span>
        <span class="menu-toggle__icon" aria-hidden="true">
          <span class="menu-toggle__bar" :class="{ 'menu-toggle__bar--open': isMenuOpen }" />
          <span class="menu-toggle__bar" :class="{ 'menu-toggle__bar--open': isMenuOpen }" />
        </span>
      </button>

      <Transition name="menu">
        <nav v-if="isMenuOpen && !introVisible" class="menu-panel" aria-label="navegación principal">
          <ul class="menu-panel__list">
            <li><a class="menu-panel__link" href="#" @click.prevent="closeMenu">inicio</a></li>
            <li><a class="menu-panel__link" href="#" @click.prevent="closeMenu">proyectos</a></li>
            <li><a class="menu-panel__link" href="#" @click.prevent="closeMenu">sobre mí</a></li>
            <li><a class="menu-panel__link" href="#" @click.prevent="closeMenu">contacto</a></li>
          </ul>
        </nav>
      </Transition>

      <div v-if="!introVisible" class="view-toggle" role="group" aria-label="cambiar vista">
        <button
          class="view-toggle__btn view-toggle__btn--carousel"
          :class="{ 'view-toggle__btn--active': viewMode === 'carousel' }"
          type="button"
          :aria-pressed="viewMode === 'carousel'"
          @click="viewMode = 'carousel'"
        >
          carrusel
        </button>
        <span class="view-toggle__dot" aria-hidden="true"></span>
        <button
          class="view-toggle__btn view-toggle__btn--list"
          :class="{ 'view-toggle__btn--active': viewMode === 'list' }"
          type="button"
          :aria-pressed="viewMode === 'list'"
          @click="viewMode = 'list'"
        >
          lista
        </button>
      </div>

      <div v-if="!introVisible" class="bottom-controls">
        <button
          class="audio-toggle"
          type="button"
          :aria-label="isAudioPlaying ? 'silenciar sonido' : 'activar sonido'"
          @click="isAudioPlaying ? pauseAudio() : playAudio()"
        >
          {{ isAudioPlaying ? 'sonido on' : 'sonido off' }}
        </button>
        <button
          class="info-toggle"
          type="button"
          aria-label="ver nota de diseño y desarrollo"
          aria-haspopup="dialog"
          :aria-expanded="isNoteOpen"
          @click="openNote"
        >
          <span aria-hidden="true">!</span>
        </button>
      </div>

      <Transition name="note">
        <div
          v-if="isNoteOpen"
          class="note-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Nota de diseño y desarrollo"
          @click.self="closeNote"
        >
          <article class="note-card">
            <button class="note-close" type="button" aria-label="cerrar nota" @click="closeNote">×</button>
            <p class="note-eyebrow">Nota — 2026 · Entorno experimental</p>
            <h2 class="note-title">Diseño y desarrollo</h2>
            <div class="note-divider" aria-hidden="true"></div>
            <div class="note-body">
              <p>
                Este portafolio es un entorno puramente experimental y de exploración creativa.
              </p>
              <p>
                La música utilizada de fondo
                <em class="note-track">Who's Lovin You (Hoodtrap) &nbsp;|&nbsp; Extended &nbsp;|&nbsp; @neverbadagain</em>
                se incluye exclusivamente como una pieza de concepto — <em>concept art</em> — para demostrar la sincronización, el ritmo y la atmósfera de la interfaz.
              </p>
              <p class="note-commit">
                En proyectos comerciales y entornos laborales, trabajo estrictamente con <em>assets</em> licenciados, música libre de regalías o recursos creados a medida.
              </p>
            </div>
          </article>
        </div>
      </Transition>

      <div v-if="!webglSupported" class="fallback">
        <h1 class="portfolio-text">portfolio</h1>
      </div>
    </div>
  </main>
</template>

<style scoped>
.layout {
  position: fixed;
  inset: 0;
  background-color: #ffffff;
  margin: 0;
  padding: 0;
  overflow: hidden;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.page {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background-color: #ffffff;
}

.page--hidden {
  visibility: hidden;
}

.fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.bottom-controls {
  position: absolute;
  left: 16px;
  bottom: 16px;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.audio-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 14px;
  background: #ffffff;
  border: 1px solid #15131a;
  border-radius: 14px;
  corner-shape: squircle;
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 500;
  font-size: 0.6875rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #15131a;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  transition:
    background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.audio-toggle:focus-visible {
  box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.5);
}

.audio-toggle:active {
  transform: scale(0.98);
  background: #f0f0f2;
}

@media (hover: hover) {
  .audio-toggle:hover {
    background: #f7f7f9;
  }
}

.info-toggle {
  width: 32px;
  height: 32px;
  border-radius: 12px;
  corner-shape: squircle;
  background: #ffffff;
  border: 1px solid #15131a;
  color: #15131a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 700;
  font-size: 0.875rem;
  line-height: 1;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  transition:
    background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    color 0.2s ease,
    transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.info-toggle:focus-visible {
  box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.5);
}

.info-toggle:active {
  transform: scale(0.96);
  background: #f0f0f2;
}

@media (hover: hover) {
  .info-toggle:hover {
    background: #15131a;
    color: #ffffff;
  }
}

.menu-toggle {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 36px;
  padding: 0 16px;
  background: #ffffff;
  border: 1px solid #15131a;
  border-radius: 14px;
  corner-shape: squircle;
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 700;
  font-size: 0.6875rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #15131a;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  transition:
    background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.menu-toggle:focus-visible {
  box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.5);
}

.menu-toggle:active {
  transform: scale(0.98);
  background: #f0f0f2;
}

@media (hover: hover) {
  .menu-toggle:hover {
    background: #f7f7f9;
  }
}

.menu-toggle__icon {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  width: 14px;
}

.menu-toggle__bar {
  display: block;
  height: 1.5px;
  background: #15131a;
  border-radius: 1px;
  transition:
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.2s ease;
  transform-origin: center;
}

.menu-toggle__bar--open:first-child {
  transform: translateY(2.75px) rotate(45deg);
}

.menu-toggle__bar--open:last-child {
  transform: translateY(-2.75px) rotate(-45deg);
}

.menu-panel {
  position: absolute;
  inset: 0;
  z-index: 9;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.menu-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
  text-align: center;
}

.menu-panel__link {
  display: inline-block;
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 700;
  font-size: 1.5rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #15131a;
  text-decoration: none;
  transition: color 0.2s ease;
}

.menu-panel__link:hover {
  color: #0066ff;
}

.menu-panel__link:focus-visible {
  outline: 2px solid #0066ff;
  outline-offset: 4px;
}

.menu-enter-active {
  transition:
    opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    backdrop-filter 0.4s ease;
}

.menu-leave-active {
  transition: opacity 0.3s ease;
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
}

.view-toggle {
  position: absolute;
  left: 24px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 5;
  display: inline-flex;
  align-items: center;
  gap: 14px;
}

.view-toggle__btn {
  background: none;
  border: none;
  padding: 6px 4px;
  font-family: 'Space Grotesk Variable', sans-serif;
  font-size: 0.9375rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  transition: color 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.view-toggle__btn--carousel {
  font-weight: 700;
}

.view-toggle__btn--list {
  font-weight: 300;
}

.view-toggle__btn:focus-visible {
  outline: 2px solid #0066ff;
  outline-offset: 3px;
}

/* rojo solo para carrusel */
.view-toggle__btn--carousel.view-toggle__btn--active {
  color: #ff1818;
}

.view-toggle__btn--carousel:not(.view-toggle__btn--active) {
  color: #15131a;
}

/* lista sin color: gris neutro, nunca rojo ni azul */
.view-toggle__btn--list,
.view-toggle__btn--list.view-toggle__btn--active {
  color: #9ca3af;
}

.view-toggle__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #15131a;
  flex-shrink: 0;
  user-select: none;
}

@media (hover: hover) {
  .view-toggle__btn--carousel:hover {
    color: #0066ff;
  }
  .view-toggle__btn--carousel.view-toggle__btn--active:hover {
    color: #ff1818;
  }
  .view-toggle__btn--list:hover {
    color: #9ca3af;
  }
}

@media (max-width: 640px) {
  .view-toggle {
    left: 16px;
    top: 50%;
    bottom: auto;
    transform: translateY(-50%);
    gap: 10px;
  }
  .view-toggle__btn {
    font-size: 0.875rem;
  }
  .view-toggle__dot {
    width: 7px;
    height: 7px;
  }
}

.note-overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.note-card {
  position: relative;
  width: min(560px, 92vw);
  background: #ffffff;
  border: 1px solid #15131a;
  border-radius: 28px;
  corner-shape: squircle;
  overflow: hidden;
  padding: 40px 36px 36px;
  text-align: left;
}

.note-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  background: none;
  border: 1px solid transparent;
  border-radius: 10px;
  corner-shape: squircle;
  color: #9ca3af;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.note-close:hover {
  color: #15131a;
  border-color: #15131a;
}

.note-close:focus-visible {
  outline: 2px solid #0066ff;
  outline-offset: 2px;
}

.note-eyebrow {
  margin: 0 0 10px;
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 500;
  font-size: 0.6875rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #9ca3af;
}

.note-title {
  margin: 0;
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 700;
  font-size: 1.125rem;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: #15131a;
}

.note-divider {
  width: 28px;
  height: 1px;
  background: #ff1818;
  margin: 18px 0 20px;
}

.note-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.note-body p {
  margin: 0;
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 400;
  font-size: 0.875rem;
  line-height: 1.85;
  letter-spacing: 0.01em;
  color: #3f3f46;
}

.note-track {
  font-style: normal;
  font-weight: 500;
  color: #15131a;
  border-bottom: 1px solid #e4e4e7;
  padding-bottom: 1px;
}

.note-commit {
  margin-top: 4px !important;
  padding-top: 16px;
  border-top: 1px solid #f4f4f5;
  font-size: 0.8125rem !important;
  line-height: 1.7 !important;
  color: #52525b !important;
}

.note-commit em {
  font-style: normal;
  font-weight: 500;
  color: #15131a;
}

/* Awwwards-acclaimed: Glass Modal — scale-spring + deep blur + stagger */
.note-enter-active {
  transition: opacity 0.38s cubic-bezier(0.22, 1, 0.36, 1);
}

.note-enter-active .note-card {
  transition:
    transform 0.58s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.38s cubic-bezier(0.22, 1, 0.36, 1);
}

.note-enter-active .note-eyebrow,
.note-enter-active .note-title,
.note-enter-active .note-divider,
.note-enter-active .note-body p {
  transition:
    opacity 0.42s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.42s cubic-bezier(0.22, 1, 0.36, 1);
}

.note-enter-from {
  opacity: 0;
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
}

.note-enter-from .note-card {
  opacity: 0;
  transform: scale(0.92) translateY(16px);
}

.note-enter-from .note-eyebrow {
  opacity: 0;
  transform: translateY(8px);
  transition-delay: 0.05s;
}

.note-enter-from .note-title {
  opacity: 0;
  transform: translateY(8px);
  transition-delay: 0.09s;
}

.note-enter-from .note-divider {
  opacity: 0;
  transform: scaleX(0);
  transform-origin: left;
  transition-delay: 0.13s;
}

.note-enter-from .note-body p:nth-child(1) {
  opacity: 0;
  transform: translateY(8px);
  transition-delay: 0.17s;
}

.note-enter-from .note-body p:nth-child(2) {
  opacity: 0;
  transform: translateY(8px);
  transition-delay: 0.21s;
}

.note-enter-from .note-body p:nth-child(3) {
  opacity: 0;
  transform: translateY(8px);
  transition-delay: 0.25s;
}

.note-enter-to {
  opacity: 1;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.note-enter-to .note-card {
  opacity: 1;
  transform: scale(1) translateY(0);
}

.note-enter-to .note-eyebrow,
.note-enter-to .note-title,
.note-enter-to .note-body p {
  opacity: 1;
  transform: translateY(0);
}

.note-enter-to .note-divider {
  opacity: 1;
  transform: scaleX(1);
}

.note-leave-active {
  transition: opacity 0.28s cubic-bezier(0.32, 0, 0.67, 0);
}

.note-leave-active .note-card {
  transition:
    transform 0.32s cubic-bezier(0.32, 0, 0.67, 0),
    opacity 0.24s ease;
}

.note-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
}

.note-leave-to .note-card {
  opacity: 0;
  transform: scale(0.96) translateY(8px);
}

@media (max-width: 640px) {
  .note-card {
    padding: 32px 22px 28px;
  }
  .note-title {
    font-size: 1rem;
  }
  .note-body p {
    font-size: 0.8125rem;
    line-height: 1.75;
  }
}
</style>