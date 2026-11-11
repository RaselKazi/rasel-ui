import * as React from "react";

type AlertProps = React.ComponentProps<"div">;

export function Alert({ children, className, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      {...props}
      className={[
        "rounded-lg border border-blue-200",
        "bg-blue-50 p-4 text-blue-900",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
