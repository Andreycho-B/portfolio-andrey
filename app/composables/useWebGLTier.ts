export type WebGLTier = 'low' | 'mid' | 'high'

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

export function detectWebGLTier(): WebGLTier {
  if (typeof window === 'undefined') return 'mid'
  const cores = navigator.hardwareConcurrency || 4
  const memory = (navigator as any).deviceMemory || 4
  const ua = navigator.userAgent.toLowerCase()
  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(ua)

  if (isMobile || cores <= 4 || memory <= 2) return 'low'
  if (cores >= 8 && memory >= 4) return 'high'
  return 'mid'
}

export function getDPR(_tier: WebGLTier): number {
  if (typeof window === 'undefined') return 1
  return Math.min(window.devicePixelRatio, 1.5)
}

export function shouldEnableBloom(_tier: WebGLTier): boolean {
  return false
}

export function shouldEnableRadialBlur(_tier: WebGLTier): boolean {
  return false
}
