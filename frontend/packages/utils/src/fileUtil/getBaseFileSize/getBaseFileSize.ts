/**
 * Gets the base file size in bytes from various input formats
 * @param size - Size in various formats (string with units, number, etc.)
 * @returns Size in bytes
 */
export const getBaseFileSize = (size: string | number): number => {
  if (typeof size === 'number') {
    return size
  }

  const units: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
  }

  // Remove spaces and convert to uppercase
  const normalizedSize = size.toString().replace(/\s/g, '').toUpperCase()

  // Extract number and unit
  const match = normalizedSize.match(/^(\d+(?:\.\d+)?)(B|KB|MB|GB|TB)?$/)

  if (match === null) {
    return 0
  }

  const [, value, unit = 'B'] = match
  const numericValue = Number.parseFloat(value || '0')

  return Math.floor(numericValue * (units[unit] || 1))
}
