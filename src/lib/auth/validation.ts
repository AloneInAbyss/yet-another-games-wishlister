import { z } from "zod";

export const authSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be at most 72 characters."),
});

export type AuthFormValues = z.infer<typeof authSchema>;

export type AuthActionState = {
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
  formError?: string;
  message?: string;
};

export const initialAuthActionState: AuthActionState = {};
