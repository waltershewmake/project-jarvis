/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import hash from '@adonisjs/core/services/hash';
import router from '@adonisjs/core/services/router';
import { eq } from 'drizzle-orm';
import { db } from '#database/index';
import { User } from '#database/schema/user';

router.get('/', async () => {
  return {
    hello: 'world',
  };
});

router.post('login', async ({ request, auth, response }) => {
  const { email, password } = request.all();

  const [user] = await db.select().from(User).where(eq(User.email, email));

  if (user?.password && (await hash.verify(user.password, password))) {
    return await auth.use('jwt').generate({
      ...user,
    });
  }

  return response.unauthorized('Invalid email or password');
});
