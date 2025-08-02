/**
 * Checks if a file has zero size
 * @param file - File object to check
 * @returns true if file has zero size, false otherwise
 */
export const isZeroSizeFile = (file: File | null | undefined): boolean => {
  if (file == null) {
    return false
  }

  return file.size === 0
}
