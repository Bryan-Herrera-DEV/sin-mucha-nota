import { DEFAULT_SOUND_VOLUME, normalizeSoundVolume } from '@/domain/preferences/preferences'
import type { UiSound } from '@/infrastructure/sound/uiSound'

// Volume-capable local renderer adapted from Cuelume 0.1.2 (MIT).
// It remains lazy-loaded so Web Audio is created only after the first sound request.

const SOURCE_STOP_PADDING = 0.05
const CLEANUP_MARGIN = 0.05
const INAUDIBLE_GAIN = 0.001
const GAIN_SMOOTHING_SECONDS = 0.015
const MAX_UI_SOUND_GAIN = 10

type SoundLayerBase = {
  offset?: number
  attack: number
  decay: number
  peak: number
}

type ToneLayer = SoundLayerBase & {
  kind: 'tone'
  waveform: OscillatorType
  frequency: number
  detune?: number
}

type NoiseLayer = SoundLayerBase & {
  kind: 'noise'
  filterType: BiquadFilterType
  filterFrequency: number
  filterQ?: number
}

type SoundLayer = ToneLayer | NoiseLayer

type Shimmer = {
  delay: number
  feedback: number
  wet: number
  lowpass: number
}

type SoundRecipe = {
  masterGain: number
  layers: readonly SoundLayer[]
  shimmer?: Shimmer
}

type AudioGraph = {
  context: AudioContext
  output: GainNode
}

const SOUND_RECIPES = {
  tap: {
    masterGain: 0.4,
    layers: [
      { kind: 'noise', filterType: 'bandpass', filterFrequency: 5400, filterQ: 1.8, attack: 0.001, decay: 0.018, peak: 0.14 },
      { kind: 'tone', waveform: 'sine', frequency: 2600, attack: 0.001, decay: 0.012, peak: 0.018 },
    ],
  },
  open: {
    masterGain: 0.5,
    layers: [
      { kind: 'tone', waveform: 'sine', frequency: 528, attack: 0.06, decay: 0.32, peak: 0.06 },
      { kind: 'tone', waveform: 'sine', frequency: 528, detune: 12, attack: 0.06, decay: 0.34, peak: 0.05 },
    ],
    shimmer: { delay: 0.15, feedback: 0.2, wet: 0.12, lowpass: 2500 },
  },
  save: {
    masterGain: 0.5,
    layers: [
      { kind: 'tone', waveform: 'sine', frequency: 880, attack: 0.004, decay: 0.09, peak: 0.06 },
      { kind: 'tone', waveform: 'sine', frequency: 1108.73, offset: 0.06, attack: 0.004, decay: 0.1, peak: 0.06 },
      { kind: 'tone', waveform: 'sine', frequency: 1318.51, offset: 0.12, attack: 0.004, decay: 0.18, peak: 0.07 },
    ],
    shimmer: { delay: 0.1, feedback: 0.22, wet: 0.16, lowpass: 4500 },
  },
  delete: {
    masterGain: 0.42,
    layers: [
      { kind: 'noise', filterType: 'bandpass', filterFrequency: 850, filterQ: 1.1, attack: 0.001, decay: 0.035, peak: 0.13 },
      { kind: 'tone', waveform: 'triangle', frequency: 440, offset: 0.025, attack: 0.004, decay: 0.09, peak: 0.045 },
      { kind: 'tone', waveform: 'triangle', frequency: 349.23, offset: 0.1, attack: 0.004, decay: 0.14, peak: 0.04 },
    ],
  },
  page: {
    masterGain: 0.38,
    layers: [
      { kind: 'noise', filterType: 'lowpass', filterFrequency: 1800, filterQ: 0.7, attack: 0.006, decay: 0.08, peak: 0.11 },
      { kind: 'noise', filterType: 'bandpass', filterFrequency: 4200, filterQ: 1.2, offset: 0.04, attack: 0.004, decay: 0.065, peak: 0.08 },
      { kind: 'tone', waveform: 'sine', frequency: 2400, offset: 0.075, attack: 0.002, decay: 0.045, peak: 0.02 },
    ],
  },
} as const satisfies Record<UiSound, SoundRecipe>

let audioGraph: AudioGraph | null = null
let engineEnabled = true
let engineVolume = DEFAULT_SOUND_VOLUME

export function configureUiSoundEngine(options: { enabled: boolean; volume: number }): void {
  engineEnabled = options.enabled
  engineVolume = normalizeSoundVolume(options.volume)
  updateOutputGain()
}

export function playUiSoundRecipe(sound: UiSound): void {
  if (!engineEnabled || engineVolume === 0) {
    return
  }

  if (typeof navigator !== 'undefined' && navigator.userActivation?.hasBeenActive === false) {
    return
  }

  const graph = getAudioGraph()

  if (!graph) {
    return
  }

  if (graph.context.state === 'running') {
    renderRecipe(graph, SOUND_RECIPES[sound])
    return
  }

  try {
    void graph.context.resume().then(
      () => {
        if (engineEnabled && engineVolume > 0 && graph.context.state === 'running') {
          renderRecipe(graph, SOUND_RECIPES[sound])
        }
      },
      () => undefined,
    )
  } catch {
    // Some browsers throw synchronously when audio playback is blocked.
  }
}

function getAudioGraph(): AudioGraph | null {
  if (audioGraph) {
    return audioGraph
  }

  if (typeof window === 'undefined') {
    return null
  }

  const AudioContextConstructor =
    window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!AudioContextConstructor) {
    return null
  }

  try {
    const context = new AudioContextConstructor()
    const output = context.createGain()
    output.gain.value = engineEnabled ? toOutputGain(engineVolume) : 0
    output.connect(context.destination)
    audioGraph = { context, output }
  } catch {
    return null
  }

  return audioGraph
}

function updateOutputGain(): void {
  if (!audioGraph) {
    return
  }

  const { context, output } = audioGraph
  const targetGain = engineEnabled ? toOutputGain(engineVolume) : 0
  output.gain.cancelScheduledValues(context.currentTime)
  output.gain.setTargetAtTime(targetGain, context.currentTime, GAIN_SMOOTHING_SECONDS)
}

function toOutputGain(volume: number): number {
  return volume * MAX_UI_SOUND_GAIN
}

function renderRecipe(graph: AudioGraph, recipe: SoundRecipe): void {
  const { context, output } = graph
  const now = context.currentTime
  const master = context.createGain()
  master.gain.value = recipe.masterGain
  master.connect(output)

  const shimmerNodes = recipe.shimmer ? attachShimmer(context, master, output, recipe.shimmer) : []

  for (const layer of recipe.layers) {
    const startTime = now + (layer.offset ?? 0)

    if (layer.kind === 'tone') {
      renderTone(context, master, layer, startTime)
    } else {
      renderNoise(context, master, layer, startTime)
    }
  }

  const cleanupAfterMs = (sourceEnd(recipe) + shimmerTail(recipe.shimmer) + CLEANUP_MARGIN) * 1000
  window.setTimeout(() => {
    master.disconnect()
    shimmerNodes.forEach((node) => node.disconnect())
  }, cleanupAfterMs)
}

function renderTone(context: AudioContext, destination: AudioNode, layer: ToneLayer, startTime: number): void {
  const oscillator = context.createOscillator()
  oscillator.type = layer.waveform
  oscillator.frequency.setValueAtTime(layer.frequency, startTime)

  if (layer.detune !== undefined) {
    oscillator.detune.value = layer.detune
  }

  const gain = context.createGain()
  applyEnvelope(gain.gain, layer, startTime)
  oscillator.connect(gain).connect(destination)
  oscillator.start(startTime)
  oscillator.stop(startTime + layer.attack + layer.decay + SOURCE_STOP_PADDING)
}

function renderNoise(context: AudioContext, destination: AudioNode, layer: NoiseLayer, startTime: number): void {
  const duration = layer.attack + layer.decay + SOURCE_STOP_PADDING
  const buffer = context.createBuffer(1, Math.max(1, Math.floor(duration * context.sampleRate)), context.sampleRate)
  const data = buffer.getChannelData(0)

  for (let index = 0; index < data.length; index += 1) {
    data[index] = 2 * Math.random() - 1
  }

  const source = context.createBufferSource()
  source.buffer = buffer

  const filter = context.createBiquadFilter()
  filter.type = layer.filterType
  filter.frequency.value = layer.filterFrequency

  if (layer.filterQ !== undefined) {
    filter.Q.value = layer.filterQ
  }

  const gain = context.createGain()
  applyEnvelope(gain.gain, layer, startTime)
  source.connect(filter).connect(gain).connect(destination)
  source.start(startTime)
  source.stop(startTime + duration)
}

function applyEnvelope(gain: AudioParam, layer: SoundLayerBase, startTime: number): void {
  gain.setValueAtTime(0.0001, startTime)
  gain.exponentialRampToValueAtTime(layer.peak, startTime + layer.attack)
  gain.exponentialRampToValueAtTime(0.0001, startTime + layer.attack + layer.decay)
}

function attachShimmer(context: AudioContext, source: AudioNode, destination: AudioNode, shimmer: Shimmer): AudioNode[] {
  const delay = context.createDelay(1)
  delay.delayTime.value = shimmer.delay

  const feedbackFilter = context.createBiquadFilter()
  feedbackFilter.type = 'lowpass'
  feedbackFilter.frequency.value = shimmer.lowpass

  const feedbackGain = context.createGain()
  feedbackGain.gain.value = shimmer.feedback

  const wetGain = context.createGain()
  wetGain.gain.value = shimmer.wet

  source.connect(delay)
  delay.connect(feedbackFilter)
  feedbackFilter.connect(feedbackGain)
  feedbackGain.connect(delay)
  feedbackFilter.connect(wetGain)
  wetGain.connect(destination)

  return [delay, feedbackFilter, feedbackGain, wetGain]
}

function sourceEnd(recipe: SoundRecipe): number {
  return Math.max(...recipe.layers.map((layer) => (layer.offset ?? 0) + layer.attack + layer.decay + SOURCE_STOP_PADDING))
}

function shimmerTail(shimmer: Shimmer | undefined): number {
  if (!shimmer || shimmer.feedback <= 0) {
    return 0
  }

  if (shimmer.feedback >= 1) {
    return shimmer.delay
  }

  return shimmer.delay * (1 + Math.ceil(Math.log(INAUDIBLE_GAIN) / Math.log(shimmer.feedback)))
}
