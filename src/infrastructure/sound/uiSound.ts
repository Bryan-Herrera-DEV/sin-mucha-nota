import { DEFAULT_SOUND_VOLUME, normalizeSoundVolume } from '@/domain/preferences/preferences'

export type UiSound = 'tap' | 'save' | 'open' | 'delete' | 'page'

let soundEnabled = true
let soundVolume = DEFAULT_SOUND_VOLUME
let soundEnginePromise: Promise<typeof import('./uiSoundEngine') | null> | null = null

export function setUiSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled
  configureLoadedEngine()
}

export function setUiSoundVolume(volume: number): void {
  soundVolume = normalizeSoundVolume(volume)
  configureLoadedEngine()
}

export function playUiSound(sound: UiSound): void {
  if (!soundEnabled || soundVolume === 0) {
    return
  }

  soundEnginePromise ??= import('./uiSoundEngine').catch(() => null)
  void soundEnginePromise.then((soundEngine) => {
    if (!soundEngine) {
      return
    }

    soundEngine.configureUiSoundEngine({ enabled: soundEnabled, volume: soundVolume })

    if (soundEnabled && soundVolume > 0) {
      soundEngine.playUiSoundRecipe(sound)
    }
  })
}

function configureLoadedEngine(): void {
  if (!soundEnginePromise) {
    return
  }

  void soundEnginePromise.then((soundEngine) => {
    soundEngine?.configureUiSoundEngine({ enabled: soundEnabled, volume: soundVolume })
  })
}
