import { IconCheck, IconCircleCheck, IconCopy, IconTrash, IconX } from "@tabler/icons-react";
import type { JSX } from "react";
import { useSnapshot } from "valtio/react";
import { Button } from "@/components/ui/button";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { CircularProgress, Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { noDragStyle } from "@/lib/drag.ts";
import { task } from "@/lib/task";
import { cn } from "@/lib/utils";

function TaskSheet(): JSX.Element {
  const snap = useSnapshot(task);

  return (
    <Sheet open={snap.sheet.open} onOpenChange={(value: boolean) => (task.sheet.open = value)}>
      <SheetContent>
        <SheetHeader className="p-2 py-3 pb-0 pl-3">
          <b>任务中心</b>
        </SheetHeader>

        {snap.list.some((t) => t.status === "done") && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-2 right-10"
            onClick={() => {
              task.clean();
              task.sheet.open = false;
            }}
          >
            <IconTrash />
          </Button>
        )}

        <div className="px-2 h-full flex pb-14">
          {snap.list.length !== 0 && (
            <ScrollArea className="h-full flex-1">
              <div className="flex flex-col gap-2">
                {snap.list.map((taskItem) => (
                  <Item variant="outline" className="relative" key={taskItem.id}>
                    <ItemContent>
                      <ItemTitle className="w-full">
                        <span className="truncate max-w-42">{taskItem.title}</span>
                        {taskItem.status === "running" && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {taskItem.expand}
                          </span>
                        )}
                      </ItemTitle>
                      <ItemDescription className="text-xs line-clamp-1 max-w-60 h-full">
                        {taskItem.detail ? taskItem.detail : "暂无更多信息"}
                      </ItemDescription>
                    </ItemContent>

                    <Progress
                      value={taskItem.progress}
                      className="w-full"
                      indicatorClassName={cn(
                        taskItem.status === "done" && "bg-green-400 dark:bg-green-500",
                        taskItem.status === "error" && "bg-red-400 dark:bg-red-500",
                      )}
                    />

                    {taskItem.status === "error" && (
                      <Button variant="ghost" size="icon-sm" className="absolute top-1.5 right-8.5">
                        <IconCopy />
                      </Button>
                    )}

                    {taskItem.status !== "running" && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="absolute top-1.5 right-1.5"
                        onClick={() => task.remove(taskItem.id)}
                      >
                        <IconX />
                      </Button>
                    )}
                  </Item>
                ))}
              </div>
            </ScrollArea>
          )}

          {snap.list.length === 0 && (
            <div className="flex flex-col gap-2 items-center justify-center h-full flex-1">
              <IconCheck className="size-12" />
              <span>没有什么可做的</span>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TaskSheetTrigger(): JSX.Element {
  const snap = useSnapshot(task);

  return (
    ((snap.list.length === 0 || snap.overview.running === 0) && (
      <Button
        size="icon-sm"
        variant="ghost"
        style={noDragStyle}
        onClick={() => (task.sheet.open = true)}
      >
        <IconCircleCheck />
      </Button>
    )) || (
      <Button
        size="icon-sm"
        variant="ghost"
        style={noDragStyle}
        onClick={() => (task.sheet.open = true)}
      >
        <CircularProgress value={snap.overview.progress} size={16} strokeWidth={2}>
          <span className="text-[10px]">{snap.overview.running}</span>
        </CircularProgress>
      </Button>
    )
  );
}

export { TaskSheet, TaskSheetTrigger };
