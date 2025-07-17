import { type Result, err, ok } from 'neverthrow'
import { z } from 'zod'

const EmailSchema = z.string().email()

type Email = z.infer<typeof EmailSchema>

export const validateEmail = (data: unknown): Result<Email, z.ZodError> => {
  const parsed = EmailSchema.safeParse(data)

  if (!parsed.success) {
    return err(parsed.error)
  }

  return ok(parsed.data as Email)
}
