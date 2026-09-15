import { UseFormReturn } from "react-hook-form";

export type ValidGroup = "security" | "email" | "general" | "storage";

export interface SettingsFormProps {
  groupedConfigs: Record<string, Config[]>;
  groupForms: Record<ValidGroup, UseFormReturn<any>>;
  onGroupSubmit: (group: ValidGroup, data: any) => Promise<void>;
}

export interface SettingsGroupProps {
  group: string;
  configs: Config[];
  form: UseFormReturn<{
    configs: Record<string, string>;
  }>;
  onSubmit: (data: any) => Promise<void>;
}

export interface ConfigInputProps {
  config: Config;
  register: UseFormReturn<any>["register"];
  setValue: UseFormReturn<any>["setValue"];
  error?: any;
  smtpEnabled?: string;
}

export type GroupFormData = {
  configs: Record<string, string | number>;
};

export type ConfigType = "text" | "number" | "boolean" | "bigint";

export type Config = {
  key: string;
  value: string;
  group: string;
  description?: string;
  type: ConfigType;
};
