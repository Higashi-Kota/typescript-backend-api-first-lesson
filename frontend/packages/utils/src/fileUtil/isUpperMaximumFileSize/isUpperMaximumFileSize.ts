/**
 * Checks if a file size is greater than the maximum allowed size
 * @param file - File object to check
 * @param maxSize - Maximum allowed size in bytes
 * @returns true if file size exceeds limit, false otherwise
 */
export const isUpperMaximumFileSize = (
  file: File | null | undefined,
  maxSize: number,
): boolean => {
  if (file == null) {
    return false // No file is considered valid
  }

  return file.size > maxSize
}
