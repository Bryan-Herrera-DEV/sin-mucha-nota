import { play, setEnabled, type SoundName } from 'cuelume'

export type UiSound = 'tap' | 'save' | 'open' | 'delete' | 'page'

const soundMap: Record<UiSound, SoundName> = {
  tap: 'tick',
  open: 'bloom',
  save: 'success',
  delete: 'error',
  page: 'page',
}

export function setUiSoundEnabled(enabled: boolean): void {
  setEnabled(enabled)
}

export function playUiSound(sound: UiSound): void {
  play(soundMap[sound])
}
