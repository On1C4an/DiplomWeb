import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import {
  Account,
  type Account as AccountType,
  Client,
  Databases,
  type Databases as DatabasesType,
  type Models,
  Storage,
  Storage as StorageType,
  type Users as UsersType,
} from 'node-appwrite';
import 'server-only';

import { AUTH_COOKIE } from '@/features/auth/constants';

type AdditionalContext = {
  Variables: {
    account: AccountType;
    databases: DatabasesType;
    storage: StorageType;
    users: UsersType;
    user: Models.User<Models.Preferences>;
  };
};

export const sessionMiddleware = createMiddleware<AdditionalContext>(async (ctx, next) => {
  console.log('>>>> sessionMiddleware: Started');
  const client = new Client().setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!).setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);

  const session = getCookie(ctx, AUTH_COOKIE);
  console.log('>>>> sessionMiddleware: Session cookie found:', !!session);

  if (!session) {
    console.log('>>>> sessionMiddleware: No session found, returning 401');
    return ctx.json({ error: 'Unauthorized.' }, 401);
  }

  client.setSession(session);

  const account = new Account(client);
  const databases = new Databases(client);
  const storage = new Storage(client);

  try {
    console.log('>>>> sessionMiddleware: Attempting to get user account');
    const user = await account.get();
    console.log('>>>> sessionMiddleware: User account obtained successfully:', user.$id);

    ctx.set('account', account);
    ctx.set('databases', databases);
    ctx.set('storage', storage);
    ctx.set('user', user);

    console.log('>>>> sessionMiddleware: Continuing to next handler');
    await next();
  } catch (error: unknown) {
    console.error('>>>> sessionMiddleware: Error getting user account:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get user account';
    const errorStatus = (error as any).status || 401;
    return ctx.json({ error: `Authentication failed: ${errorMessage}` }, errorStatus);
  }
});
