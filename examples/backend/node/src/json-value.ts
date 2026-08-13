import { Prisma } from '@prisma/client'

export function jsonValue(value: unknown): unknown {
  if (typeof value === 'bigint') return Number(value)
  if (value instanceof Prisma.Decimal) return value.toFixed(2)
  if (value instanceof Date) return value.toISOString()
  if (Buffer.isBuffer(value)) return value.toString('hex')
  if (Array.isArray(value)) return value.map(jsonValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, jsonValue(nested)]))
  }
  return value
}
