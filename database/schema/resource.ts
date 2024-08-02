import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const Resource = pgTable('resource', {
  id: serial('id').primaryKey(),

  content: text('content'),
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
});
