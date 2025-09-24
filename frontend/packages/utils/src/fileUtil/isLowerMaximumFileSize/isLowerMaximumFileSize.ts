/**
 * Checks if a file size is lower than or equal to the maximum allowed size
 * @param file - File object to check
 * @param maxSize - Maximum allowed size in bytes
 * @returns true if file size is within limit, false otherwise
 */
export const isLowerMaximumFileSize = (
  file: File | null | undefined,
  maxSize: number,
): boolean => {
  if (file == null) {
    return true // No file is considered valid
  }

  return file.size <= maxSize
}
