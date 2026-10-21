import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { IconCheck, IconChevronRight } from "@tabler/icons-react";
import { cn } from "cn";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";

interface MenuHighlightContextValue {
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  layoutId: string;
}

const MenuHighlightContext = React.createContext<MenuHighlightContextValue | null>(null);

type PopupPointerLeaveEvent = Parameters<
  NonNullable<MenuPrimitive.Popup.Props["onPointerLeave"]>
>[0];
type PopupKeyDownEvent = Parameters<NonNullable<MenuPrimitive.Popup.Props["onKeyDown"]>>[0];
type MenuItemPointerEvent = Parameters<NonNullable<MenuPrimitive.Item.Props["onPointerMove"]>>[0];
type MenuSubTriggerPointerEvent = Parameters<
  NonNullable<MenuPrimitive.SubmenuTrigger.Props["onPointerMove"]>
>[0];
type MenuCheckboxPointerEvent = Parameters<
  NonNullable<MenuPrimitive.CheckboxItem.Props["onPointerMove"]>
>[0];
type MenuRadioPointerEvent = Parameters<
  NonNullable<MenuPrimitive.RadioItem.Props["onPointerMove"]>
>[0];

export interface DropdownMenuIndicatorProps extends React.ComponentProps<typeof motion.div> {
  variant?: "default" | "destructive";
}

function DropdownMenuIndicator({
  className,
  variant = "default",
  ...props
}: DropdownMenuIndicatorProps): React.JSX.Element {
  const context = React.useContext(MenuHighlightContext);

  return (
    <motion.div
      layoutId={context?.layoutId ?? "dropdown-menu-item-indicator"}
      data-slot="dropdown-menu-indicator"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{
        opacity: 0,
        scale: 0.96,
        transition: { duration: 0.12, ease: "easeOut" },
      }}
      className={cn(
        "pointer-events-none absolute inset-0 z-0 rounded-md",
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

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props): React.JSX.Element {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({ ...props }: MenuPrimitive.Portal.Props): React.JSX.Element {
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props): React.JSX.Element {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
  onPointerLeave,
  onKeyDown,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<
    MenuPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >): React.JSX.Element {
  const menuId = React.useId();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const popupRef = React.useRef<HTMLDivElement>(null);

  const handlePointerLeave = (e: PopupPointerLeaveEvent): void => {
    setActiveId(null);
    onPointerLeave?.(e);
  };

  const handleKeyDown = (e: PopupKeyDownEvent): void => {
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
      requestAnimationFrame(() => {
        const highlightedEl = popupRef.current?.querySelector(
          "[data-highlighted]:not([data-disabled])",
        );
        if (highlightedEl) {
          const id = highlightedEl.getAttribute("data-item-id") || highlightedEl.id;
          if (id) {
            setActiveId(id);
          }
        }
      });
    }
    onKeyDown?.(e);
  };

  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuHighlightContext.Provider
          value={{
            activeId,
            setActiveId,
            layoutId: `${menuId}-indicator`,
          }}
        >
          <MenuPrimitive.Popup
            ref={popupRef}
            data-slot="dropdown-menu-content"
            onPointerLeave={handlePointerLeave}
            onKeyDown={handleKeyDown}
            className={cn(
              "z-50 max-h-(--available-height) w-(--anchor-width) min-w-32 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-(--duration-popup) outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-95",
              className,
            )}
            {...props}
          />
        </MenuHighlightContext.Provider>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props): React.JSX.Element {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: MenuPrimitive.GroupLabel.Props & {
  inset?: boolean;
}): React.JSX.Element {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-1.5 py-1 text-xs font-medium text-muted-foreground data-inset:pl-7",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  disabled,
  onPointerMove,
  onPointerEnter,
  children,
  ...props
}: MenuPrimitive.Item.Props & {
  inset?: boolean;
  variant?: "default" | "destructive";
}): React.JSX.Element {
  const context = React.useContext(MenuHighlightContext);
  const generatedId = React.useId();
  const itemId = props.id || generatedId;
  const isHighlighted = context?.activeId === itemId;

  const handlePointerInteraction = (): void => {
    if (!disabled) {
      context?.setActiveId(itemId);
    }
  };

  return (
    <MenuPrimitive.Item
      id={itemId}
      data-item-id={itemId}
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      disabled={disabled}
      onPointerMove={(e: MenuItemPointerEvent): void => {
        handlePointerInteraction();
        onPointerMove?.(e);
      }}
      onPointerEnter={(e: MenuItemPointerEvent): void => {
        handlePointerInteraction();
        onPointerEnter?.(e);
      }}
      className={cn(
        "group/dropdown-menu-item relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:text-destructive data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive",
        className,
      )}
      {...props}
    >
      <AnimatePresence>
        {isHighlighted && <DropdownMenuIndicator variant={variant} />}
      </AnimatePresence>
      <span className="relative z-10 flex items-center gap-1.5 w-full">{children}</span>
    </MenuPrimitive.Item>
  );
}

function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props): React.JSX.Element {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  disabled,
  onPointerMove,
  onPointerEnter,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean;
}): React.JSX.Element {
  const context = React.useContext(MenuHighlightContext);
  const generatedId = React.useId();
  const itemId = props.id || generatedId;
  const isHighlighted = context?.activeId === itemId;

  const handlePointerInteraction = (): void => {
    if (!disabled) {
      context?.setActiveId(itemId);
    }
  };

  return (
    <MenuPrimitive.SubmenuTrigger
      id={itemId}
      data-item-id={itemId}
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      disabled={disabled}
      onPointerMove={(e: MenuSubTriggerPointerEvent): void => {
        handlePointerInteraction();
        onPointerMove?.(e);
      }}
      onPointerEnter={(e: MenuSubTriggerPointerEvent): void => {
        handlePointerInteraction();
        onPointerEnter?.(e);
      }}
      className={cn(
        "relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <AnimatePresence>{isHighlighted && <DropdownMenuIndicator />}</AnimatePresence>
      <span className="relative z-10 flex items-center gap-1.5 w-full">
        {children}
        <IconChevronRight className="ml-auto" />
      </span>
    </MenuPrimitive.SubmenuTrigger>
  );
}

function DropdownMenuSubContent({
  align = "start",
  alignOffset = -3,
  side = "right",
  sideOffset = 0,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>): React.JSX.Element {
  return (
    <DropdownMenuContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        "w-auto min-w-24 rounded-lg bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-(--duration-popup) data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
        className,
      )}
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  disabled,
  onPointerMove,
  onPointerEnter,
  ...props
}: MenuPrimitive.CheckboxItem.Props & {
  inset?: boolean;
}): React.JSX.Element {
  const context = React.useContext(MenuHighlightContext);
  const generatedId = React.useId();
  const itemId = props.id || generatedId;
  const isHighlighted = context?.activeId === itemId;

  const handlePointerInteraction = (): void => {
    if (!disabled) {
      context?.setActiveId(itemId);
    }
  };

  return (
    <MenuPrimitive.CheckboxItem
      id={itemId}
      data-item-id={itemId}
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset}
      disabled={disabled}
      onPointerMove={(e: MenuCheckboxPointerEvent): void => {
        handlePointerInteraction();
        onPointerMove?.(e);
      }}
      onPointerEnter={(e: MenuCheckboxPointerEvent): void => {
        handlePointerInteraction();
        onPointerEnter?.(e);
      }}
      className={cn(
        "relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      checked={checked}
      {...props}
    >
      <AnimatePresence>{isHighlighted && <DropdownMenuIndicator />}</AnimatePresence>
      <span
        className="pointer-events-none absolute right-2 z-10 flex items-center justify-center"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        <MenuPrimitive.CheckboxItemIndicator>
          <IconCheck />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      <span className="relative z-10 flex items-center gap-1.5 w-full">{children}</span>
    </MenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props): React.JSX.Element {
  return <MenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  disabled,
  onPointerMove,
  onPointerEnter,
  ...props
}: MenuPrimitive.RadioItem.Props & {
  inset?: boolean;
}): React.JSX.Element {
  const context = React.useContext(MenuHighlightContext);
  const generatedId = React.useId();
  const itemId = props.id || generatedId;
  const isHighlighted = context?.activeId === itemId;

  const handlePointerInteraction = (): void => {
    if (!disabled) {
      context?.setActiveId(itemId);
    }
  };

  return (
    <MenuPrimitive.RadioItem
      id={itemId}
      data-item-id={itemId}
      data-slot="dropdown-menu-radio-item"
      data-inset={inset}
      disabled={disabled}
      onPointerMove={(e: MenuRadioPointerEvent): void => {
        handlePointerInteraction();
        onPointerMove?.(e);
      }}
      onPointerEnter={(e: MenuRadioPointerEvent): void => {
        handlePointerInteraction();
        onPointerEnter?.(e);
      }}
      className={cn(
        "relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <AnimatePresence>{isHighlighted && <DropdownMenuIndicator />}</AnimatePresence>
      <span
        className="pointer-events-none absolute right-2 z-10 flex items-center justify-center"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <MenuPrimitive.RadioItemIndicator>
          <IconCheck />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      <span className="relative z-10 flex items-center gap-1.5 w-full">{children}</span>
    </MenuPrimitive.RadioItem>
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: MenuPrimitive.Separator.Props): React.JSX.Element {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">): React.JSX.Element {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuIndicator,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
