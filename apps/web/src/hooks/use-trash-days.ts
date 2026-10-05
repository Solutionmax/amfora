import { useSecureConfigValue } from "@/hooks/use-secure-configs";

const DEFAULT_TRASH_DAYS = 30;

/** How many days a deleted item stays in the trash, for the texts that promise it. */
export function useTrashDays(): number {
  const { value } = useSecureConfigValue("trashRetentionDays");
  const days = Number(value);
  return Number.isInteger(days) && days >= 1 ? days : DEFAULT_TRASH_DAYS;
}
