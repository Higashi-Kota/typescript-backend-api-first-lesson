import { lookup } from 'mrmime'

export const getMimeType = (filename: string): string | null => {
  return lookup(filename) || null
}

export const isImageFile = (filename: string): boolean => {
  const mimeType = getMimeType(filename)
  return mimeType ? mimeType.startsWith('image/') : false
}

export const isVideoFile = (filename: string): boolean => {
  const mimeType = getMimeType(filename)
  return mimeType ? mimeType.startsWith('video/') : false
}

export const isAudioFile = (filename: string): boolean => {
  const mimeType = getMimeType(filename)
  return mimeType ? mimeType.startsWith('audio/') : false
}
