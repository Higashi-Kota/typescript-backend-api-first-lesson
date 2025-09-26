/**
 * Loads a file as an ArrayBuffer
 * @param file - File object to read
 * @returns Promise that resolves to ArrayBuffer
 */
export const loadFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event: ProgressEvent<FileReader>) => {
      if (event.target?.result instanceof ArrayBuffer) {
        resolve(event.target.result)
      } else {
        reject(new Error('Failed to read file as ArrayBuffer'))
      }
    }

    reader.onerror = () => {
      reject(new Error('Error reading file'))
    }

    reader.readAsArrayBuffer(file)
  })
}
