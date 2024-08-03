import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { User } from './user.js';

export const Conversation = pgTable('conversation', {
  id: serial('id').primaryKey(),
  ownerId: serial('owner_id').references(() => User.id),

  name: text('name'),
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
});
