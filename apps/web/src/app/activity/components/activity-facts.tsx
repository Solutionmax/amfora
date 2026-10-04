"use client";

import { useTranslations } from "next-intl";

import { Fact, Facts } from "@/components/ui/facts";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityList, WeekCount } from "@/http/endpoints/activity";
import { cn } from "@/lib/utils";
import { weekChange } from "../lib/activity-events";

type Summary = ActivityList["summary"];

/** More of these is good news; more failed sign ins is not, so that one never turns green. */
const FACTS: ReadonlyArray<{ key: keyof Summary; isMoreGood: boolean }> = [
  { key: "downloads", isMoreGood: true },
  { key: "opened", isMoreGood: true },
  { key: "filesReceived", isMoreGood: true },
  { key: "failedSignIns", isMoreGood: false },
];

function WeekValue({ week, isMoreGood }: { week: WeekCount; isMoreGood: boolean }) {
  const t = useTranslations("activity.facts");
  const change = weekChange(week);

  return (
    <>
      {week.thisWeek}
      <small
        title={t("versusLastWeek")}
        className={cn(
          "ml-1.5 font-sans text-[12.5px] font-medium tracking-normal",
          change.direction === "up" && isMoreGood ? "text-ok" : "text-ink-3"
        )}
      >
        {change.direction === "same" ? t("same") : change.text}
      </small>
    </>
  );
}

/** Four numbers for this week, each with the difference to the week before. */
export function ActivityFacts({ summary }: { summary: Summary | null }) {
  const t = useTranslations("activity.facts");

  return (
    <Facts>
      {FACTS.map(({ key, isMoreGood }) => (
        <Fact
          key={key}
          label={t(key)}
          value={
            summary ? (
              <WeekValue week={summary[key]} isMoreGood={isMoreGood} />
            ) : (
              <Skeleton className="my-1 h-6 w-12" aria-hidden />
            )
          }
        />
      ))}
    </Facts>
  );
}
