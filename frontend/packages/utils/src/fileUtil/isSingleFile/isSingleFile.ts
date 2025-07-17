/**
 * Checks if the input contains exactly one file
 * @param files - File, FileList, or array of files
 * @returns true if exactly one file exists, false otherwise
 */
export const isSingleFile = (
  files: File | FileList | File[] | null | undefined
): boolean => {
  if (!files) return false

  if (files instanceof File) {
    return true
  }

  if (files instanceof FileList) {
    return files.length === 1
  }

  if (Array.isArray(files)) {
    return files.length === 1
  }

  return false
}
