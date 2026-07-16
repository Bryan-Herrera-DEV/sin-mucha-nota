export type EntityId = string & { readonly __brand: 'EntityId' }
export type ISODate = string & { readonly __brand: 'ISODate' }
export type HexColor = string & { readonly __brand: 'HexColor' }

export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomainError'
  }
}

export function createEntityId(scope: string): EntityId {
  const normalizedScope = scope.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'entity'
  const randomPart = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

  return `${normalizedScope}_${randomPart}` as EntityId
}

export function nowIso(): ISODate {
  return new Date().toISOString() as ISODate
}

export function ensureNonEmptyText(value: string, fieldName: string, maxLength = 90): string {
  const normalized = value.trim().replace(/\s+/g, ' ')

  if (!normalized) {
    throw new DomainError(`${fieldName} no puede estar vacio`)
  }

  return normalized.slice(0, maxLength)
}

export function createHexColor(value: string): HexColor {
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new DomainError('El color debe estar en formato hexadecimal')
  }

  return value.toLowerCase() as HexColor
}
