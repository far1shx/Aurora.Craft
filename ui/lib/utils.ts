export { cn } from "cn";
export const version: string | undefined = import.meta.env.APP_VERSION;
export const isBeta = version.split("-")[1] === "beta";
