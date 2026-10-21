import type Lenis from "lenis";
import type { JSX, ReactNode, Ref, UIEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { cn } from "@/lib/utils.ts";

export interface VirtualListProps<T> {
  data: readonly T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemHeight: number;
  className?: string;
  viewportClassName?: string;
  overscan?: number;
  hideDelay?: number;
  autoHide?: boolean;
  smoothScroll?: boolean;
  lenisOptions?: ConstructorParameters<typeof Lenis>[0];
  viewportRef?: Ref<HTMLDivElement>;
  children?: ReactNode;
  childrenAlign?: "top" | "bottom";
}

export function VirtualList<T>({
  data,
  renderItem,
  itemHeight,
  className,
  viewportClassName,
  overscan = 5,
  hideDelay,
  autoHide,
  smoothScroll,
  lenisOptions,
  viewportRef,
  children = "top",
  childrenAlign,
}: VirtualListProps<T>): JSX.Element {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleViewportRef = (node: HTMLDivElement | null): void => {
    (scrollContainerRef as { current: HTMLDivElement | null }).current = node;
    if (typeof viewportRef === "function") {
      viewportRef(node);
    } else if (viewportRef && typeof viewportRef === "object") {
      (viewportRef as { current: HTMLDivElement | null }).current = node;
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setViewportHeight(container.clientHeight);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportHeight(entry.contentRect.height);
      }
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, []);

  const handleScroll = (e: UIEvent<HTMLDivElement>): void => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const currentHeight = viewportHeight || scrollContainerRef.current?.clientHeight || 600;

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight));
  const endIndex = Math.min(data.length - 1, Math.ceil((scrollTop + currentHeight) / itemHeight));

  const visibleStartIndex = Math.max(0, startIndex - overscan);
  const visibleEndIndex = Math.min(data.length, endIndex + overscan + 1);

  const visibleItems = data.slice(visibleStartIndex, visibleEndIndex).map((item, idx) => ({
    item,
    index: visibleStartIndex + idx,
  }));

  return (
    <ScrollArea
      viewportRef={handleViewportRef}
      onViewportScroll={handleScroll}
      className={className}
      viewportClassName={cn("relative", viewportClassName)}
      hideDelay={hideDelay}
      autoHide={autoHide}
      smoothScroll={smoothScroll}
      lenisOptions={lenisOptions}
    >
      {childrenAlign === "top" && children}

      <div
        style={{
          height: `${data.length * itemHeight}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {visibleItems.map(({ item, index }) => (
          <div
            key={index}
            style={{
              position: "absolute",
              top: index * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>

      {childrenAlign === "bottom" && children}
    </ScrollArea>
  );
}
