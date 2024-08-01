import { defineConfig } from '@adonisjs/auth';
import type { Authenticators, InferAuthEvents } from '@adonisjs/auth/types';
import { JwtGuard } from '#auth/guards/access-token';
import env from '#env';

const jwtConfig = {
  secret: env.get('APP_KEY'),
};

const authConfig = defineConfig({
  default: 'jwt',
  guards: {
    jwt: (ctx) => new JwtGuard(ctx, jwtConfig),
  },
});

export default authConfig;

/**
 * Inferring types from the configured auth
 * guards.
 */
declare module '@adonisjs/auth/types' {
  interface Authenticators extends InferAuthenticators<typeof authConfig> {}
}
declare module '@adonisjs/core/types' {
  interface EventsList extends InferAuthEvents<Authenticators> {}
}
