import { cn } from "@tsu-stack/ui/lib/utils";

export function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select"> & { className?: string }) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-lg border border-input/70 bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[1px] focus-visible:ring-border disabled:opacity-64 dark:bg-input/32",
        className
      )}
      {...props}
    />
  );
}
