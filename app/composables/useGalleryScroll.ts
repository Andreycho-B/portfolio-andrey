import * as THREE from 'three'

export interface ScrollState {
  target: number
  current: number
  velocity: number
  last: number
}

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

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    state.target += e.deltaY * 0.001 + e.deltaX * 0.001
  }

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 0) return
    lastTouchX = e.touches[0].clientX
  }

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 0) return
    e.preventDefault()
    const x = e.touches[0].clientX
    const dx = x - lastTouchX
    lastTouchX = x
    state.target += dx * 0.004
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    isDragging = true
    lastPointerX = e.clientX
  }

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || !isDragging) return
    const dx = e.clientX - lastPointerX
    lastPointerX = e.clientX
    state.target += dx * 0.004
  }

  const onPointerUp = () => {
    isDragging = false
  }

  const step = (delta: number) => {
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