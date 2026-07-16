import { createHexColor, ensureNonEmptyText, nowIso, type HexColor, type ISODate } from '@/domain/shared/valueObjects'

export const supportedLocales = ['es', 'en'] as const
export type Locale = (typeof supportedLocales)[number]

export const fontFamilies = ['system', 'serif', 'mono', 'rounded'] as const
export type FontFamily = (typeof fontFamilies)[number]

export type UserPreferences = {
  displayName: string
  accentColor: HexColor
  fontFamily: FontFamily
  locale: Locale
  soundEnabled: boolean
  onboardedAt: ISODate
  updatedAt: ISODate
}

export const accentColorOptions = [
  { label: 'Terracota', value: '#c7774a' as HexColor },
  { label: 'Oliva', value: '#7f8f52' as HexColor },
  { label: 'Ciruela', value: '#9d5c74' as HexColor },
  { label: 'Azul tinta', value: '#526d8f' as HexColor },
  { label: 'Miel', value: '#c4953b' as HexColor },
] as const

export const fontOptions = [
  { value: 'system', labelEs: 'Sistema', labelEn: 'System' },
  { value: 'serif', labelEs: 'Editorial', labelEn: 'Editorial' },
  { value: 'rounded', labelEs: 'Redondeada', labelEn: 'Rounded' },
  { value: 'mono', labelEs: 'Monoespaciada', labelEn: 'Monospace' },
] as const satisfies ReadonlyArray<{ value: FontFamily; labelEs: string; labelEn: string }>

export function createUserPreferences(input: {
  displayName: string
  accentColor: string
  fontFamily: FontFamily
  locale: Locale
  soundEnabled?: boolean
}): UserPreferences {
  const timestamp = nowIso()

  return {
    displayName: ensureNonEmptyText(input.displayName, 'El nombre', 40),
    accentColor: createHexColor(input.accentColor),
    fontFamily: input.fontFamily,
    locale: input.locale,
    soundEnabled: input.soundEnabled ?? true,
    onboardedAt: timestamp,
    updatedAt: timestamp,
  }
}

export function updateUserPreferences(
  preferences: UserPreferences,
  patch: Partial<Omit<UserPreferences, 'onboardedAt' | 'updatedAt' | 'accentColor'> & { accentColor: string }>,
): UserPreferences {
  return {
    ...preferences,
    displayName: patch.displayName === undefined ? preferences.displayName : ensureNonEmptyText(patch.displayName, 'El nombre', 40),
    accentColor: patch.accentColor === undefined ? preferences.accentColor : createHexColor(patch.accentColor),
    fontFamily: patch.fontFamily ?? preferences.fontFamily,
    locale: patch.locale ?? preferences.locale,
    soundEnabled: patch.soundEnabled ?? preferences.soundEnabled,
    updatedAt: nowIso(),
  }
}
