import { IconSearch } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { USER_FILTERS, type UserFilter } from "../lib/filter-users";

const FILTER_LABEL: Record<UserFilter, string> = {
  all: "users.calm.filters.all",
  active: "users.calm.filters.active",
  deactivated: "users.calm.filters.deactivated",
  admins: "users.calm.filters.admins",
};

/** Text tabs on the left, search on the right. */
export function UsersToolbar({
  filter,
  onFilter,
  search,
  onSearch,
}: {
  filter: UserFilter;
  onFilter: (filter: UserFilter) => void;
  search: string;
  onSearch: (value: string) => void;
}) {
  const t = useTranslations();

  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-3">
      <div
        role="group"
        aria-label={t("users.calm.filters.label")}
        className="flex min-w-0 gap-[18px] overflow-x-auto text-[13px]"
      >
        {USER_FILTERS.map((value) => {
          const active = value === filter;

          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => onFilter(value)}
              className={cn(
                "shrink-0 whitespace-nowrap border-b-2 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                active
                  ? "border-ink font-semibold text-ink"
                  : "border-transparent font-medium text-ink-3 hover:text-ink"
              )}
            >
              {t(FILTER_LABEL[value])}
            </button>
          );
        })}
      </div>
      <label className="relative w-full md:ml-auto md:w-[260px]">
        <span className="sr-only">{t("users.calm.searchLabel")}</span>
        <IconSearch
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-icon"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={t("users.calm.searchPlaceholder")}
          className="h-9 pl-9"
        />
      </label>
    </div>
  );
}
