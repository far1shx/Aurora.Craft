import { type JSX, type ReactNode, createContext, useContext, useEffect } from "react";
import { useSnapshot } from "valtio";
import { settingsConfig } from "@/config/settings";

type Theme = "dark" | "light" | "system";

const initialState: {
  theme: Theme;
  setTheme: (theme: Theme) => void;
} = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<typeof initialState>(initialState);

export const ThemeProvider = ({
  children,
  defaultTheme = "system",
  ...props
}: {
  children: ReactNode;
  defaultTheme?: Theme;
}): JSX.Element => {
  const { theme: storedTheme } = useSnapshot(settingsConfig);
  const theme = (storedTheme as Theme) || defaultTheme;

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    let cleanup = (): void => {};

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

      const applySystemTheme = (): void => {
        root.classList.remove("light", "dark");
        root.classList.add(mediaQuery.matches ? "dark" : "light");
      };

      applySystemTheme();

      mediaQuery.addEventListener("change", applySystemTheme);
      cleanup = (): void => {
        mediaQuery.removeEventListener("change", applySystemTheme);
      };
    } else {
      root.classList.add(theme);
    }

    return cleanup;
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme: Theme): void => {
      settingsConfig.theme = newTheme;
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = (): typeof initialState => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
