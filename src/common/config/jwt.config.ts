import getEnvVariable from '@common/utils/env.util';

const jwtConfig = {
  secret: getEnvVariable('JWT_SECRET'),
  audience: getEnvVariable('JWT_TOKEN_AUDIENCE'),
  issuer: getEnvVariable('JWT_TOKEN_ISSUER'),
  accessTokenTtl: parseInt(
    getEnvVariable('JWT_ACCESS_TOKEN_TTL') ?? '3600',
    10,
  ),
  refreshTokenTtl: parseInt(
    getEnvVariable('JWT_REFRESH_TOKEN_TTL') ?? '86400',
    10,
  ),
  emailVerificationTokenTtl: parseInt(
    getEnvVariable('JWT_EMAIL_VERIFICATION_TOKEN_TTL') ?? '2592000',
    10,
  ),
  forgottenPasswordTokenTtl: parseInt(
    getEnvVariable('JWT_FORGOTTEN_PASSWORD_TOKEN_TTL') ?? '2592000',
    10,
  ),
};

export default jwtConfig;
