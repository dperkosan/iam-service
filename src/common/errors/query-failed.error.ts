import { QueryFailedError } from 'typeorm';

/**
 * Interface extending QueryFailedError to include the "code" property.
 */
export interface QueryFailedErrorWithCode extends QueryFailedError {
  code: string;
}

/**
 * Type guard to check if an error is a QueryFailedError with a "code" property.
 */
export const isQueryFailedErrorWithCode = (
  error: unknown,
): error is QueryFailedErrorWithCode => {
  return (
    error instanceof QueryFailedError &&
    typeof (error as QueryFailedErrorWithCode).code === 'string'
  );
};
