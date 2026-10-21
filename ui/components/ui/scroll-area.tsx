import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { cn } from "cn";
import Lenis from "lenis";
import {
  type JSX,
  type Ref,
  type UIEvent,
  type UIEventHandler,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface ScrollAreaContextValue {
  isThumbVisible: boolean;
  onScrollbarPointerEnter?: () => void;
  onScrollbarPointerLeave?: () => void;
}

const ScrollAreaContext = createContext<ScrollAreaContextValue>({
  isThumbVisible: true,
});

type ScrollAreaProps = ScrollAreaPrimitive.Root.Props & {
  viewportRef?: Ref<HTMLDivElement>;
  onViewportScroll?: UIEventHandler<HTMLDivElement>;
  viewportClassName?: string;
  hideDelay?: number;
  autoHide?: boolean;
  smoothScroll?: boolean;
  lenisOptions?: ConstructorParameters<typeof Lenis>[0];
};

function ScrollArea({
  className,
  viewportClassName,
  viewportRef,
  onViewportScroll,
  hideDelay = 3000,
  autoHide = true,
  smoothScroll = true,
  lenisOptions,
  children,
  ...props
}: ScrollAreaProps): JSX.Element {
  const [isThumbVisible, setIsThumbVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoveringScrollbarRef = useRef(false);
  const internalViewportRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  const setViewportRef = useCallback(
    (node: HTMLDivElement | null): void => {
      internalViewportRef.current = node;
      if (typeof viewportRef === "function") {
        viewportRef(node);
      } else if (viewportRef && typeof viewportRef === "object") {
        (viewportRef as { current: HTMLDivElement | null }).current = node;
      }
    },
    [viewportRef],
  );

  useEffect((): (() => void) | undefined => {
    if (!smoothScroll) return undefined;
    const viewport = internalViewportRef.current;
    if (!viewport) return undefined;

    const content = (viewport.firstElementChild as HTMLElement) || viewport;

    const lenis = new Lenis({
      wrapper: viewport,
      content,
      eventsTarget: viewport,
      autoRaf: true,
      smoothWheel: true,
      lerp: 0.15,
      wheelMultiplier: 1,
      touchMultiplier: 1,
      ...lenisOptions,
    });

    lenisRef.current = lenis;

    return (): void => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [smoothScroll, lenisOptions]);

  const resetTimer = useCallback((): void => {
    if (!autoHide) {
      setIsThumbVisible(true);
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setIsThumbVisible(true);

    timerRef.current = setTimeout(() => {
      if (!isHoveringScrollbarRef.current) {
        setIsThumbVisible(false);
      }
    }, hideDelay);
  }, [autoHide, hideDelay]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [resetTimer]);

  const handleScroll: UIEventHandler<HTMLDivElement> = (e: UIEvent<HTMLDivElement>): void => {
    resetTimer();
    onViewportScroll?.(e);
  };

  const handleScrollbarPointerEnter = useCallback(() => {
    isHoveringScrollbarRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsThumbVisible(true);
  }, []);

  const handleScrollbarPointerLeave = useCallback(() => {
    isHoveringScrollbarRef.current = false;
    resetTimer();
  }, [resetTimer]);

  return (
    <ScrollAreaContext.Provider
      value={{
        isThumbVisible,
        onScrollbarPointerEnter: handleScrollbarPointerEnter,
        onScrollbarPointerLeave: handleScrollbarPointerLeave,
      }}
    >
      <ScrollAreaPrimitive.Root
        data-slot="scroll-area"
        className={cn("relative overflow-hidden", className)}
        {...props}
      >
        <ScrollAreaPrimitive.Viewport
          ref={setViewportRef}
          onScroll={handleScroll}
          data-slot="scroll-area-viewport"
          className={cn(
            "size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1",
            viewportClassName,
          )}
        >
          {children}
        </ScrollAreaPrimitive.Viewport>
        <ScrollBar />
        <ScrollAreaPrimitive.Corner />
      </ScrollAreaPrimitive.Root>
    </ScrollAreaContext.Provider>
  );
}

type ScrollBarProps = ScrollAreaPrimitive.Scrollbar.Props & {
  visible?: boolean;
};

function ScrollBar({
  className,
  orientation = "vertical",
  visible,
  ...props
}: ScrollBarProps): JSX.Element {
  const context = useContext(ScrollAreaContext);
  const isVisible = visible ?? context.isThumbVisible;

  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      onPointerEnter={context.onScrollbarPointerEnter}
      onPointerLeave={context.onScrollbarPointerLeave}
      className={cn(
        "flex touch-none p-px select-none transition-opacity data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent",
        isVisible ? "opacity-100 duration-150" : "opacity-0 pointer-events-none duration-300",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="ml-1 mb-2 w-1 data-horizontal:h-full rounded-full bg-border"
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };
