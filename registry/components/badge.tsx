import * as React from "react";

type BadgeProps = React.ComponentProps<"span">;

export function Badge({ children, className, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={[
        "inline-flex rounded-full bg-green-100",
        "px-3 py-1 text-sm text-green-700",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
