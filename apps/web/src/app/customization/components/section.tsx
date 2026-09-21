import type { ComponentType, ReactNode } from "react";

/** One block of the customization page: icon tile, heading, optional right-hand slot. */
export function Section({
  icon: Icon,
  title,
  aside,
  children,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 px-6 py-[22px] [&+&]:border-t [&+&]:border-line">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2.5 font-display text-sm font-semibold">
          <span className="tile size-[30px] rounded-lg">
            <Icon className="size-[15px]" strokeWidth={1.75} />
          </span>
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}
