import { AnimatePresence, motion } from "motion/react";
import { type JSX, useEffect } from "react";
import { useLocation, useOutlet } from "react-router";
import { AppNavigation } from "@/components/app/navigation.tsx";
import AppTitle from "@/components/app/title.tsx";
import { TaskSheet } from "@/components/sheet/task.tsx";
import { toast } from "@/components/ui/toast.tsx";
import { api } from "@/lib/controller.ts";
import { task } from "@/lib/task.ts";

export function App(): JSX.Element {
  const location = useLocation();
  const element = useOutlet();

  useEffect(() => {
    const unTask = api.event.task.on((update) => {
      const item = task.list.find((t) => t.id === update.id);
      if (!item) return;
      Object.assign(item, update);
    });

    const unToast = api.event.toast.on((options) => {
      toast.add({ ...options });
    });

    return () => {
      unTask();
      unToast();
    };
  }, []);

  return (
    <main className="w-full h-screen flex flex-col bg-accent dark:bg-background relative overflow-hidden">
      <AppTitle />
      <AppNavigation />

      <div className="flex-1 flex flex-col px-2 min-h-0">
        <AnimatePresence mode="wait">
          {element && (
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 14 }}
              transition={{
                type: "spring",
                stiffness: 450,
                damping: 32,
                mass: 0.1,
              }}
              className="relative flex h-full min-h-0 w-full flex-1 flex-col gap-2"
            >
              {element}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <TaskSheet />
    </main>
  );
}
