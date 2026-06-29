import { z } from "zod";

export const contactSchema = z.object({
  name: z
    .string({ error: "Please enter your name" })
    .trim()
    .min(1, "Please enter your name"),
  email: z
    .string({ error: "Please enter email" })
    .trim()
    .min(1, "Please enter email")
    .email("Please enter valid email"),
  company: z
    .string({ error: "Please enter your company's name" })
    .trim()
    .min(1, "Please enter your company's name"),
  message: z
    .string({ error: "Please enter your message" })
    .trim()
    .min(1, "Please enter your message"),
});

export type ContactInput = z.infer<typeof contactSchema>;
