import type { JSX } from "react";
import { Button } from "@/components/ui/button.tsx";
import { task } from "@/lib/task.ts";

export function AccountPage(): JSX.Element {
  return (
    <Button
      variant="outline"
      onClick={async () => {
        console.log(task.add("testsssssssssssssssssssssssssssssssssssss"));
      }}
    >
      123
    </Button>
  );
}
