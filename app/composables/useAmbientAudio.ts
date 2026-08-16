// Sonido ambiental procedimental generado con Web Audio API — sin assets binarios
// (PAP-004: sin dependencias nuevas). Pad suave de osciladores detunados con
// filtro pasa-bajos y LFO lento para movimiento sutil. Fade-in gradual al entrar.
// Sustituible por un <audio> con asset real sin tocar la API (start/stop).

let ctx: AudioContext | null = null
let master: GainNode | null = null
let started = false

const TARGET_GAIN = 0.06
const FADE_IN_SECONDS = 2.5

const buildGraph = (): boolean => {
  if (ctx) return true
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!AC) return false

  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 640
  filter.Q.value = 0.6
  filter.connect(master)

  const addOsc = (
    frequency: number,
    type: OscillatorType,
    detune: number,
    gain: number,
    destination: AudioNode,
  ) => {
    const osc = ctx!.createOscillator()
    osc.type = type
    osc.frequency.value = frequency
    osc.detune.value = detune
    const g = ctx!.createGain()
    g.gain.value = gain
    osc.connect(g)
    g.connect(destination)
    osc.start()
  }

  const A2 = 110
  const E3 = 164.81
  addOsc(A2, 'sine', 0, 0.5, filter)
  addOsc(A2 * 1.005, 'sine', 0, 0.4, filter)
  addOsc(E3, 'triangle', 0, 0.18, filter)
  addOsc(E3 * 1.003, 'triangle', 0, 0.16, filter)
  addOsc(E3 * 2, 'sine', 0, 0.05, filter)

  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.07
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 180
  lfo.connect(lfoGain)
  lfoGain.connect(filter.frequency)
  lfo.start()

  return true
}

const start = async () => {
  if (started) return
  if (!buildGraph() || !ctx || !master) return
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      /* el contexto se reactiva en el próximo gesto (autoplay) */
    }
  }
  started = true
  const t = ctx.currentTime
  master.gain.cancelScheduledValues(t)
  master.gain.setValueAtTime(master.gain.value, t)
  master.gain.linearRampToValueAtTime(TARGET_GAIN, t + FADE_IN_SECONDS)
}

const stop = async () => {
  if (!ctx || !master) return
  const t = ctx.currentTime
  master.gain.cancelScheduledValues(t)
  master.gain.setValueAtTime(master.gain.value, t)
  master.gain.linearRampToValueAtTime(0, t + 1)
  try {
    await ctx.suspend()
  } catch {
    /* no-op */
  }
}

export function useAmbientAudio() {
  return { start, stop }
}
