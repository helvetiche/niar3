import { z } from 'zod'
import { emailSchema, passwordSchema, weakPasswordSchema } from './common'

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const signInSchema = z.object({
  email: emailSchema,
  password: weakPasswordSchema,
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  oobCode: z.string().min(1, 'Reset code is required'),
  newPassword: passwordSchema,
})

export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
