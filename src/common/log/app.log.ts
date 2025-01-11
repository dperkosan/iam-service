import { createLogger, format, transports } from 'winston';
import getEnvVariable from '@common/utils/env.util';

const logger = createLogger({
  level: getEnvVariable('NODE_ENV') === 'development' ? 'debug' : 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }), // Include stack traces for errors
    format.json(), // Log in JSON format
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(), // Add colors to console logs
        format.simple(), // Simplify console log format
      ),
    }),
    new transports.File({ filename: 'logs/error.log', level: 'error' }), // Write errors to a file
    new transports.File({ filename: 'logs/combined.log' }), // Write all logs to a file
  ],
});

// Log unhandled exceptions
logger.exceptions.handle(
  new transports.File({ filename: 'logs/exceptions.log' }),
);

export default logger;
