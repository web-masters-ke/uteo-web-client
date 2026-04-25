"use client";

import clsx from "clsx";

export default function StepIndicator({
  steps,
  currentStep,
}: {
  steps: string[];
  currentStep: number;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((label, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={clsx(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all",
                    done
                      ? "bg-primary-500 text-white"
                      : active
                      ? "border-2 border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
                      : "border-2 border-zinc-200 bg-white text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900",
                  )}
                >
                  {done ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={clsx(
                    "mt-1.5 text-[10px] font-medium text-center max-w-[80px]",
                    active ? "text-primary-600 dark:text-primary-400" : "text-zinc-400",
                  )}
                >
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={clsx(
                    "mx-2 h-0.5 flex-1",
                    i < currentStep ? "bg-primary-500" : "bg-zinc-200 dark:bg-zinc-700",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
