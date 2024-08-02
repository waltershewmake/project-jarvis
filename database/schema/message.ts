import { pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { Conversation } from '#database/schema/conversation';

export const RoleEnum = pgEnum('role', ['user', 'assistant', 'system']);

export const Message = pgTable('message', {
  id: serial('id').primaryKey(),
  conversationId: serial('conversation_id').references(() => Conversation.id),

  role: RoleEnum('role').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
});
