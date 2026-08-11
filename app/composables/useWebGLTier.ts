export type WebGLTier = 'low' | 'mid' | 'high'

export function detectWebGLTier(): WebGLTier {
  if (typeof navigator === 'undefined') return 'high'

  const concurrency = navigator.hardwareConcurrency || 4
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
  const isLowEndMobile = isMobile && (concurrency <= 4 || memory <= 2)

  if (isLowEndMobile) return 'low'
  if (isMobile) return 'mid'
  if (concurrency < 4 || memory < 4) return 'low'
  if (concurrency >= 8 && memory >= 8) return 'high'

  return 'mid'
}

export function detectWebGLSupport(): boolean {
  if (typeof document === 'undefined') return true
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
  if (!gl) return false
  const gl2 = canvas.getContext('webgl2')
  return !!gl2 || !!canvas.getContext('webgl')
}

export function getDPR(tier: WebGLTier): number {
  if (typeof window === 'undefined') return 1

  const cap = tier === 'high' ? 2 : tier === 'mid' ? 1.5 : 1
  return Math.min(window.devicePixelRatio || 1, cap)
}

export function shouldEnableBloom(tier: WebGLTier): boolean {
  return tier !== 'low'
}

export function shouldEnableRadialBlur(tier: WebGLTier): boolean {
  return tier === 'high'
}
