import EventEmitter from 'node:events';
import { intro, isCancel, password, spinner, text } from '@clack/prompts';
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

  // try to login to make sure the session is valid
  await axios.get('http://localhost:3333/me', {
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
  });
} catch (error) {
  const email = await text({
    message: 'Enter your email',
    placeholder: 'john@doe.com',
  });
  const _password = await password({
    message: 'Enter your password',
  });

  const response = await axios.post(
    'http://localhost:3333/login',
    {
      email,
      password: _password,
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

intro(
  `Welcome, ${user.salutation} ${user.lastName}. How may I assist you today?`
);

EventEmitter.setMaxListeners(Number.POSITIVE_INFINITY);

let conversationId: number | undefined = undefined;

while (true) {
  const input = await text({
    message: 'Type a message',
    validate: (input) => {
      if (input.length === 0) return 'Please enter a message';
    },
  });

  if (isCancel(input)) {
    process.exit(0);
  }

  const s = spinner();

  s.start('Thinking...');
  try {
    const response = (await client.post('/chat', {
      message: input,
      conversationId,
    })) as { data: { message: string; conversationId: number } };
    conversationId = response.data.conversationId;
    // s.stop(JSON.stringify(response.data.message));
    s.stop(response.data.message);
  } catch (error) {
    s.stop(error.response.data.message ?? 'Something went wrong');
  }
}
