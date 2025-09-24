import { customAlphabet, customRandom } from 'nanoid'
import { match } from 'ts-pattern'

type NextRandom = () => number

/**
 * @see https://github.com/steveruizok/gnrng/blob/main/src/index.ts
 */
export function gnrng(seed: string): NextRandom {
  let x = 0
  let y = 0
  let z = 0
  let w = 0

  function next() {
    const t = x ^ (x << 11)
    x = y
    y = z
    z = w
    w ^= ((w >>> 19) ^ t ^ (t >>> 8)) >>> 0

    return w / 0x100000000
  }

  for (let k = 0; k < seed.length + 64; k++) {
    x ^= seed.charCodeAt(k) | 0
    next()
  }

  return next
}

/**
 * @see https://www.unkey.com/blog/uuid-ux
 */
const DEFAULT_SIZE = 7
const AVAILABLE_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

type IdType = 'feature' | 'default'

/**
 * プレフィックスのパターンを定義
 */
const getPrefix = (type: IdType) =>
  match(type)
    .with('feature', () => 'f_')
    .with('default', () => 'd_')
    .exhaustive()

/**
 * @see https://github.com/ai/nanoid?tab=readme-ov-file#custom-alphabet-or-size
 */
export const createId = (
  size: number = DEFAULT_SIZE,
  type: IdType = 'default',
) => {
  const prefix = getPrefix(type)

  return `${prefix}${customAlphabet(AVAILABLE_ALPHABET, size)()}`
}

/**
 * @see https://github.com/ai/nanoid?tab=readme-ov-file#custom-random-bytes-generator
 */
export const createIdBySeed = (
  seed: string,
  size: number = DEFAULT_SIZE,
  type: IdType = 'default',
) => {
  const rng = gnrng(seed)
  const nanoid = customRandom(AVAILABLE_ALPHABET, size, (size) => {
    return new Uint8Array(size).map(() => 256 * rng())
  })

  const prefix = getPrefix(type)

  return `${prefix}${nanoid()}`
}
