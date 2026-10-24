import { IconMenu, IconMinus, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import type { JSX } from "react";
import { useSnapshot } from "valtio/react";
import { TaskSheetTrigger } from "@/components/sheet/task.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { api } from "@/lib/controller.ts";
import { dragStyle, noDragStyle } from "@/lib/drag.ts";
import { task } from "@/lib/task.ts";
import { isBeta } from "@/lib/utils.ts";

function AppTitle(): JSX.Element {
  const _task = useSnapshot(task);

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
        <AnimatePresence>
          {task.list.length !== 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 24,
                mass: 0.7,
              }}
              style={{ transformOrigin: "center" }}
            >
              <TaskSheetTrigger />
            </motion.div>
          )}
        </AnimatePresence>

        <DropdownMenu>
          <DropdownMenuContent align="center">
            <DropdownMenuItem>
              <IconMenu />
              123
            </DropdownMenuItem>
          </DropdownMenuContent>

          <DropdownMenuTrigger>
            <Button
              size="icon-sm"
              variant="ghost"
              style={noDragStyle}
              className="hover:bg-background dark:hover:bg-muted/50"
            >
              <IconMenu />
            </Button>
          </DropdownMenuTrigger>
        </DropdownMenu>

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
