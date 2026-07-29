import pino, { type Logger } from 'pino';

let logger: Logger | null = null;

export function getLogger(): Logger {
  if (logger) return logger;

  const isProd = process.env.NODE_ENV === 'production';
  const level = process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug');

  if (isProd) {
    logger = pino({ level });
  } else {
    logger = pino({
      level,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard' },
      },
    });
  }

  return logger;
}

export function resetLoggerForTests(): void {
  logger = null;
}
