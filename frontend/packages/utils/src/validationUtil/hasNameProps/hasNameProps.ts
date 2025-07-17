import { z } from 'zod'

const HasNamePropsSchema = z
  .object({
    name: z.string(),
  })
  .passthrough()

type HasNameProps = z.infer<typeof HasNamePropsSchema>

export const hasNameProps = (data: unknown): data is HasNameProps => {
  const parsed = HasNamePropsSchema.safeParse(data)

  return parsed.success
}
