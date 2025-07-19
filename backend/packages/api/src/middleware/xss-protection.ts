/**
 * XSS Protection Middleware
 * XSS攻撃対策のためのミドルウェア
 */

import DOMPurify from 'dompurify'
import type { NextFunction, Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import { JSDOM } from 'jsdom'
import type { ParsedQs } from 'qs'
import xss from 'xss'

// DOMPurifyの初期化（サーバーサイド用）
const window = new JSDOM('').window
// @ts-ignore - DOMPurifyはサーバーサイドでJSDOM windowを受け取れる
const purify = DOMPurify(window)

/**
 * XSSサニタイゼーション設定
 */
const xssOptions = {
  whiteList: {
    // 許可するHTMLタグと属性
    a: ['href', 'title'],
    b: [],
    br: [],
    div: ['class'],
    em: [],
    i: [],
    li: [],
    ol: [],
    p: ['class'],
    span: ['class'],
    strong: [],
    u: [],
    ul: [],
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script'],
}

/**
 * 文字列のサニタイゼーション
 */
export function sanitizeString(input: string): string {
  // 基本的なXSS対策
  let sanitized = xss(input, xssOptions)

  // DOMPurifyによる追加のサニタイゼーション
  sanitized = purify.sanitize(sanitized, {
    ALLOWED_TAGS: [
      'a',
      'b',
      'br',
      'div',
      'em',
      'i',
      'li',
      'ol',
      'p',
      'span',
      'strong',
      'u',
      'ul',
    ],
    ALLOWED_ATTR: ['href', 'title', 'class'],
    ALLOW_DATA_ATTR: false,
  })

  return sanitized
}

/**
 * オブジェクトの再帰的サニタイゼーション
 */
export function sanitizeObject(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return sanitizeString(obj)
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const key in obj as Record<string, unknown>) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // キー名もサニタイゼーション
        const sanitizedKey = sanitizeString(key)
        sanitized[sanitizedKey] = sanitizeObject(
          (obj as Record<string, unknown>)[key]
        )
      }
    }
    return sanitized
  }

  return obj
}

/**
 * XSS保護ミドルウェア
 * リクエストボディ、クエリパラメータ、URLパラメータをサニタイゼーション
 */
export function xssProtection(req: Request, res: Response, next: NextFunction) {
  // リクエストボディのサニタイゼーション
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body)
  }

  // クエリパラメータのサニタイゼーション
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query) as ParsedQs
  }

  // URLパラメータのサニタイゼーション
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params) as ParamsDictionary
  }

  // レスポンスヘッダーの設定
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('X-Content-Type-Options', 'nosniff')

  next()
}

/**
 * 特定のフィールドをサニタイゼーションから除外するミドルウェア
 * パスワードなど、サニタイゼーションすべきでないフィールド用
 */
export function xssProtectionWithExclusions(excludeFields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // 除外フィールドを一時的に保存
    const excluded: Record<string, unknown> = {}

    if (req.body && typeof req.body === 'object') {
      for (const field of excludeFields) {
        if (field in req.body) {
          excluded[field] = req.body[field]
          delete req.body[field]
        }
      }

      // サニタイゼーション実行
      req.body = sanitizeObject(req.body)

      // 除外フィールドを復元
      Object.assign(req.body, excluded)
    }

    // クエリとパラメータは通常通りサニタイゼーション
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query) as ParsedQs
    }

    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params) as ParamsDictionary
    }

    // レスポンスヘッダーの設定
    res.setHeader('X-XSS-Protection', '1; mode=block')
    res.setHeader('X-Content-Type-Options', 'nosniff')

    next()
  }
}
