import * as React from "react";

type ButtonProps = React.ComponentProps<"button">;

export function Button({ children, className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={[
        "rounded-lg bg-blue-600 px-5 py-2 text-white",
        "hover:bg-blue-700 disabled:opacity-50",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}
