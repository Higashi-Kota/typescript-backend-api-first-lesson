/**
 * Converts a FileList or File array to a single File
 * Returns the first file if multiple files exist
 */
export const convertToSingleFile = (
  files: FileList | File[] | null | undefined
): File | null => {
  if (files == null) {
    return null
  }

  if (files instanceof FileList) {
    return files.length > 0 ? (files[0] ?? null) : null
  }

  if (Array.isArray(files)) {
    return files.length > 0 ? (files[0] ?? null) : null
  }

  return null
}
