import { IconLoader } from "@tabler/icons-react";
import { cn } from "cn";
import type * as React from "react";

function Spinner({ className, ...props }: React.ComponentProps<"svg">): React.JSX.Element {
  return (
    <IconLoader
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
