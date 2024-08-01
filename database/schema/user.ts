import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const User = pgTable('user', {
  id: serial('id').primaryKey(),

  name: text('name').notNull(),
  email: text('email').notNull(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
});
