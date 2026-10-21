import { IconMinus, IconX } from "@tabler/icons-react";
import type { JSX } from "react";
import { TaskSheetTrigger } from "@/components/sheet/task.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { api } from "@/lib/controller.ts";
import { dragStyle, noDragStyle } from "@/lib/drag.ts";
import { isBeta } from "@/lib/utils.ts";

function AppTitle(): JSX.Element {
  return (
    <div className="relative flex items-center p-1.5" style={dragStyle}>
      <div className="relative z-10 flex items-center gap-2">
        <b className="ml-1.5">Aurora Craft</b>
        {import.meta.env.DEV ? (
          <Badge className="bg-orange-400 dark:bg-orange-500 h-4.5 pb-px">
            <b>DEV</b>
          </Badge>
        ) : isBeta ? (
          <Badge className="bg-blue-400 dark:bg-blue-500 h-4.5 pb-px">
            <b>BETA</b>
          </Badge>
        ) : undefined}
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <TaskSheetTrigger />

        <Button
          size="icon-sm"
          variant="ghost"
          style={noDragStyle}
          className="hover:bg-background dark:hover:bg-muted/50"
          onClick={() => api.window.min(null)}
        >
          <IconMinus />
        </Button>

        <Button
          size="icon-sm"
          variant="ghost"
          className="hover:bg-red-600! hover:text-white!"
          style={noDragStyle}
          onClick={() => api.window.close(null)}
        >
          <IconX />
        </Button>
      </div>
    </div>
  );
}

export default AppTitle;
