import * as THREE from 'three'

export interface ScrollState {
  target: number
  current: number
  velocity: number
  last: number
}

const WHEEL_SENS = 0.035
const TOUCH_SENS = 0.025
const DRAG_SENS = 0.025
const DRIFT_RATE = 0.0003
const DRIFT_RESUME_DELAY = 1200

export function useGalleryScroll() {
  const state: ScrollState = {
    target: 0,
    current: 0,
    velocity: 0,
    last: 0,
  }

  let isDragging = false
  let lastPointerX = 0
  let lastTouchX = 0
  let inputActiveUntil = 0

  const markInputActive = () => {
    inputActiveUntil = performance.now() + DRIFT_RESUME_DELAY
  }

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    state.target += e.deltaY * WHEEL_SENS
    markInputActive()
  }

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 0) return
    lastTouchX = e.touches[0].clientX
    markInputActive()
  }

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 0) return
    e.preventDefault()
    const x = e.touches[0].clientX
    const dx = x - lastTouchX
    lastTouchX = x
    state.target += dx * TOUCH_SENS
    markInputActive()
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    isDragging = true
    lastPointerX = e.clientX
    markInputActive()
  }

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || !isDragging) return
    const dx = e.clientX - lastPointerX
    lastPointerX = e.clientX
    state.target += dx * DRAG_SENS
    markInputActive()
  }

  const onPointerUp = () => {
    isDragging = false
    markInputActive()
  }

  const step = (delta: number) => {
    if (delta <= 0) return

    const now = performance.now()
    const allowDrift = !isDragging && now >= inputActiveUntil

    if (allowDrift) {
      state.target += DRIFT_RATE * delta * 60
    }

    state.current = THREE.MathUtils.damp(state.current, state.target, 8.0, delta)
    const moved = state.current - state.last
    state.velocity = delta > 0 ? moved / delta : 0
    state.last = state.current
  }

  const bind = () => {
    if (typeof window === 'undefined') return
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }

  const unbind = () => {
    if (typeof window === 'undefined') return
    window.removeEventListener('wheel', onWheel)
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
  }

  return { state, step, bind, unbind }
}
