import { err, ok, type Result } from 'neverthrow'
import { z } from 'zod'

const MinLengthSchema = (size: number) => z.string().min(size)

type MinLength = z.infer<ReturnType<typeof MinLengthSchema>>

export const validateMinLength = (
  size: number,
  data: unknown,
): Result<MinLength, z.ZodError> => {
  const parsed = MinLengthSchema(size).safeParse(data)

  if (!parsed.success) {
    return err(parsed.error)
  }

  return ok(parsed.data as MinLength)
}
