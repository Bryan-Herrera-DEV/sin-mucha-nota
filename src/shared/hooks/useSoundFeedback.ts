import { useEffect } from 'react'
import { playUiSound, setUiSoundEnabled, type UiSound } from '@/infrastructure/sound/uiSound'
import { useWorkspaceStore } from '@/app/state/workspace.store'

export function useSoundFeedback(): (sound?: UiSound) => void {
  const soundEnabled = useWorkspaceStore((state) => state.preferences?.soundEnabled ?? true)

  useEffect(() => {
    setUiSoundEnabled(soundEnabled)
  }, [soundEnabled])

  return (sound = 'tap') => {
    if (soundEnabled) {
      playUiSound(sound)
    }
  }
}
