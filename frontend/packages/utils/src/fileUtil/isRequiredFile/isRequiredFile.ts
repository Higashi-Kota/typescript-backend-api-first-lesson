/**
 * Checks if a required file is present and valid
 * @param file - File or FileList to check
 * @param isRequired - Whether the file is required
 * @returns true if file meets requirements, false otherwise
 */
export const isRequiredFile = (
  file: File | FileList | null | undefined,
  isRequired: boolean
): boolean => {
  if (!isRequired) {
    return true
  }

  if (file == null) {
    return false
  }

  if (file instanceof File) {
    return file.size > 0
  }

  if (file instanceof FileList) {
    return file.length > 0 && file[0] != null && file[0].size > 0
  }

  return false
}
