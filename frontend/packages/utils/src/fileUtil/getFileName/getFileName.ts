/**
 * Extracts the file name from a file path or File object
 * @param file - File object or file path string
 * @returns File name without path
 */
export const getFileName = (file: File | string): string => {
  if (file instanceof File) {
    return file.name
  }

  if (typeof file === 'string') {
    // Handle both forward and backward slashes
    const parts = file.split(/[/\\]/)
    return parts[parts.length - 1] ?? ''
  }

  return ''
}
