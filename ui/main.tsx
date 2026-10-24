import "@/assets/globals.css";
import "@/lib/rpc.ts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Navigate, RouterProvider, createHashRouter } from "react-router";
import { ThemeProvider } from "@/components/ui/theme-provider.tsx";
import { Toaster } from "@/components/ui/toast.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { AccountPage } from "@/pages/account.tsx";
import { DownloadPage } from "@/pages/download.tsx";
import { HomePage } from "@/pages/home.tsx";
import { InstancePage } from "@/pages/instance.tsx";
import { SettingsPage } from "@/pages/settings.tsx";
import { App } from "./app.tsx";

const router = createHashRouter([
  {
    path: "/",
    Component: () => <App />,
    children: [
      {
        path: "/",
        element: <Navigate to="/home" />,
      },
      {
        path: "/home",
        Component: () => <HomePage />,
      },
      {
        path: "/instance",
        Component: () => <InstancePage />,
      },
      {
        path: "/download",
        Component: () => <DownloadPage />,
      },
      {
        path: "/settings",
        Component: () => <SettingsPage />,
      },
      {
        path: "/account",
        Component: () => <AccountPage />,
      },
    ],
  },
]);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 10,
    },
  },
});

// biome-ignore lint/style/noNonNullAssertion: root 元素由 index.html 保证存在
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system">
      <TooltipProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>

        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
);
