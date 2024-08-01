import argon2 from 'argon2';
import { User } from '#database/schema/user';
import { DB } from '#database/seed-helpers';

export default async (db: DB) => {
  return db.insert(User).values({
    firstName: 'Walter',
    lastName: 'Shewmake',
    salutation: 'Mr.',
    email: 'waltershewmake@gmail.com',
    password: await argon2.hash('password', {
      version: 0x13,
      parallelism: 4,
      hashLength: 32,
    }),
  });
};
