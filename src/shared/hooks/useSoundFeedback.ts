import { useCallback } from 'react'
import { playUiSound, setUiSoundEnabled, type UiSound } from '@/infrastructure/sound/uiSound'
import { useWorkspaceStore } from '@/app/state/workspace.store'

export function useSoundFeedback(): (sound?: UiSound) => void {
  return useCallback((sound: UiSound = 'tap') => {
    const soundEnabled = useWorkspaceStore.getState().preferences?.soundEnabled ?? true
    setUiSoundEnabled(soundEnabled)

    if (soundEnabled) {
      playUiSound(sound)
    }
  }, [])
}
