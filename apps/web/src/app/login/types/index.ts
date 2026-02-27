import { UseFormReturn } from "react-hook-form";

import { LoginFormData } from "../hooks/use-login";

export interface LoginFormProps {
  form: UseFormReturn<LoginFormData>;
  error: string | null;
  isVisible: boolean;
  onToggleVisibility: () => void;
  onSubmit: (data: LoginFormData) => Promise<void>;
}
