/**
 * Converts a File or Blob to base64 string
 * @param file - File or Blob to convert
 * @returns Promise that resolves to base64 string
 */
export const toBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event: ProgressEvent<FileReader>) => {
      if (typeof event.target?.result === 'string') {
        resolve(event.target.result)
      } else {
        reject(new Error('Failed to convert file to base64'))
      }
    }

    reader.onerror = () => {
      reject(new Error('Error reading file'))
    }

    reader.readAsDataURL(file)
  })
}
