import { IconBolt, IconDeviceFloppy, IconDeviceGamepad } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { type ChangeEvent, type JSX, useEffect, useState } from "react";
import { useSnapshot } from "valtio/react";
import { Button } from "@/components/ui/button.tsx";
import { Command, CommandDialog, CommandGroup, CommandList } from "@/components/ui/command.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { toast } from "@/components/ui/toast.tsx";
import { settingsConfig } from "@/config/settings.ts";
import { api } from "@/lib/controller.ts";
import { task } from "@/lib/task.ts";

export function GameCommand({
  open,
  onOpenChange,
}: {
  open: {
    item: Awaited<ReturnType<typeof api.install.getVersionList>>["versions"][number] | null;
    show: boolean;
  };
  onOpenChange: ({ item, show }: typeof open) => void;
}): JSX.Element {
  const settings = useSnapshot(settingsConfig);
  const [config, setConfig] = useState<Parameters<typeof api.install.installMinecraft>[0]>({
    loader: { type: "none" },
    library: "",
    name: "",
    url: "",
  });

  const loaders = [
    { value: "none", label: "不使用加载器" },
    { value: "fabric", label: "Fabric" },
    { value: "quilt", label: "Quilt" },
    { value: "forge", label: "Forge" },
    { value: "neoforge", label: "NeoForge" },
  ];

  useEffect(() => {
    const library = settings.library[0] || "";
    const url = open.item?.url ?? "";
    const name = url ? (new URL(url).pathname.split("/").pop()?.replace(".json", "") ?? "") : "";

    setConfig((prev) => ({
      ...prev,
      library,
      url,
      name,
    }));
  }, [settings.library, open.item]);

  return (
    <CommandDialog
      open={open.show}
      onOpenChange={() => onOpenChange({ item: null, show: false })}
      className="h-70"
    >
      <Command>
        <div className="flex h-9 items-center px-1 py-1">
          <span className="text-sm font-medium ml-1">安装实例 {open.item?.id}</span>
        </div>

        <CommandList>
          <CommandGroup>
            <InputGroup className="mb-2">
              <InputGroupAddon>
                <IconDeviceGamepad className="cursor-text" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="实例名称"
                value={config.name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value;
                  setConfig((prev) => ({ ...prev, name: value }));
                }}
                className="text-sm cursor-text"
              />
            </InputGroup>

            <div className="relative w-full mb-2">
              <Select
                items={loaders}
                value={config.loader.type}
                onValueChange={(value: typeof config.loader.type | null) => {
                  if (value === null) return;

                  setConfig((prev) => ({
                    ...prev,
                    loader:
                      value === "none"
                        ? { type: "none" }
                        : {
                            type: value,
                            version: prev.loader.type === "none" ? "" : prev.loader.version,
                          },
                  }));
                }}
              >
                <SelectTrigger className="w-full">
                  <IconBolt className="size-4 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="加载器" />
                </SelectTrigger>

                <SelectContent alignItemWithTrigger={false}>
                  <SelectGroup>
                    {loaders.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <AnimatePresence>
                {config.loader.type !== "none" && (
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
                    className="absolute right-5 top-0.5 z-10 text-muted-foreground"
                  >
                    <Button
                      size="sm"
                      variant="ghost"
                      className="z-10 text-muted-foreground bg-transparent!"
                    >
                      1.0.5
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Select
              items={settings.library.map((value) => ({
                label: value,
                value,
              }))}
              value={config.library}
              onValueChange={(value: string | null) => {
                if (value === null) return;

                setConfig((prev) => ({
                  ...prev,
                  library: value,
                }));
              }}
            >
              <SelectTrigger className="w-full">
                <IconDeviceFloppy className="size-4 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="安装位置" />
              </SelectTrigger>

              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {settings.library.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </CommandGroup>
        </CommandList>

        <Button
          variant="outline"
          className="mt-auto mx-1 mb-1"
          onClick={async () => {
            if (await api.instance.check({ ...config })) {
              toast.add({
                title: "实例已存在",
                type: "error",
              });
              return;
            }

            const t = task.add(`安装 ${config.name}`);

            onOpenChange({ item: null, show: false });
            task.sheet.open = true;

            await api.install.installMinecraft({
              ...config,
              taskId: t.id,
            });
          }}
        >
          安装
        </Button>
      </Command>
    </CommandDialog>
  );
}
