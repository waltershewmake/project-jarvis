import { errors, symbols } from '@adonisjs/auth';
import type { AuthClientResponse, GuardContract } from '@adonisjs/auth/types';
import type { HttpContext } from '@adonisjs/core/http';
import { type InferSelectModel, eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { db } from '#database/index';
import { User } from '#database/schema/user';

type User = InferSelectModel<typeof User>;

export type JwtGuardOptions = {
  secret: string;
};

export class JwtGuard implements GuardContract<User> {
  #ctx: HttpContext;
  #options: JwtGuardOptions;

  /**
   * A list of events and their types emitted by the guard.
   */
  declare [symbols.GUARD_KNOWN_EVENTS]: {};

  /**
   * A unique name for the guard driver
   */
  driverName = 'jwt' as const;

  /**
   * A flag to know if the authentication was an attempt
   * during the current HTTP request
   */
  authenticationAttempted = false;

  /**
   * A boolean to know if the current request has
   * been authenticated
   */
  isAuthenticated = false;

  /**
   * Reference to the currently authenticated user
   */
  user?: User;

  constructor(ctx: HttpContext, options: JwtGuardOptions) {
    this.#ctx = ctx;
    this.#options = options;
  }

  /**
   * Generate a JWT token for a given user.
   */
  async generate(user: User) {
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 1 week

    const token = jwt.sign(
      {
        userId: user.id,
        expiresAt,
      },
      this.#options.secret
    );

    return {
      type: 'bearer',
      token: token,
      expiresAt,
    };
  }

  /**
   * Authenticate the current HTTP request and return
   * the user instance if there is a valid JWT token
   * or throw an exception
   */
  async authenticate(): Promise<User> {
    /**
     * Avoid re-authentication when the request has already
     * been authenticated
     */
    if (this.authenticationAttempted) {
      return this.getUserOrFail();
    }
    this.authenticationAttempted = true;

    /**
     * Ensure the auth header exists
     */
    const authHeader = this.#ctx.request.header('Authorization');
    if (!authHeader) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Missing Authorization header', {
        guardDriverName: this.driverName,
      });
    }

    /**
     * Split the header value and read the token from it
     */
    const [, token] = authHeader.split('Bearer ');
    if (!token) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Invalid Authorization header', {
        guardDriverName: this.driverName,
      });
    }

    /**
     * Verify token
     */
    const payload = jwt.verify(token, this.#options.secret);
    if (typeof payload !== 'object' || !('userId' in payload)) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
        guardDriverName: this.driverName,
      });
    }

    /**
     * Ensure token is not expired
     */
    if (!payload.expiresAt || payload.expiresAt < Date.now()) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
        guardDriverName: this.driverName,
      });
    }

    /**
     * Get User
     */
    const [user] = await db
      .select()
      .from(User)
      .where(eq(User.id, payload.userId));

    if (!user) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
        guardDriverName: this.driverName,
      });
    }

    /**
     * Save the user
     */
    this.user = user;

    return this.getUserOrFail();
  }

  /**
   * Same as authenticate, but does not throw an exception
   */
  async check(): Promise<boolean> {
    /**
     * Same as aythenticate, but does not throw an exception
     */
    try {
      await this.authenticate();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Returns the authenticated user or throws an error
   */
  getUserOrFail(): User {
    if (!this.user) {
      throw new errors.E_UNAUTHORIZED_ACCESS('User is not authenticated', {
        guardDriverName: this.driverName,
      });
    }
    return this.user;
  }

  async authenticateAsClient(user: User): Promise<AuthClientResponse> {
    const token = await this.generate(user);
    return {
      headers: {
        authorization: `Bearer ${token.token}`,
      },
    };
  }
}
