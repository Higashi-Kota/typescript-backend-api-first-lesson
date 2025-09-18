/**
 * Shared utility functions
 */

/**
 * Generate a unique ID with a prefix
 * Using crypto.randomUUID() for now, can be replaced with nanoid later
 */
export const generateId = (prefix: string): string => {
  // Simple implementation using crypto API
  const uuid =
    typeof crypto !== 'undefined'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Take first 21 characters after removing hyphens
  const id = uuid.replace(/-/g, '').substring(0, 21)
  return `${prefix}_${id}`
}

/**
 * Check if a string is a valid ID format
 */
export const isValidId = (id: string, prefix: string): boolean => {
  const pattern = new RegExp(`^${prefix}_[0-9A-Za-z]{21}$`)
  return pattern.test(id)
}

/**
 * Extract the prefix from an ID
 */
export const getIdPrefix = (id: string): string => {
  const parts = id.split('_')
  return parts[0] ?? ''
}

/**
 * Format a date as ISO string
 */
export const toISOString = (date: Date | string): string => {
  if (typeof date === 'string') {
    return new Date(date).toISOString()
  }
  return date.toISOString()
}

/**
 * Parse a date safely
 */
export const parseDate = (
  date: string | Date | null | undefined
): Date | null => {
  if (!date) {
    return null
  }

  try {
    const parsed = typeof date === 'string' ? new Date(date) : date
    return Number.isNaN(parsed.getTime()) ? null : parsed
  } catch {
    return null
  }
}

/**
 * Format currency
 */
export const formatCurrency = (amount: number, currency = 'JPY'): string => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

/**
 * Truncate text with ellipsis
 */
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text
  }
  return `${text.slice(0, maxLength - 3)}...`
}

/**
 * Slugify text for URLs
 */
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
