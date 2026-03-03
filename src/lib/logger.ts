const shouldLogDebug = import.meta.env.DEV || import.meta.env.VITE_LOG_LEVEL === 'debug';

export const logger = {
  debug: (...args: unknown[]) => {
    if (shouldLogDebug) {
      console.debug(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (shouldLogDebug) {
      console.info(...args);
    }
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
