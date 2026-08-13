export function detectWebGLSupport(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    return !!gl
  } catch {
    return false
  }
}

export function getDPR(): number {
  if (typeof window === 'undefined') return 1
  return Math.min(window.devicePixelRatio, 1.5)
}