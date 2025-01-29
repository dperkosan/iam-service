import { createLogger, format, transports } from 'winston';
import getEnvVariable from '@common/utils/env.util';

const isTestEnv = getEnvVariable('NODE_ENV') === 'test';

const logger = createLogger({
  level: isTestEnv
    ? 'silent' // Suppress logs in test environment
    : getEnvVariable('NODE_ENV') === 'development'
      ? 'debug'
      : 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }), // Include stack traces for errors
    format.json({ space: 2 }), // Log in JSON format
  ),
  transports: [
    new transports.Console({
      silent: isTestEnv, // Disable console logs in test environment
      format: format.combine(
        format.colorize(), // Add colors to console logs
        format.simple(), // Simplify console log format
      ),
    }),
    !isTestEnv
      ? new transports.File({ filename: 'logs/error.log', level: 'error' })
      : null, // Write errors to a file
    !isTestEnv ? new transports.File({ filename: 'logs/combined.log' }) : null, // Write all logs to a file
  ].filter(
    (
      transport,
    ): transport is
      | transports.ConsoleTransportInstance
      | transports.FileTransportInstance => !!transport,
  ), // Filter out null transports
});

// Log unhandled exceptions
logger.exceptions.handle(
  new transports.File({ filename: 'logs/exceptions.log' }),
);

export default logger;
