"use client";

import { useEffect, useRef, useState } from "react";
import { IconCheck } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getUpdateProgress } from "@/http/endpoints/update";
import {
  classifyResponse,
  formatElapsed,
  initialView,
  nextView,
  POLL_MS,
  stepState,
  UPDATE_STEPS,
  type Poll,
  type StepState,
  type UpdateView,
} from "@/lib/update-progress";
import { cn } from "@/lib/utils";

interface UpdateProgressDialogProps {
  open: boolean;
  /** The version being installed, when the caller knows it; otherwise the server says. */
  targetVersion: string | null;
  /** Called when the dialog is closed after a failure; success reloads the page instead. */
  onClose: () => void;
}

const ELAPSED_TICK_MS = 1000;

const STEP_TEXT: Record<StepState, string> = {
  pending: "text-ink-3",
  now: "font-medium text-ink",
  done: "text-ink-2",
  bad: "font-medium text-bad",
};

function StepMark({ state }: { state: StepState }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-4 shrink-0 place-items-center rounded-full border-[1.5px] text-white",
        state === "pending" && "border-line-2",
        state === "now" &&
          "animate-spin border-primary border-t-transparent motion-reduce:animate-none motion-reduce:border-t-primary",
        state === "done" && "border-ok bg-ok",
        state === "bad" && "border-bad bg-bad"
      )}
    >
      {state === "done" && <IconCheck className="size-2.5" stroke={3.5} />}
      {state === "bad" && <span className="font-mono text-[10px] leading-none font-bold">!</span>}
    </span>
  );
}

async function pollOnce(): Promise<Poll> {
  try {
    const response = await getUpdateProgress();
    return classifyResponse(response.status, response.data);
  } catch {
    // No answer at all: the container is being replaced.
    return { kind: "unreachable" };
  }
}

export function UpdateProgressDialog({ open, targetVersion, onClose }: UpdateProgressDialogProps) {
  const t = useTranslations();
  const [view, setView] = useState<UpdateView>(() => initialView(targetVersion));
  const [elapsed, setElapsed] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const running = view.outcome === "running";

  // Poll until the update ends one way or the other.
  useEffect(() => {
    if (!open) return;

    const startedAt = Date.now();
    let current = initialView(targetVersion);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    setView(current);
    setElapsed(0);

    const clock = setInterval(() => setElapsed(Date.now() - startedAt), ELAPSED_TICK_MS);

    const tick = async () => {
      const poll = await pollOnce();
      if (cancelled) return;

      current = nextView(current, poll, Date.now() - startedAt);
      setView(current);
      if (current.outcome === "running") {
        timer = setTimeout(tick, POLL_MS);
        return;
      }
      // The clock stops with the update.
      clearInterval(clock);
      setElapsed(Date.now() - startedAt);
    };

    tick();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearInterval(clock);
    };
  }, [open, targetVersion]);

  // The button takes focus once it can be used.
  useEffect(() => {
    if (running) return;
    buttonRef.current?.focus();
  }, [running]);

  const version = view.targetVersion;
  const endsWithReload = view.outcome === "done" || view.outcome === "signin";
  const failed = view.outcome === "failed" || view.outcome === "timeout";

  const statusLine = (): string => {
    switch (view.outcome) {
      case "done":
        return t("updates.progress.done", { version: version ?? "" });
      case "failed":
        return view.error
          ? t("updates.progress.failed", { error: view.error.replace(/[.\s]+$/, "") })
          : t("updates.progress.failedUnknown");
      case "signin":
        return view.sawRestart ? t("updates.progress.signinAfterRestart") : t("updates.progress.signin");
      case "timeout":
        return t("updates.progress.timeout");
      default:
        if (view.step === "handover") return t("updates.progress.handoverNote");
        if (view.step === "restarting") return t("updates.progress.restartingNote");
        return "";
    }
  };

  const onButton = () => {
    if (endsWithReload) {
      window.location.reload();
      return;
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // While the install runs there is nothing to go back to.
        if (!next && !running) onButton();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="gap-5 sm:max-w-md"
        onEscapeKeyDown={(event) => running && event.preventDefault()}
        onInteractOutside={(event) => running && event.preventDefault()}
      >
        <DialogHeader className="flex-row items-center gap-3 pr-0">
          <span aria-hidden className="relative flex size-2.5 shrink-0">
            {running && (
              <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-60 motion-reduce:hidden" />
            )}
            <span
              className={cn(
                "relative size-2.5 rounded-full",
                running && "bg-primary",
                view.outcome === "done" && "bg-ok",
                view.outcome === "signin" && "bg-ok",
                failed && "bg-bad"
              )}
            />
          </span>
          <DialogTitle className="flex-1 text-lg">
            {version ? t("updates.progress.title", { version }) : t("updates.progress.titleNoVersion")}
          </DialogTitle>
          <span className="font-mono text-xs text-ink-3 tabular-nums">{formatElapsed(elapsed)}</span>
        </DialogHeader>

        <ol className="grid gap-2 text-sm">
          {UPDATE_STEPS.map((step) => {
            const state = stepState(step, view);
            return (
              <li
                key={step}
                aria-current={state === "now" ? "step" : undefined}
                className={cn("flex items-center gap-2.5 transition-colors", STEP_TEXT[state])}
              >
                <StepMark state={state} />
                <span>{t(`updates.progress.steps.${step}`)}</span>
              </li>
            );
          })}
        </ol>

        <div className="grid gap-2">
          {running && (
            <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full w-1/3 animate-indeterminate rounded-full bg-primary motion-reduce:w-full motion-reduce:animate-none motion-reduce:bg-primary-soft" />
            </div>
          )}
          <DialogDescription
            aria-live="polite"
            className={cn("min-h-5 font-mono text-xs [overflow-wrap:anywhere]", failed ? "text-bad" : "text-ink-3")}
          >
            {statusLine()}
          </DialogDescription>
        </div>

        <div className="flex justify-end">
          <Button
            ref={buttonRef}
            variant={endsWithReload ? "default" : "outline"}
            disabled={running}
            onClick={onButton}
          >
            {endsWithReload ? t("updates.progress.reload") : t("common.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
