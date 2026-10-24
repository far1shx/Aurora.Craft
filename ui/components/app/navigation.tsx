import {
  IconDownload,
  IconHome,
  IconLayoutGrid,
  IconSettings,
  IconUser,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { type CSSProperties, type JSX, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type ScrollTarget =
  | HTMLElement
  | { current: HTMLElement | null }
  | (() => HTMLElement | null)
  | null;

export interface BindNavScrollOptions {
  threshold?: number;
  bottomThreshold?: number;
}

type NavScrollListener = (isScrolled: boolean) => void;

let currentIsScrolled = false;
const navScrollListeners = new Set<NavScrollListener>();
let activeCleanup: (() => void) | null = null;

function notifyNavScroll(scrolled: boolean): void {
  if (currentIsScrolled !== scrolled) {
    currentIsScrolled = scrolled;
    for (const listener of navScrollListeners) {
      listener(scrolled);
    }
  }
}

export function subscribeNavScroll(listener: NavScrollListener): () => void {
  navScrollListeners.add(listener);
  listener(currentIsScrolled);
  return () => {
    navScrollListeners.delete(listener);
  };
}

export function setNavScrolled(scrolled: boolean): void {
  notifyNavScroll(scrolled);
}

function resolveScrollElement(target: ScrollTarget): HTMLElement | null {
  if (!target) return null;
  if ("current" in target) return target.current;
  if (typeof target === "function") return target();
  return target;
}

export function unbindNavScroll(): void {
  if (activeCleanup) {
    activeCleanup();
    activeCleanup = null;
  }
  setNavScrolled(false);
}

export function bindNavScroll(target: ScrollTarget, options?: BindNavScrollOptions): () => void {
  if (activeCleanup) {
    activeCleanup();
    activeCleanup = null;
  }

  const threshold = options?.bottomThreshold ?? options?.threshold ?? 140;
  let cleanups: (() => void)[] = [];
  let isCleanedUp = false;
  let attachedElement: HTMLElement | null = null;

  const cleanup = (): void => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    for (const fn of cleanups) fn();
    cleanups = [];
    attachedElement = null;
    if (activeCleanup === cleanup) {
      activeCleanup = null;
    }
    setNavScrolled(false);
  };

  activeCleanup = cleanup;

  const updateScrollState = (el: HTMLElement): void => {
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 5) {
      setNavScrolled(false);
      return;
    }
    const distanceFromBottom = maxScroll - el.scrollTop;
    setNavScrolled(distanceFromBottom <= threshold);
  };

  const attach = (el: HTMLElement): void => {
    if (attachedElement === el) return;
    attachedElement = el;

    const handleScroll = (): void => {
      updateScrollState(el);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    const resizeObserver = new ResizeObserver(() => {
      handleScroll();
    });
    resizeObserver.observe(el);

    cleanups.push(() => {
      el.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    });
  };

  const onGlobalScroll = (e: Event): void => {
    const el = resolveScrollElement(target);
    if (!el) return;
    if (e.target === el || el.contains(e.target as Node)) {
      if (attachedElement !== el) {
        attach(el);
      }
      updateScrollState(el);
    }
  };

  document.addEventListener("scroll", onGlobalScroll, { capture: true, passive: true });
  cleanups.push(() => {
    document.removeEventListener("scroll", onGlobalScroll, { capture: true });
  });

  // 2. 检查初始挂载，若未挂载（如网络请求异步渲染）则周期性检测
  const initialEl = resolveScrollElement(target);
  if (initialEl) {
    attach(initialEl);
  } else if (target) {
    const intervalId = setInterval(() => {
      if (isCleanedUp) {
        clearInterval(intervalId);
        return;
      }
      const el = resolveScrollElement(target);
      if (el) {
        attach(el);
        clearInterval(intervalId);
      }
    }, 50);

    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
    }, 15000);

    cleanups.push(() => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    });
  }

  return cleanup;
}

export const setNavScrollRef: typeof bindNavScroll = bindNavScroll;

/**
 * React Hook：在组件生命周期内绑定指定虚拟滚动条或滚动容器的 ref，卸载时自动解除监听
 */
export function useNavScroll(target: ScrollTarget, options?: BindNavScrollOptions): void {
  const threshold = options?.bottomThreshold ?? options?.threshold;
  useEffect(() => {
    const unbind = bindNavScroll(target, { threshold });
    return () => {
      unbind();
    };
  }, [target, threshold]);
}

export interface AppNavigationController {
  bindScroll: typeof bindNavScroll;
  unbindScroll: typeof unbindNavScroll;
  setScrolled: typeof setNavScrolled;
  setScrollRef: typeof bindNavScroll;
}

export const appNavigation: AppNavigationController = {
  bindScroll: bindNavScroll,
  unbindScroll: unbindNavScroll,
  setScrolled: setNavScrolled,
  setScrollRef: bindNavScroll,
};

export function AppNavigation(): JSX.Element {
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(currentIsScrolled);

  useEffect(() => {
    const unsubscribe = subscribeNavScroll(setIsScrolled);

    const handleScroll = (e: Event): void => {
      const customEvent = e as CustomEvent;
      setNavScrolled(customEvent.detail?.isScrolled ?? false);
    };

    window.addEventListener("page-scroll", handleScroll);
    return () => {
      unsubscribe();
      window.removeEventListener("page-scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (location.pathname) {
      setNavScrolled(false);
    }
  }, [location.pathname]);

  const handleMouseEnter = (): void => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShow(true);
  };

  const handleMouseLeave = (): void => {
    timeoutRef.current = setTimeout(() => {
      setShow(false);
    }, 150);
  };

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const items = [
    {
      icon: IconHome,
      label: "主页",
      path: "/home",
    },
    {
      icon: IconLayoutGrid,
      label: "实例",
      path: "/instance",
    },
    {
      icon: IconDownload,
      label: "下载",
      path: "/download",
    },
    {
      icon: IconUser,
      label: "账号",
      path: "/account",
    },
    {
      icon: IconSettings,
      label: "设置",
      path: "/settings",
    },
  ];

  const activeIndex = items.findIndex((item) => location.pathname.startsWith(item.path));
  const activeIndexOrZero = activeIndex !== -1 ? activeIndex : 0;
  const targetIndex = hoverIndex !== null ? hoverIndex : activeIndexOrZero;

  return (
    <AnimatePresence>
      <div
        className={`absolute inset-0 flex flex-col pointer-events-none z-20 ${
          isScrolled ? "justify-start pt-2" : "justify-end pb-2"
        }`}
      >
        <motion.div
          layout
          initial={{ y: 80, opacity: 0 }}
          animate={{
            y: 0,
            opacity: 1,
            scale: 1,
          }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 18 }}
          className="flex justify-center w-full pointer-events-none"
        >
          <nav
            aria-label="Navigation"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="pointer-events-auto"
            style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
          >
            <div
              className={`relative flex items-center justify-center border bg-background dark:bg-[#151515] backdrop-blur-xs overflow-hidden transition-all duration-300 ease-out ${
                show ? "h-12 w-60 rounded-lg" : "h-3 w-10 rounded-lg"
              }`}
            >
              <div
                role="toolbar"
                aria-label="Navigation Items"
                className={`absolute flex items-center gap-2 transition-all duration-300 ${
                  show ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
                }`}
                onMouseLeave={() => setHoverIndex(null)}
              >
                <div
                  className="absolute left-0 h-10 w-10 bg-accent rounded-lg transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(${targetIndex * 48}px)` }}
                />

                {items.map((item, index) => {
                  const Icon = item.icon;

                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger
                        render={
                          <button
                            type="button"
                            aria-label={item.label}
                            onClick={() => navigate(item.path)}
                            onMouseEnter={() => setHoverIndex(index)}
                            onFocus={() => setHoverIndex(index)}
                            onBlur={() => setHoverIndex(null)}
                            className={`relative z-10 flex items-center justify-center size-10 cursor-default transition-colors duration-300 ${
                              activeIndexOrZero === index || hoverIndex === index
                                ? "text-accent-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            <Icon className="size-5" />
                          </button>
                        }
                      />
                      <TooltipContent side={isScrolled ? "bottom" : "top"}>
                        <span>{item.label}</span>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>

              <div
                className={`absolute h-0.5 w-4 rounded-xl bg-foreground pointer-events-none transition-all duration-100 ${
                  show ? "opacity-0 scale-150" : "opacity-100 scale-100"
                }`}
              />
            </div>
          </nav>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
