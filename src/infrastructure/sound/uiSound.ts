export type UiSound = 'tap' | 'save' | 'open' | 'delete'

let audioContext: AudioContext | null = null

const soundMap: Record<UiSound, { frequency: number; duration: number; gain: number }> = {
  tap: { frequency: 440, duration: 0.045, gain: 0.025 },
  open: { frequency: 520, duration: 0.065, gain: 0.022 },
  save: { frequency: 660, duration: 0.08, gain: 0.024 },
  delete: { frequency: 220, duration: 0.07, gain: 0.018 },
}

export function playUiSound(sound: UiSound): void {
  if (typeof window === 'undefined') {
    return
  }

  audioContext ??= new AudioContext()

  const soundConfig = soundMap[sound]
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()
  const startTime = audioContext.currentTime

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(soundConfig.frequency, startTime)
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(soundConfig.gain, startTime + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + soundConfig.duration)
  oscillator.connect(gain)
  gain.connect(audioContext.destination)
  oscillator.start(startTime)
  oscillator.stop(startTime + soundConfig.duration)
}
