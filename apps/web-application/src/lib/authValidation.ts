import { z } from "zod";
import { isValidDesktopCallbackUrl } from "@/lib/desktopAuthRedirect";

export const authEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email address.")
    .max(254, "Email is too long.")
    .email("Please enter a valid email address.")
    .transform((value) => value.toLowerCase()),
});

export const authOtpSchema = z.object({
  code: z
    .string()
    .trim()
    .length(6, "Code must be 6 digits.")
    .regex(/^\d{6}$/, "Digits only."),
});

export const authSearchSchema = z.object({
  desktop_redirect_uri: z
    .string()
    .optional()
    .refine((value) => !value || isValidDesktopCallbackUrl(value), {
      message: "Invalid desktop redirect URI.",
    }),
  desktop_state: z.string().uuid("Invalid desktop auth state.").optional(),
  redirect: z.string().optional(),
});

export type AuthSearch = z.infer<typeof authSearchSchema>;

/** @deprecated Use authEmailSchema */
export const signInEmailSchema = authEmailSchema;

/** @deprecated Use authOtpSchema */
export const verificationCodeSchema = authOtpSchema;
