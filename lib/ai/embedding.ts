import { openai } from '@ai-sdk/openai';
import { embed, embedMany } from 'ai';
import { cosineDistance, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#database/index';
import { Embedding } from '#database/schema/embedding';
import { Resource } from '#database/schema/resource';

const embeddingModel = openai.embedding('text-embedding-3-small');

const generateChunks = (input: string): string[] => {
  return input
    .trim()
    .split('.')
    .filter((i) => i !== '');
};

export const generateEmbeddings = async (
  value: string
): Promise<Array<{ embedding: number[]; content: string }>> => {
  const chunks = generateChunks(value);

  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks,
  });

  return embeddings.map((e, i) => ({
    content: chunks[i],
    embedding: e,
  }));
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll('\\n', ' ');
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });
  return embedding;
};

export const findRelevantContent = async (userQuery: string) => {
  const userQueryEmbedded = await generateEmbedding(userQuery);
  const similarity = sql<number>`1 - (${cosineDistance(
    Embedding.embedding,
    userQueryEmbedded
  )})`;
  const similarGuides = await db
    .select({ name: Embedding.content, similarity })
    .from(Embedding)
    // .where(gt(similarity, 0.5))
    .orderBy((t) => desc(t.similarity))
    .limit(10);

  return similarGuides;
};

export const createResource = async (input: {
  content: string;
}) => {
  try {
    const { content } = z
      .object({
        content: z.string().min(1),
      })
      .parse(input);

    const [resource] = await db
      .insert(Resource)
      .values({ content })
      .returning();

    const embeddings = await generateEmbeddings(content);

    await db.insert(Embedding).values(
      embeddings.map((embedding) => ({
        resourceId: resource.id,
        ...embedding,
      }))
    );

    return 'Resource successfully created and embedded.';
  } catch (e) {
    if (e instanceof Error)
      return e.message.length > 0 ? e.message : 'Error, please try again.';
  }
};
