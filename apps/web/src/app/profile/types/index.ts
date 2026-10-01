import { UseFormReturn } from "react-hook-form";

import { PasswordFormData, ProfileFormData } from "../hooks/use-profile";

export interface PasswordFormProps {
  form: UseFormReturn<PasswordFormData>;
  isNewPasswordVisible: boolean;
  isConfirmPasswordVisible: boolean;
  onToggleNewPassword: () => void;
  onToggleConfirmPassword: () => void;
  onSubmit: (data: PasswordFormData) => Promise<void>;
}

export interface ProfileFormProps {
  form: UseFormReturn<ProfileFormData>;
  onSubmit: (data: ProfileFormData) => Promise<void>;
}

export interface ProfileHeadProps {
  userData: {
    firstName?: string;
    lastName?: string;
    username?: string;
    image?: string | null;
    createdAt?: string;
  } | null;
  isAdmin: boolean;
  /** Live values from the account form, so the head follows what is typed. */
  firstName?: string;
  lastName?: string;
  onImageChange: (file: File) => Promise<void>;
  onImageRemove: () => Promise<void>;
}
