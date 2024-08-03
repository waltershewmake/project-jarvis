import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const User = pgTable('user', {
  id: serial('id').primaryKey(),

  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  salutation: text('salutation').notNull(),
  email: text('email').notNull(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
});
