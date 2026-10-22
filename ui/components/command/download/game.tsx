import { IconBolt, IconBooks, IconDeviceGamepad } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { type ChangeEvent, type JSX, useEffect, useState } from "react";
import { useSnapshot } from "valtio/react";
import { Button } from "@/components/ui/button.tsx";
import { Command, CommandDialog, CommandGroup, CommandList } from "@/components/ui/command.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
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
import { cn, defaultLibrary } from "@/lib/utils.ts";

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

  useEffect(() => {
    const url = open.item?.url ?? "";
    const name = url ? (new URL(url).pathname.split("/").pop()?.replace(".json", "") ?? "") : "";

    setConfig((prev) => ({
      ...prev,
      library: defaultLibrary,
      url,
      name,
    }));
  }, [open.item]);

  const loaderType = config.loader.type;
  const isMetaLoader = loaderType === "fabric" || loaderType === "quilt";
  const isInstallerLoader = loaderType === "forge" || loaderType === "neoforge";
  const mcVersion = open.item?.id ?? "";

  const loaderVersions = useQuery({
    queryKey: ["install:loaderVersions", loaderType, mcVersion],
    queryFn: () =>
      api.install.getLoaderVersions({
        loader: { type: loaderType as "fabric" | "quilt", version: "" },
        mcVersion,
      }),
    enabled: isMetaLoader && mcVersion.length > 0,
  });

  const latestLoaderVersion = loaderVersions.data?.[0];

  // 拉到版本列表后默认选中最新项
  useEffect(() => {
    if (!isMetaLoader || !latestLoaderVersion) return;

    setConfig((prev) =>
      prev.loader.type === "none" || prev.loader.version
        ? prev
        : { ...prev, loader: { type: prev.loader.type, version: latestLoaderVersion } },
    );
  }, [isMetaLoader, latestLoaderVersion]);

  return (
    <CommandDialog
      open={open.show}
      onOpenChange={() => onOpenChange({ item: null, show: false })}
      className="h-80"
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

            <div className="mb-2 flex flex-col gap-2">
              <Select
                value={config.loader.type}
                onValueChange={(value: typeof config.loader.type | null) => {
                  if (value === null) return;

                  setConfig((prev) => ({
                    ...prev,
                    loader: value === "none" ? { type: "none" } : { type: value, version: "" },
                  }));
                }}
              >
                <SelectTrigger className="w-full">
                  <IconBolt className="size-4 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="加载器" />
                </SelectTrigger>

                <SelectContent alignItemWithTrigger={false}>
                  <SelectGroup>
                    <SelectItem value="none">不使用加载器</SelectItem>
                    <SelectItem value="fabric">
                      Fabric{" "}
                      <span
                        className={cn(
                          "ml-auto text-muted-foreground text-xs mt-0.5 transition-all duration-100",
                          config.loader.type !== "fabric" && "translate-x-5.5",
                        )}
                      >
                        含 mod
                      </span>
                    </SelectItem>
                    <SelectItem value="quilt">
                      Quilt
                      <span
                        className={cn(
                          "ml-auto text-muted-foreground text-xs mt-0.5 transition-all duration-100",
                          config.loader.type !== "quilt" && "translate-x-5.5",
                        )}
                      >
                        含 mod
                      </span>
                    </SelectItem>
                    <SelectItem value="forge">Forge</SelectItem>
                    <SelectItem value="neoforge">NeoForge</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <AnimatePresence initial={false}>
                {isMetaLoader && (
                  <motion.div
                    key="loader-version"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <Select
                      value={config.loader.version ?? ""}
                      onValueChange={(value: string | null) => {
                        if (value === null) return;

                        setConfig((prev) =>
                          prev.loader.type === "none"
                            ? prev
                            : { ...prev, loader: { type: prev.loader.type, version: value } },
                        );
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            loaderVersions.isLoading
                              ? "正在获取加载器版本…"
                              : latestLoaderVersion
                                ? `最新版本 (${latestLoaderVersion})`
                                : "最新版本"
                          }
                        />
                      </SelectTrigger>

                      <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                          <ScrollArea className="h-42">
                            {(loaderVersions.data ?? []).map((version: string) => (
                              <SelectItem key={version} value={version}>
                                {version}
                              </SelectItem>
                            ))}
                          </ScrollArea>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}

                {isInstallerLoader && (
                  <motion.div
                    key="loader-note"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <p className="px-3 text-xs text-muted-foreground">
                      Forge / NeoForge 需运行官方安装器，暂未接入自动安装
                    </p>
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
                <IconBooks className="size-4 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="安装位置">
                  {config.library === defaultLibrary ? "默认" : config.library}
                </SelectValue>
              </SelectTrigger>

              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {settings.library.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item === defaultLibrary ? "默认" : item}
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
