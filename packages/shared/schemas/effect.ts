import { z } from "zod"

export const Effect = z.object({
    type: z.string(),
    value: z.number().int().default(0),
})

export type Effect = z.infer<typeof Effect>