/**
 * Converts various file inputs to a File array
 * @param input - File, FileList, File array, or null/undefined
 * @returns Array of File objects
 */
export const toFiles = (
  input: File | FileList | File[] | null | undefined
): File[] => {
  if (!input) return []

  if (input instanceof File) {
    return [input]
  }

  if (input instanceof FileList) {
    return Array.from(input)
  }

  if (Array.isArray(input)) {
    return input.filter((file): file is File => file instanceof File)
  }

  return []
}
