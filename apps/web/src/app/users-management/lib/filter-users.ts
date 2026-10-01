export type UserFilter = "all" | "active" | "deactivated" | "admins";

export const USER_FILTERS: readonly UserFilter[] = ["all", "active", "deactivated", "admins"];

interface FilterableUser {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  isActive: boolean;
  isAdmin: boolean;
}

function matchesFilter(user: FilterableUser, filter: UserFilter): boolean {
  switch (filter) {
    case "active":
      return user.isActive;
    case "deactivated":
      return !user.isActive;
    case "admins":
      return user.isAdmin;
    default:
      return true;
  }
}

function matchesQuery(user: FilterableUser, query: string): boolean {
  if (!query) return true;
  const fullName = `${user.firstName} ${user.lastName}`;

  return [fullName, user.username, user.email].some((value) => (value ?? "").toLowerCase().includes(query));
}

/** Users that pass both the text tab and the search box. Never mutates the input. */
export function filterUsers<T extends FilterableUser>(users: readonly T[], filter: UserFilter, search: string): T[] {
  const query = search.trim().toLowerCase();

  return users.filter((user) => matchesFilter(user, filter) && matchesQuery(user, query));
}

/** Counts for the page subline. */
export function userCounts(users: readonly FilterableUser[]) {
  return {
    total: users.length,
    active: users.filter((user) => user.isActive).length,
    admins: users.filter((user) => user.isAdmin).length,
  };
}
