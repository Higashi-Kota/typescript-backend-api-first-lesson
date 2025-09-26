import { err, ok, type Result } from 'neverthrow'
import { z } from 'zod'

const MaxLengthSchema = (size: number) => z.string().max(size)

type MaxLength = z.infer<ReturnType<typeof MaxLengthSchema>>

export const validateMaxLength = (
  size: number,
  data: unknown,
): Result<MaxLength, z.ZodError> => {
  const parsed = MaxLengthSchema(size).safeParse(data)

  if (!parsed.success) {
    return err(parsed.error)
  }

  return ok(parsed.data as MaxLength)
}
