export type UiSound = 'tap' | 'save' | 'open' | 'delete'

let audioContext: AudioContext | null = null

const soundMap: Record<UiSound, { frequency: number; duration: number; gain: number }> = {
  tap: { frequency: 440, duration: 0.075, gain: 0.055 },
  open: { frequency: 520, duration: 0.095, gain: 0.05 },
  save: { frequency: 660, duration: 0.12, gain: 0.052 },
  delete: { frequency: 220, duration: 0.11, gain: 0.045 },
}

export function playUiSound(sound: UiSound): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    audioContext = audioContext?.state === 'closed' ? null : audioContext
    audioContext ??= new window.AudioContext()

    if (audioContext.state === 'suspended') {
      void audioContext.resume().then(() => playOscillator(audioContext, sound)).catch(() => undefined)

      return
    }

    playOscillator(audioContext, sound)
  } catch {
    // Browsers can deny audio until a valid user gesture. The next click will retry.
  }
}

function playOscillator(context: AudioContext | null, sound: UiSound): void {
  if (!context) {
    return
  }

  const soundConfig = soundMap[sound]
  const oscillator = context.createOscillator()
  const overtone = context.createOscillator()
  const gain = context.createGain()
  const startTime = context.currentTime

  oscillator.type = 'sine'
  overtone.type = 'triangle'
  oscillator.frequency.setValueAtTime(soundConfig.frequency, startTime)
  overtone.frequency.setValueAtTime(soundConfig.frequency * 1.5, startTime)
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(soundConfig.gain, startTime + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + soundConfig.duration)
  oscillator.connect(gain)
  overtone.connect(gain)
  gain.connect(context.destination)
  oscillator.start(startTime)
  overtone.start(startTime)
  oscillator.stop(startTime + soundConfig.duration)
  overtone.stop(startTime + soundConfig.duration * 0.72)
}
