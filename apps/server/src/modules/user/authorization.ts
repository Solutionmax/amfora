import type { UpdateUserInput } from "./dto";

export interface AuthenticatedUser {
  userId?: string;
  isAdmin?: boolean;
}

/**
 * Admins can manage any user. Members can update only their own profile and
 * cannot submit the privilege field or the storage limit, even when trying to set it to false.
 */
export function canUpdateUser(
  authenticatedUser: AuthenticatedUser,
  target: Pick<UpdateUserInput, "id" | "isAdmin" | "storageLimitBytes">
): boolean {
  if (authenticatedUser.isAdmin === true) return true;

  return (
    !!authenticatedUser.userId &&
    authenticatedUser.userId === target.id &&
    target.isAdmin === undefined &&
    target.storageLimitBytes === undefined
  );
}
