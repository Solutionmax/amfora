import { UseFormReturn } from "react-hook-form";

import { ForgotPasswordFormData } from "../hooks/use-forgot-password";

export interface ForgotPasswordFormProps {
  form: UseFormReturn<ForgotPasswordFormData>;
  onSubmit: (data: ForgotPasswordFormData) => Promise<void>;
}
