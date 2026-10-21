import { IconBox, IconMenu } from "@tabler/icons-react";
import type { JSX } from "react";
import { Button } from "@/components/ui/button.tsx";
import { ButtonGroup } from "@/components/ui/button-group.tsx";
import { api } from "@/lib/controller.ts";

export function HomePage(): JSX.Element {
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
            onClick={async () => {
              await api.launch.run({
                name: "test",
                library: "C:\\Users\\heliu\\AppData\\Local\\aurora.craft",
              });
            }}
          >
            {/*<img src={fabricIcon} className="size-7.5" />*/}
            <IconBox className="size-7.5" />
            <div className="flex flex-col text-left">
              <b className="truncate max-w-28">aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</b>
              <span className="text-xs text-muted-foreground -mt-0.5">1.20.1</span>
            </div>
          </Button>
          <Button variant="outline" className="h-12">
            <IconMenu />
          </Button>
        </ButtonGroup>
      </div>
    </>
  );
}
