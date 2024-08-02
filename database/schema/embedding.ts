import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  vector,
} from 'drizzle-orm/pg-core';
import { Resource } from '#database/schema/resource';
import { User } from '#database/schema/user';

export const Embedding = pgTable(
  'embedding',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => User.id),
    resourceId: integer('resource_id').references(() => Resource.id),

    embedding: vector('embedding', { dimensions: 768 }),
    content: text('content'),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    embeddingIndex: index('embedding_index').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops')
    ),
  })
);
