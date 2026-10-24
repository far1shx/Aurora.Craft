import { IconBox, IconMenu } from "@tabler/icons-react";
import { type JSX, useState } from "react";
import { useSnapshot } from "valtio";
import { InstanceSheet } from "@/components/sheet/instance.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ButtonGroup } from "@/components/ui/button-group.tsx";
import { settingsConfig } from "@/config/settings.ts";
import { launch } from "@/lib/launch.ts";

export function HomePage(): JSX.Element {
  const settings = useSnapshot(settingsConfig);

  const [instanceSheetOpen, setInstanceSheetOpen] = useState(false);

  return (
    <>
      123
      <div className="w-full flex items-center mt-auto mb-2">
        <ButtonGroup>
          <Button variant="outline" className="h-12">
            <IconMenu />
          </Button>
          <Button variant="outline" className="pl-2.5! px-2 h-12 max-w-42 justify-start gap-2.5">
            {/*<img src={fabricIcon} className="size-7.5" />*/}
            <IconBox className="size-7.5" />
            <div className="flex flex-col text-left">
              <b className="truncate max-w-28">aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</b>
              <span className="text-xs text-muted-foreground -mt-0.5">1.20.1</span>
            </div>
          </Button>
        </ButtonGroup>

        <ButtonGroup className="ml-auto">
          <Button
            variant="outline"
            className="pl-2.5! px-2 h-12 max-w-42 justify-start gap-2.5"
            onClick={() => settings.last_startup && launch({ ...settings.last_startup })}
          >
            {/*<img src={fabricIcon} className="size-7.5" />*/}
            <IconBox className="size-7.5" />
            <div className="flex flex-col text-left">
              {settings.last_startup ? (
                <>
                  <b className="truncate max-w-28">{settings.last_startup.name}</b>
                  <span className="text-xs text-muted-foreground -mt-0.5">
                    {settings.last_startup.meta}
                  </span>
                </>
              ) : (
                <div>没有启动过实例</div>
              )}
            </div>
          </Button>
          <Button variant="outline" className="h-12" onClick={() => setInstanceSheetOpen(true)}>
            <IconMenu />
          </Button>
        </ButtonGroup>
      </div>
      <InstanceSheet open={instanceSheetOpen} onOpenChange={setInstanceSheetOpen} />
    </>
  );
}
