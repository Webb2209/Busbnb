import pino from 'pino';
import { env } from '../config/env';

const isProduction = env.NODE_ENV === 'production';

// VULN-02/Ops Fix: Structured JSON logger for production
export const logger = pino({
  level: isProduction ? 'info' : 'debug',
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }),
});
