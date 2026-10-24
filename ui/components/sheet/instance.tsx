import { IconBooks, IconBox, IconCheck, IconLayoutGrid, IconSearch } from "@tabler/icons-react";
import { motion } from "motion/react";
import { type InputEvent, type JSX, type KeyboardEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useSnapshot } from "valtio/react";
import { VirtualList } from "@/components/aurora/virtual-list";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Sheet, SheetClose, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { settingsConfig } from "@/config/settings.ts";
import { launch } from "@/lib/launch.ts";
import { defaultLibrary } from "@/lib/utils.ts";
import { instanceStore } from "@/store/instance";

function InstanceSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (Open: boolean) => void;
}): JSX.Element {
  const navigate = useNavigate();

  const instance = useSnapshot(instanceStore);
  const settings = useSnapshot(settingsConfig);

  const [search, setSearch] = useState("");
  const [library, setLibrary] = useState(defaultLibrary);

  const filteredInstances =
    instance.list.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.version.toLowerCase().includes(search.toLowerCase());

      return matchesSearch && item.library === library;
    }) || [];

  useEffect(() => {
    void instanceStore.refresh();
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader className="p-2 py-3 pb-0 pl-3">
          <b>实例列表</b>
        </SheetHeader>

        <SheetClose className="absolute top-2 right-10">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate("/instance")}>
            <IconLayoutGrid />
          </Button>
        </SheetClose>

        <div className="px-2 flex flex-col gap-2">
          <InputGroup className="bg-background dark:bg-input/30">
            <InputGroupInput
              placeholder="搜索"
              onInput={(e: InputEvent<HTMLInputElement>) => setSearch(e.currentTarget.value)}
              className="text-sm cursor-text"
            />
            <InputGroupAddon>
              <IconSearch className="cursor-text" />
            </InputGroupAddon>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="mr-0.5 text-muted-foreground [&[aria-expanded=true]>svg]:text-foreground duration-200"
                    onClick={() => {}}
                  >
                    <IconBooks />
                  </Button>
                }
              >
                Open
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-73.25">
                <DropdownMenuGroup>
                  {settings.library.map((item) => {
                    return (
                      <DropdownMenuItem
                        key={item}
                        onClick={() => {
                          setLibrary(item);
                        }}
                      >
                        {item === defaultLibrary ? "默认" : item}
                        {item === library && <IconCheck className="ml-auto size-4 shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </InputGroup>

          <VirtualList
            className="flex-1 min-h-0"
            data={filteredInstances}
            itemHeight={56}
            renderItem={(item: (typeof instanceStore.list)[number], index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 350,
                  damping: 25,
                  delay: index * 0.05,
                }}
                className="h-12"
              >
                {/** biome-ignore lint/a11y/noStaticElementInteractions: 列表项点击触发启动，已配套 onKeyDown 处理键盘交互 */}
                <div
                  key={index}
                  onClick={() => {
                    onOpenChange(false);
                    void launch({ ...item });
                  }}
                  className="w-full h-full px-2.5 flex items-center rounded-lg text-left hover:bg-accent dark:hover:bg-muted/50 transition-colors group"
                  onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                    if (event.target !== event.currentTarget) {
                      return;
                    }

                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                    }
                  }}
                >
                  <div className="flex items-center gap-3.5">
                    <IconBox className="size-8" />

                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.version}{" "}
                        {item.loader.type !== "none" &&
                          `| ${item.loader.type}.${item.loader.version}`}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { InstanceSheet };
