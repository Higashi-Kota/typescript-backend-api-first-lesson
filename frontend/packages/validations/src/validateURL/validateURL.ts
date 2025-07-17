import { type Result, err, ok } from 'neverthrow'
import { z } from 'zod'

const URLSchema = z.string().url()

type URL = z.infer<typeof URLSchema>

export const validateURL = (data: unknown): Result<URL, z.ZodError> => {
  const parsed = URLSchema.safeParse(data)

  if (!parsed.success) {
    return err(parsed.error)
  }

  return ok(parsed.data as URL)
}
