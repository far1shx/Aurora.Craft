import { IconDeviceGamepad2, IconMenu, IconPackage, IconSearch } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import type { InputEvent, JSX } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { Tabs } from "@/components/ui/tabs.tsx";
import { GamePage } from "@/pages/download/game.tsx";
import { PackagePage } from "@/pages/download/package.tsx";

export function DownloadPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState("game");
  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState<JSX.Element | undefined>(undefined);

  const handleTabChange = (value: string): void => {
    setActiveTab(value);
    setMenu(undefined);
  };

  return (
    <>
      <div className="w-full flex items-center">
        <Tabs
          items={[
            {
              value: "game",
              label: "游戏",
              icon: IconDeviceGamepad2,
            },
            {
              value: "package",
              label: "整合包",
              icon: IconPackage,
            },
          ]}
          defaultValue="game"
          onChange={handleTabChange}
        />

        <InputGroup className="h-9 w-45 ml-auto">
          <InputGroupInput
            placeholder="搜索"
            onInput={(e: InputEvent<HTMLInputElement>) => setSearch(e.currentTarget.value)}
            className="text-sm cursor-text"
          />
          <InputGroupAddon>
            <IconSearch className="cursor-text" />
          </InputGroupAddon>

          <AnimatePresence>
            {menu && (
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
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        size="icon"
                        variant="ghost"
                        className="mr-0.5 text-muted-foreground [&[aria-expanded=true]>svg]:text-foreground duration-200"
                      >
                        <IconMenu />
                      </Button>
                    }
                  >
                    Open
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>{menu}</DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            )}
          </AnimatePresence>
        </InputGroup>
      </div>

      {activeTab === "game" && <GamePage search={search} setMenu={setMenu} />}
      {activeTab === "package" && <PackagePage search={search} setMenu={setMenu} />}
    </>
  );
}
