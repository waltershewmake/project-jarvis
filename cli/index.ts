import { intro, text } from '@clack/prompts';
import axios from 'axios';
import { InferSelectModel } from 'drizzle-orm';
import jsonfile from 'jsonfile';
import type { User as UserSchema } from '#database/schema/user';

/**
 * Load session from `session.json` using jsonfile
 */
type Session = {
  type: 'bearer';
  token: string;
  expiresAt: number;
};

let session: Session;

try {
  session = jsonfile.readFileSync('./session.json');
} catch (error) {
  const email = await text({
    message: 'Enter your email',
    placeholder: 'john@doe.com',
  });
  const password = await text({
    message: 'Enter your password',
    placeholder: '********',
  });

  const response = await axios.post(
    'http://localhost:3333/login',
    {
      email,
      password,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  session = response.data;
  jsonfile.writeFileSync('./session.json', session);
}

/**
 * Initialize API client
 */
const client = axios.create({
  baseURL: 'http://localhost:3333',
  headers: {
    Authorization: `Bearer ${session.token}`,
  },
});

/**
 * Load user from API
 */
type User = InferSelectModel<typeof UserSchema>;
const { data: user } = await client.get<User>('/me');

intro(`Welcome, ${user.salutation} ${user.lastName}.`);
