import { IconBook, IconCircleCheck, IconFlask, IconHistory } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { type JSX, type KeyboardEvent, type MouseEvent, useEffect, useRef, useState } from "react";
import { useNavScroll } from "@/components/app/navigation.tsx";
import { QueryState } from "@/components/aurora/query-state.tsx";
import { VirtualList } from "@/components/aurora/virtual-list.tsx";
import { GameCommand } from "@/components/command/download/game.tsx";
import { Button } from "@/components/ui/button";
import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu.tsx";
import { api } from "@/lib/controller.ts";

function VersionItem({
  item,
  onClick,
}: {
  item: Awaited<ReturnType<typeof api.install.getVersionList>>["versions"][number];
  onClick: () => void;
}): JSX.Element {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: <explanation>
    <div
      className="w-full h-full px-3.5 flex items-center justify-between rounded-lg text-left hover:bg-background dark:hover:bg-muted/50 transition-colors"
      onClick={onClick}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-center gap-3.5">
        {item.type === "release" ? (
          <IconCircleCheck className="size-8 text-green-400 dark:text-green-500" />
        ) : item.type === "snapshot" ? (
          <IconFlask className="size-8 text-blue-400 dark:text-blue-500" />
        ) : (
          <IconHistory className="size-8 text-orange-400 dark:text-orange-500" />
        )}

        <div className="flex flex-col">
          <span className="font-bold text-sm">{item.id}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(item.releaseTime).toLocaleString(undefined, {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            })}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3.5">
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={(e: MouseEvent<HTMLButtonElement>): void => {
            e.stopPropagation();
            window.open(`https://minecraft.wiki/w/Java_Edition_${item.id}`, "_blank");
          }}
        >
          <IconBook />
        </Button>
      </div>
    </div>
  );
}

export function GamePage({
  search = "",
  setMenu,
}: {
  search?: string;
  setMenu: (menu: JSX.Element) => void;
}): JSX.Element {
  const [isInitialized, setIsInitialized] = useState(false);
  const listViewportRef = useRef<HTMLDivElement>(null);

  const [gameCommandOpen, setGameCommandOpen] = useState<{
    item: Awaited<ReturnType<typeof api.install.getVersionList>>["versions"][number] | null;
    show: boolean;
  }>({
    item: null,
    show: false,
  });

  const [filter, setFilter] = useState<"release" | "snapshot" | "old">("release");

  const query = useQuery({
    queryKey: ["download:game"],
    queryFn: () => api.install.getVersionList(null),
  });

  useNavScroll(listViewportRef);

  useEffect((): (() => void) | undefined => {
    setMenu(
      <DropdownMenuRadioGroup value={filter} onValueChange={setFilter}>
        <DropdownMenuRadioItem value="release">
          <IconCircleCheck />
          正式版
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="snapshot">
          <IconFlask />
          测试版
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="old">
          <IconHistory />
          旧版
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>,
    );

    if (query.data && !isInitialized) {
      const timer = setTimeout(() => {
        setIsInitialized(true);
      }, 500);

      return (): void => clearTimeout(timer);
    }

    return undefined;
  }, [query.data, isInitialized, setMenu, filter]);

  const filteredVersions =
    query.data?.versions?.filter((item) => {
      const matchesSearch = item.id.toLowerCase().includes(search.toLowerCase());

      let matchesFilter = true;
      if (filter === "release") {
        matchesFilter = item.type === "release";
      } else if (filter === "snapshot") {
        matchesFilter = item.type === "snapshot";
      } else if (filter === "old") {
        matchesFilter = item.type !== "release" && item.type !== "snapshot";
      }

      return matchesSearch && matchesFilter;
    }) || [];

  return (
    <>
      <QueryState query={query}>
        <VirtualList
          viewportRef={listViewportRef}
          className="flex-1 min-h-0"
          data={filteredVersions}
          itemHeight={64}
          renderItem={(
            item: Awaited<ReturnType<typeof api.install.getVersionList>>["versions"][number],
            index: number,
          ) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 350,
                damping: 25,
                delay: !isInitialized ? index * 0.05 : 0,
              }}
              className="h-14"
            >
              <VersionItem
                item={item}
                onClick={() =>
                  setGameCommandOpen({
                    show: true,
                    item,
                  })
                }
              />
            </motion.div>
          )}
        >
          {/*<Alert hover={true} className="mb-2 pb-1.5">*/}
          {/*  <IconPackage />*/}
          {/*  <AlertTitle>安装整合包</AlertTitle>*/}
          {/*</Alert>*/}
        </VirtualList>
      </QueryState>

      <GameCommand open={gameCommandOpen} onOpenChange={setGameCommandOpen} />
    </>
  );
}
