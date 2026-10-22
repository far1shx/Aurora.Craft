import { IconBooks, IconBox, IconChevronRight, IconSearch } from "@tabler/icons-react";
import { motion } from "motion/react";
import { type InputEvent, type JSX, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useSnapshot } from "valtio";
import { useNavScroll } from "@/components/app/navigation.tsx";
import { VirtualList } from "@/components/aurora/virtual-list.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { settingsConfig } from "@/config/settings.ts";
import { defaultLibrary } from "@/lib/utils.ts";
import { instanceStore } from "@/store/instance.ts";

function InstanceItem({
  item,
  onClick,
}: {
  item: (typeof instanceStore.list)[number];
  onClick: () => void;
}): JSX.Element {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: <explanation>
    <div
      className="w-full h-full px-3.5 flex items-center justify-between rounded-lg text-left hover:bg-background dark:hover:bg-muted/50 transition-colors group"
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
        <IconBox className="size-8" />

        <div className="flex flex-col">
          <span className="font-bold text-sm">{item.name}</span>
          <span className="text-xs text-muted-foreground">{item.version}</span>
        </div>
      </div>

      <IconChevronRight className="size-4" />
    </div>
  );
}

export function InstancePage(): JSX.Element {
  const listViewportRef = useRef<HTMLDivElement>(null);
  const instance = useSnapshot(instanceStore);
  const settings = useSnapshot(settingsConfig);

  const [search, setSearch] = useState("");
  const [library, setLibrary] = useState<string | null>(defaultLibrary);

  useEffect(() => {
    void instanceStore.refresh();
  }, []);

  useNavScroll(listViewportRef);

  const filteredInstances =
    instance.list.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.version.toLowerCase().includes(search.toLowerCase());

      return matchesSearch && item.library === library;
    }) || [];

  return (
    <>
      <div className="w-full flex items-center">
        <Select
          items={settings.library.map((value) => ({
            label: value === defaultLibrary ? "默认" : value,
            value,
          }))}
          value={library}
          onValueChange={(value: string | null) => setLibrary(value)}
        >
          <SelectTrigger className="max-w-75 h-9">
            <IconBooks className="size-4 shrink-0 text-muted-foreground" />
            <SelectValue placeholder="安装位置">
              {library === defaultLibrary ? "默认" : library}
            </SelectValue>
          </SelectTrigger>

          <SelectContent alignItemWithTrigger={false} className="w-auto! max-w-75!">
            <SelectGroup>
              {settings.library.map((item) => (
                <SelectItem key={item} value={item}>
                  <span className="truncate max-w-70">
                    {item === defaultLibrary ? "默认" : item}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <InputGroup className="h-9 w-45 ml-auto">
          <InputGroupInput
            placeholder="搜索"
            onInput={(e: InputEvent<HTMLInputElement>) => setSearch(e.currentTarget.value)}
            className="text-sm cursor-text"
          />
          <InputGroupAddon>
            <IconSearch className="cursor-text" />
          </InputGroupAddon>
        </InputGroup>
      </div>

      <VirtualList
        viewportRef={listViewportRef}
        className="flex-1 min-h-0"
        data={filteredInstances}
        itemHeight={64}
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
            className="h-14"
          >
            <InstanceItem item={item} onClick={() => console.log(1)} />
          </motion.div>
        )}
      ></VirtualList>
    </>
  );
}
