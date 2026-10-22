import type { JSX } from "react";
import { Button } from "@/components/ui/button.tsx";
import { api } from "@/lib/controller.ts";

export function AccountPage(): JSX.Element {
  return (
    <Button
      variant="outline"
      onClick={async () => {
        console.log(
          await api.instance.scan({ library: "C:\\Users\\heliu\\AppData\\Local\\aurora.craft" }),
        );
      }}
    >
      123
    </Button>
  );
}
