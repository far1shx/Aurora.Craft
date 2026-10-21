import { IconCheck, IconSearch } from "@tabler/icons-react";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "cn";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";

interface CommandHighlightContextValue {
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  layoutId: string;
}

const CommandHighlightContext = React.createContext<CommandHighlightContextValue | null>(null);

export interface CommandIndicatorProps extends React.ComponentProps<typeof motion.div> {
  variant?: "default" | "destructive";
}

function CommandIndicator({
  className,
  variant = "default",
  ...props
}: CommandIndicatorProps): React.JSX.Element {
  const context = React.useContext(CommandHighlightContext);

  return (
    <motion.div
      layoutId={context?.layoutId ?? "command-item-indicator"}
      data-slot="command-indicator"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{
        opacity: 0,
        scale: 0.96,
        transition: { duration: 0.12, ease: "easeOut" },
      }}
      className={cn(
        "pointer-events-none absolute inset-0 z-0 rounded-sm in-data-[slot=dialog-content]:rounded-lg!",
        variant === "destructive" ? "bg-destructive/10 dark:bg-destructive/20" : "bg-accent",
        className,
      )}
      transition={{
        layout: {
          type: "spring",
          stiffness: 550,
          damping: 35,
          mass: 0.7,
        },
        opacity: { duration: 0.15, ease: "easeOut" },
        scale: { duration: 0.15, ease: "easeOut" },
      }}
      {...props}
    />
  );
}

function Command({
  className,
  onKeyDown,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>): React.JSX.Element {
  const commandId = React.useId();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
      requestAnimationFrame((): void => {
        const container = containerRef.current;
        if (!container) return;

        const selectedEl = container.querySelector(
          "[data-slot='command-item'][data-selected='true']:not([data-disabled='true'])",
        );
        if (selectedEl) {
          const id = selectedEl.getAttribute("data-item-id") || selectedEl.id;
          if (id) {
            setActiveId(id);
          }
        }
      });
    }
    onKeyDown?.(e);
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>): void => {
    setActiveId(null);
    props.onPointerLeave?.(e);
  };

  return (
    <CommandHighlightContext.Provider
      value={{
        activeId,
        setActiveId,
        layoutId: `${commandId}-indicator`,
      }}
    >
      <CommandPrimitive
        ref={containerRef}
        data-slot="command"
        onKeyDown={handleKeyDown}
        onPointerLeave={handlePointerLeave}
        className={cn(
          "flex size-full flex-col overflow-hidden rounded-xl! bg-popover p-1 text-popover-foreground",
          className,
        )}
        {...props}
      />
    </CommandHighlightContext.Provider>
  );
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, "children"> & {
  title?: string;
  description?: string;
  className?: string;
  showCloseButton?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn(
          "top-1/4 translate-y-0 overflow-hidden rounded-xl! p-0 w-300! max-w-3/5!",
          className,
        )}
        showCloseButton={showCloseButton}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>): React.JSX.Element {
  return (
    <div data-slot="command-input-wrapper" className="p-1 pb-0">
      <InputGroup className="h-8! rounded-lg! border-input/30 bg-input/30 shadow-none! *:data-[slot=input-group-addon]:pl-2!">
        <CommandPrimitive.Input
          data-slot="command-input"
          className={cn(
            "w-full text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        />
        <InputGroupAddon>
          <IconSearch className="size-4 shrink-0 opacity-50" />
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

function CommandList({
  className,
  onPointerLeave,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>): React.JSX.Element {
  const context = React.useContext(CommandHighlightContext);

  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>): void => {
    context?.setActiveId(null);
    onPointerLeave?.(e);
  };

  return (
    <CommandPrimitive.List
      data-slot="command-list"
      onPointerLeave={handlePointerLeave}
      className={cn(
        "no-scrollbar max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none",
        className,
      )}
      {...props}
    />
  );
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>): React.JSX.Element {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("py-6 text-center text-sm", className)}
      {...props}
    />
  );
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>): React.JSX.Element {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "overflow-hidden p-1 text-foreground **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>): React.JSX.Element {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("-mx-1 h-px bg-border", className)}
      {...props}
    />
  );
}

export interface CommandItemProps extends React.ComponentProps<typeof CommandPrimitive.Item> {
  variant?: "default" | "destructive";
}

function CommandItem({
  className,
  children,
  id,
  disabled,
  variant = "default",
  onPointerMove,
  onPointerEnter,
  ...props
}: CommandItemProps): React.JSX.Element {
  const context = React.useContext(CommandHighlightContext);
  const generatedId = React.useId();
  const itemId = id || generatedId;
  const isHighlighted = context?.activeId === itemId;

  const handlePointerInteraction = (): void => {
    if (!disabled) {
      context?.setActiveId(itemId);
    }
  };

  return (
    <CommandPrimitive.Item
      id={itemId}
      data-item-id={itemId}
      data-slot="command-item"
      data-variant={variant}
      disabled={disabled}
      onPointerMove={(e: React.PointerEvent<HTMLDivElement>): void => {
        handlePointerInteraction();
        onPointerMove?.(e);
      }}
      onPointerEnter={(e: React.PointerEvent<HTMLDivElement>): void => {
        handlePointerInteraction();
        onPointerEnter?.(e);
      }}
      className={cn(
        "group/command-item relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none in-data-[slot=dialog-content]:rounded-lg! data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-selected:text-accent-foreground focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground not-data-[variant=destructive]:data-selected:**:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:data-selected:text-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive",
        className,
      )}
      {...props}
    >
      <AnimatePresence>{isHighlighted && <CommandIndicator variant={variant} />}</AnimatePresence>
      <span className="relative z-10 flex items-center gap-2 w-full">
        {children}
        <IconCheck className="ml-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100" />
      </span>
    </CommandPrimitive.Item>
  );
}

function CommandShortcut({ className, ...props }: React.ComponentProps<"span">): React.JSX.Element {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground group-data-selected/command-item:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandIndicator,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
};
