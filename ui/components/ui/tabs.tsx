import { motion } from "motion/react";
import type { CSSProperties, ComponentType, JSX } from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface TabsProps {
  items: {
    icon?: ComponentType<{ className?: string }>;
    label: string;
    value: string;
  }[];
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function Tabs({ items, defaultValue, onChange, className }: TabsProps): JSX.Element {
  const [activeValue, setActiveValue] = useState(defaultValue || (items[0]?.value ?? ""));
  const [hoverValue, setHoverValue] = useState<string | null>(null);

  useEffect(() => {
    if (defaultValue !== undefined) {
      setActiveValue(defaultValue);
    }
  }, [defaultValue]);

  const handleTabClick = (value: string): void => {
    if (value === activeValue) return;

    setActiveValue(value);

    if (onChange) {
      onChange(value);
    }

    const event = new CustomEvent("tab-change", { detail: { value } });
    window.dispatchEvent(event);
  };

  const targetValue = hoverValue !== null ? hoverValue : activeValue;

  return (
    <div
      role="tablist"
      onMouseLeave={() => setHoverValue(null)}
      className={cn(
        "relative flex items-center h-9 p-1 gap-1 border bg-background dark:bg-[#151515] backdrop-blur-xs rounded-lg overflow-hidden w-fit",
        className,
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.value === activeValue;
        const isHighlighted = item.value === targetValue;
        const hasActiveText = isActive || isHighlighted;

        return (
          <button
            role="tab"
            type="button"
            key={item.value}
            onMouseEnter={() => setHoverValue(item.value)}
            onClick={() => handleTabClick(item.value)}
            className={cn(
              "relative h-full px-2.5 flex items-center justify-center gap-2 text-sm font-medium transition-colors duration-300 outline-none cursor-default select-none",
              hasActiveText
                ? "text-accent-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
            style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
          >
            {isHighlighted && (
              <motion.div
                layoutId="active-tab-indicator"
                className="absolute inset-0 bg-accent rounded-lg z-0"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <div className="relative z-10 flex items-center gap-2">
              {Icon && <Icon className="size-4 shrink-0" />}
              <span>{item.label}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
