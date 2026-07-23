import { useCallback } from 'react'
import { DEFAULT_SOUND_VOLUME } from '@/domain/preferences/preferences'
import { playUiSound, setUiSoundEnabled, setUiSoundVolume, type UiSound } from '@/infrastructure/sound/uiSound'
import { useWorkspaceStore } from '@/app/state/workspace.store'

export function useSoundFeedback(): (sound?: UiSound) => void {
  return useCallback((sound: UiSound = 'tap') => {
    const preferences = useWorkspaceStore.getState().preferences
    const soundEnabled = preferences?.soundEnabled ?? true
    const soundVolume = preferences?.soundVolume ?? DEFAULT_SOUND_VOLUME

    setUiSoundVolume(soundVolume)
    setUiSoundEnabled(soundEnabled)

    if (soundEnabled) {
      playUiSound(sound)
    }
  }, [])
}
