import { UseFormReturn } from "react-hook-form";

import { ResetPasswordFormData } from "../hooks/use-reset-password";

export interface ResetPasswordFormProps {
  form: UseFormReturn<ResetPasswordFormData>;
  isPasswordVisible: boolean;
  isConfirmPasswordVisible: boolean;
  onTogglePassword: () => void;
  onToggleConfirmPassword: () => void;
  onSubmit: (data: ResetPasswordFormData) => Promise<void>;
}
