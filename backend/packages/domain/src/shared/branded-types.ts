/**
 * Branded types for domain entities
 */

import type { Brand } from './brand.js'
import { createBrandSafe } from './brand.js'
import { isErr } from './result.js'

// Attachment ID
export type AttachmentId = Brand<string, 'AttachmentId'>
export const AttachmentId = {
  create: (value: string): AttachmentId => {
    const result = createBrandSafe(value, 'AttachmentId')
    if (isErr(result)) {
      throw new Error(result.error.message)
    }
    return result.value
  },
}

// Share Link ID
export type ShareLinkId = Brand<string, 'ShareLinkId'>
export const ShareLinkId = {
  create: (value: string): ShareLinkId => {
    const result = createBrandSafe(value, 'ShareLinkId')
    if (isErr(result)) {
      throw new Error(result.error.message)
    }
    return result.value
  },
}

// Share Token
export type ShareToken = Brand<string, 'ShareToken'>
export const ShareToken = {
  create: (value: string): ShareToken => {
    const result = createBrandSafe(value, 'ShareToken')
    if (isErr(result)) {
      throw new Error(result.error.message)
    }
    return result.value
  },
}
