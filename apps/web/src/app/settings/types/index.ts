import { UseFormReturn } from "react-hook-form";

export type ValidGroup = "security" | "email" | "general" | "storage";

export type GroupFormData = {
  configs: Record<string, string | number>;
};

export interface SettingsFormProps {
  groupedConfigs: Record<string, Config[]>;
  groupForms: Record<ValidGroup, UseFormReturn<GroupFormData>>;
  onGroupSubmit: (group: ValidGroup, data: GroupFormData) => Promise<void>;
}

export interface SettingsGroupProps {
  group: string;
  configs: Config[];
  form: UseFormReturn<GroupFormData>;
  onSubmit: (data: GroupFormData) => Promise<void>;
}

export type ConfigType = "text" | "number" | "boolean" | "bigint";

export type Config = {
  key: string;
  value: string;
  group: string;
  description?: string;
  type: ConfigType;
};
