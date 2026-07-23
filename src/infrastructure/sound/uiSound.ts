import type { SoundName } from 'cuelume'

export type UiSound = 'tap' | 'save' | 'open' | 'delete' | 'page'

const soundMap: Record<UiSound, SoundName> = {
  tap: 'tick',
  open: 'bloom',
  save: 'success',
  delete: 'error',
  page: 'page',
}

let soundEnabled = true
let soundModulePromise: Promise<typeof import('cuelume') | null> | null = null

export function setUiSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled

  if (soundModulePromise) {
    void soundModulePromise.then((soundModule) => soundModule?.setEnabled(enabled))
  }
}

export function playUiSound(sound: UiSound): void {
  if (!soundEnabled) {
    return
  }

  soundModulePromise ??= import('cuelume').catch(() => null)
  void soundModulePromise.then((soundModule) => {
    if (!soundModule) {
      return
    }

    soundModule.setEnabled(soundEnabled)

    if (soundEnabled) {
      soundModule.play(soundMap[sound])
    }
  })
}
