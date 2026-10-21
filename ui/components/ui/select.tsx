import { Select as SelectPrimitive } from "@base-ui/react/select";
import { IconCheck, IconChevronDown, IconChevronUp, IconSelector } from "@tabler/icons-react";
import { cn } from "cn";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";

interface SelectHighlightContextValue {
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  layoutId: string;
}

const SelectHighlightContext = React.createContext<SelectHighlightContextValue | null>(null);

type PopupPointerLeaveEvent = Parameters<
  NonNullable<SelectPrimitive.Popup.Props["onPointerLeave"]>
>[0];
type PopupKeyDownEvent = Parameters<NonNullable<SelectPrimitive.Popup.Props["onKeyDown"]>>[0];
type SelectItemPointerEvent = Parameters<
  NonNullable<SelectPrimitive.Item.Props["onPointerMove"]>
>[0];

export interface SelectIndicatorProps extends React.ComponentProps<typeof motion.div> {
  variant?: "default" | "destructive";
}

function SelectIndicator({
  className,
  variant = "default",
  ...props
}: SelectIndicatorProps): React.JSX.Element {
  const context = React.useContext(SelectHighlightContext);

  return (
    <motion.div
      layoutId={context?.layoutId ?? "select-item-indicator"}
      data-slot="select-indicator"
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

const Select: typeof SelectPrimitive.Root = SelectPrimitive.Root;

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props): React.JSX.Element {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  );
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props): React.JSX.Element {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("flex flex-1 text-left", className)}
      {...props}
    />
  );
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default";
}): React.JSX.Element {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={<IconSelector className="pointer-events-none size-4 text-muted-foreground" />}
      />
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = true,
  onPointerLeave,
  onKeyDown,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >): React.JSX.Element {
  const selectId = React.useId();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const popupRef = React.useRef<HTMLDivElement>(null);

  const handlePointerLeave = (e: PopupPointerLeaveEvent): void => {
    setActiveId(null);
    onPointerLeave?.(e);
  };

  const handleKeyDown = (e: PopupKeyDownEvent): void => {
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
      requestAnimationFrame((): void => {
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
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-50"
      >
        <SelectHighlightContext.Provider
          value={{
            activeId,
            setActiveId,
            layoutId: `${selectId}-indicator`,
          }}
        >
          <SelectPrimitive.Popup
            ref={popupRef}
            data-slot="select-content"
            data-align-trigger={alignItemWithTrigger}
            onPointerLeave={handlePointerLeave}
            onKeyDown={handleKeyDown}
            className={cn(
              "relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-(--duration-popup) data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
              className,
            )}
            {...props}
          >
            <SelectScrollUpButton />
            <SelectPrimitive.List>{children}</SelectPrimitive.List>
            <SelectScrollDownButton />
          </SelectPrimitive.Popup>
        </SelectHighlightContext.Provider>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props): React.JSX.Element {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-1.5 py-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

export interface SelectItemProps extends SelectPrimitive.Item.Props {
  id?: string;
  variant?: "default" | "destructive";
}

function SelectItem({
  className,
  children,
  id,
  variant = "default",
  disabled,
  onPointerMove,
  onPointerEnter,
  ...props
}: SelectItemProps): React.JSX.Element {
  const context = React.useContext(SelectHighlightContext);
  const generatedId = React.useId();
  const itemId = id || generatedId;
  const isHighlighted = context?.activeId === itemId;

  const handlePointerInteraction = (): void => {
    if (!disabled) {
      context?.setActiveId(itemId);
    }
  };

  return (
    <SelectPrimitive.Item
      data-item-id={itemId}
      data-slot="select-item"
      data-variant={variant}
      disabled={disabled}
      onPointerMove={(e: SelectItemPointerEvent): void => {
        handlePointerInteraction();
        onPointerMove?.(e);
      }}
      onPointerEnter={(e: SelectItemPointerEvent): void => {
        handlePointerInteraction();
        onPointerEnter?.(e);
      }}
      className={cn(
        "group/select-item relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:text-destructive data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className,
      )}
      {...props}
    >
      <AnimatePresence>{isHighlighted && <SelectIndicator variant={variant} />}</AnimatePresence>
      <SelectPrimitive.ItemText className="relative z-10 flex flex-1 shrink-0 gap-2 whitespace-nowrap">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 z-10 flex size-4 items-center justify-center" />
        }
      >
        <IconCheck className="pointer-events-none" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props): React.JSX.Element {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>): React.JSX.Element {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <IconChevronUp />
    </SelectPrimitive.ScrollUpArrow>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>): React.JSX.Element {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <IconChevronDown />
    </SelectPrimitive.ScrollDownArrow>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectIndicator,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
