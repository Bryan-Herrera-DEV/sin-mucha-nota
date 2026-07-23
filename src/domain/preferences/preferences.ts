import { createHexColor, ensureNonEmptyText, nowIso, type HexColor, type ISODate } from '@/domain/shared/valueObjects'

export const supportedLocales = ['es', 'en'] as const
export type Locale = (typeof supportedLocales)[number]

export const fontFamilies = ['system', 'serif', 'mono', 'rounded'] as const
export type FontFamily = (typeof fontFamilies)[number]

export const themeIds = [
  'forest',
  'midnight',
  'ember',
  'plum',
  'sand',
  'light',
  'blush',
  'sage',
] as const

export type ThemeId = (typeof themeIds)[number]

export const DEFAULT_SOUND_VOLUME = 1

export function normalizeSoundVolume(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_SOUND_VOLUME
  }

  return Math.round(Math.min(1, Math.max(0, value)) * 100) / 100
}

export type UserPreferences = {
  displayName: string
  accentColor: HexColor
  themeId: ThemeId
  fontFamily: FontFamily
  locale: Locale
  soundEnabled: boolean
  soundVolume: number
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

export const themeOptions = [
  {
    value: 'forest',
    labelEs: 'Bosque',
    labelEn: 'Forest',
    descriptionEs: 'Verde profundo y notas nocturnas.',
    descriptionEn: 'Deep green with night-note depth.',
    accentColor: '#70a477' as HexColor,
    preview: ['#263a31', '#09130f'],
  },
  {
    value: 'midnight',
    labelEs: 'Medianoche',
    labelEn: 'Midnight',
    descriptionEs: 'Azules tinta para concentrarte.',
    descriptionEn: 'Ink blues for focus.',
    accentColor: '#6ea8fe' as HexColor,
    preview: ['#1d2b4a', '#07111f'],
  },
  {
    value: 'ember',
    labelEs: 'Brasa',
    labelEn: 'Ember',
    descriptionEs: 'Calido, intenso y editorial.',
    descriptionEn: 'Warm, intense and editorial.',
    accentColor: '#e07a5f' as HexColor,
    preview: ['#4a261f', '#150b08'],
  },
  {
    value: 'plum',
    labelEs: 'Ciruela',
    labelEn: 'Plum',
    descriptionEs: 'Oscuro suave con energia creativa.',
    descriptionEn: 'Soft dark with creative energy.',
    accentColor: '#b583d8' as HexColor,
    preview: ['#3a254a', '#110916'],
  },
  {
    value: 'sand',
    labelEs: 'Arena',
    labelEn: 'Sand',
    descriptionEs: 'Neutro oscuro con brillo suave.',
    descriptionEn: 'Dark neutral with creamy glow.',
    accentColor: '#d4a373' as HexColor,
    preview: ['#3f3427', '#15110c'],
  },
  {
    value: 'light',
    labelEs: 'Luz',
    labelEn: 'Light',
    descriptionEs: 'Claro, limpio y suave para escribir sin distracciones.',
    descriptionEn: 'Bright, clean and soft for distraction-free writing.',
    accentColor: '#7895b2' as HexColor,
    preview: ['#f8fafc', '#e9eef4'],
  },
  {
    value: 'blush',
    labelEs: 'Rosa nube',
    labelEn: 'Blush',
    descriptionEs: 'Rosa delicado con una sensación cálida y tranquila.',
    descriptionEn: 'Delicate pink with a warm and peaceful feel.',
    accentColor: '#c9879d' as HexColor,
    preview: ['#fff8fa', '#f5e5ea'],
  },
  {
    value: 'sage',
    labelEs: 'Salvia',
    labelEn: 'Sage',
    descriptionEs: 'Verde natural y relajante con tonos claros.',
    descriptionEn: 'Relaxing natural green with soft, bright tones.',
    accentColor: '#829b83' as HexColor,
    preview: ['#f6faf5', '#e3ebe1'],
  },
] as const satisfies ReadonlyArray<{
  value: ThemeId
  labelEs: string
  labelEn: string
  descriptionEs: string
  descriptionEn: string
  accentColor: HexColor
  preview: readonly [string, string]
}>

export const fontOptions = [
  { value: 'system', labelEs: 'Sistema', labelEn: 'System' },
  { value: 'serif', labelEs: 'Editorial', labelEn: 'Editorial' },
  { value: 'rounded', labelEs: 'Redondeada', labelEn: 'Rounded' },
  { value: 'mono', labelEs: 'Monoespaciada', labelEn: 'Monospace' },
] as const satisfies ReadonlyArray<{ value: FontFamily; labelEs: string; labelEn: string }>

export function createUserPreferences(input: {
  displayName: string
  accentColor: string
  themeId?: ThemeId
  fontFamily: FontFamily
  locale: Locale
  soundEnabled?: boolean
  soundVolume?: number
}): UserPreferences {
  const timestamp = nowIso()

  return {
    displayName: ensureNonEmptyText(input.displayName, 'El nombre', 40),
    accentColor: createHexColor(input.accentColor),
    themeId: input.themeId ?? 'forest',
    fontFamily: input.fontFamily,
    locale: input.locale,
    soundEnabled: input.soundEnabled ?? true,
    soundVolume: normalizeSoundVolume(input.soundVolume),
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
    themeId: patch.themeId ?? preferences.themeId,
    fontFamily: patch.fontFamily ?? preferences.fontFamily,
    locale: patch.locale ?? preferences.locale,
    soundEnabled: patch.soundEnabled ?? preferences.soundEnabled,
    soundVolume: normalizeSoundVolume(patch.soundVolume === undefined ? preferences.soundVolume : patch.soundVolume),
    updatedAt: nowIso(),
  }
}
