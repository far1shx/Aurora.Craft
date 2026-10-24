export interface Logger {
  info: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  child: (...names: string[]) => Logger;
}

function createLogger(...names: string[]): Logger {
  const prefix = names.length > 0 ? `[${names.join(":")}] ` : "";

  return {
    info: (msg: string, ...args: unknown[]): void => console.log(`${prefix}${msg}`, ...args),
    error: (msg: string, ...args: unknown[]): void => console.error(`${prefix}${msg}`, ...args),
    warn: (msg: string, ...args: unknown[]): void => console.warn(`${prefix}${msg}`, ...args),
    child: (...childNames: string[]): Logger => createLogger(...names, ...childNames),
  };
}

export { createLogger };
