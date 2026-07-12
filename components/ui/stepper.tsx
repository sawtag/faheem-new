import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Numbered horizontal stepper (Figma kit 08). Done = filled accent + check,
 * active = filled accent + number, upcoming = hairline circle + navy number.
 * Flexbox is writing-mode aware, so the whole track flips under `dir="rtl"`;
 * connector fill (index < current) follows automatically.
 */
export function Stepper({
  steps,
  current,
  className,
}: {
  steps: { label: string }[];
  current: number;
  className?: string;
}) {
  return (
    <ol className={cn("flex w-full items-start", className)}>
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const isLast = i === steps.length - 1;
        return (
          <li
            key={step.label}
            className={cn("flex items-start", !isLast && "flex-1")}
          >
            <div className="flex flex-col items-center gap-2">
              <span
                className={cn(
                  "rounded-pill grid size-8 place-items-center text-sm font-bold transition-colors duration-[var(--duration)] ease-[var(--ease)]",
                  done || active
                    ? "bg-accent text-card"
                    : "border-border bg-card text-navy-700 border-2",
                )}
              >
                {done ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  <span className="financial">{i + 1}</span>
                )}
              </span>
              <span
                className={cn(
                  "text-center text-[0.8125rem] font-semibold",
                  done || active ? "text-navy" : "text-text-secondary",
                )}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <span
                className={cn(
                  "rounded-pill mt-4 h-0.5 flex-1 transition-colors duration-[var(--duration)] ease-[var(--ease)]",
                  done ? "bg-accent" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
