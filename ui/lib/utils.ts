import { settingsConfig } from "@/config/settings.ts";

export { cn } from "cn";
export const version: string | undefined = import.meta.env.APP_VERSION;
export const isBeta = version.split("-")[1] === "beta";
export const defaultLibrary: string = settingsConfig.library[0]!;
