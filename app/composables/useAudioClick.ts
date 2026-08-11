let ctx: AudioContext | null = null
let lastClickTime = 0

const ensureContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null
  if (ctx) return ctx
  const AC = window.AudioContext || (window as any).webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  return ctx
}

const resume = async () => {
  const c = ensureContext()
  if (c && c.state === 'suspended') {
    try { await c.resume() } catch {}
  }
}

const playClick = (velocity: number) => {
  const c = ensureContext()
  if (!c || c.state !== 'running') return
  const now = c.currentTime
  if (now - lastClickTime < 0.08) return
  lastClickTime = now
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.value = 80
  const vol = Math.min(0.12, Math.abs(velocity) * 0.4)
  if (vol < 0.002) return
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(vol, now + 0.002)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04)
  osc.connect(gain).connect(c.destination)
  osc.start(now)
  osc.stop(now + 0.05)
}

export function useAudioClick() {
  return { resume, playClick }
}