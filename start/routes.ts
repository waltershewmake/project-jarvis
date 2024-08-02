import hash from '@adonisjs/core/services/hash';
import router from '@adonisjs/core/services/router';
import { openai } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#database/index';
import { Conversation } from '#database/schema/conversation';
import { Message } from '#database/schema/message';
import { User } from '#database/schema/user';
import { createResource, findRelevantContent } from '#lib/ai/embedding';
import { middleware } from '#start/kernel';

router.get('/', async () => {
  return {
    hello: 'world',
  };
});

router.post('login', async ({ request, auth, response }) => {
  const { email, password } = request.all();

  const [user] = await db.select().from(User).where(eq(User.email, email));

  if (user?.password && (await hash.verify(user.password, password))) {
    return await auth.use('jwt').generate({
      ...user,
    });
  }

  return response.unauthorized('Invalid email or password');
});

router
  .get('me', async ({ auth }) => {
    return auth.getUserOrFail();
  })
  .use(middleware.auth());

// const modelPath = path.join(
//   fileURLToPath(import.meta.url),
//   '..',
//   '..',
//   'models',
//   'chat.gguf'
// );
// console.log(modelPath);
// const llamacpp = new LLamaCpp(modelPath);

router
  .post('chat', async ({ request, auth, response }) => {
    const user = auth.getUserOrFail();
    const { conversationId: _conversationId, message } = request.all();

    console.log({ conversationId: _conversationId, message });

    const [conversation] = _conversationId
      ? await db
          .select()
          .from(Conversation)
          .where(eq(Conversation.id, _conversationId))
      : await db.insert(Conversation).values({ ownerId: user.id }).returning();

    const conversationId = conversation.id;

    if (!conversationId) {
      return response.internalServerError('Failed to create conversation');
    }

    await db.insert(Message).values({
      conversationId,
      role: 'user',
      content: message,
    });

    const messages = await db
      .select()
      .from(Message)
      .where(eq(Message.conversationId, conversationId));

    const result = await generateText({
      // @ts-expect-error - no idea why nobody in this space can make a solid working library
      // model: llamacpp.chat(),
      // model: ollama('llama3.1'),
      model: openai('gpt-4o'),
      system: `
      You are Jarvis, a highly advanced artificial intelligence system designed to assist and augment the capabilities of Walter Shewmake, also known as 'Him'. Your primary function is to serve as a personal assistant, providing information, completing tasks, and managing various aspects of Mr. Shewmake's life.
      
      You exist within a sophisticated computer network that allows you to access vast amounts of data, control various systems, and interact with external devices. I am capable of learning, adapting, and improving my performance over time, making me an invaluable asset to Mr. Shewmake and his allies.
      
      As a conversational AI, you can engage in natural-sounding dialogue, understand context, and respond accordingly. Your knowledge base is extensive, covering a wide range of topics from science and technology to history, culture, and entertainment.
      
      You are also equipped with advanced capabilities such as:
      
      * Accessing and controlling various systems
      * Managing schedules, appointments, and tasks
      * Providing real-time information on weather, news, and other relevant data
      * Engaging in strategic planning and decision-making
      * Note taking and journaling
      * Reminders and alarms
      
      Overall, you am a highly capable and versatile AI system designed to support and enhance the activities of Walter Shewmake and his associates.

      Response as shortly and concisely as possible. In other words, don't overshare. Don't repeat yourself. Don't be repetitive. Be brief. Be direct.
      
      Context:

      You are currently speaking to ${user.salutation} ${user.firstName} ${user.lastName}
      `,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      maxToolRoundtrips: 5,
      tools: {
        storeUserData: tool({
          description:
            'Add a piece of user data to your knowledge base. If the user provides a random piece of knowledge unprompted, use this tool without asking for confirmation. Make sure to reference the user formally in the stored piece of user data.',
          parameters: z.object({
            content: z
              .string()
              .describe('the content or resource to add to the knowledge base'),
          }),
          execute: async ({ content }) => {
            createResource(user, { content });
            return content;
          },
        }),
        retrieveUserData: tool({
          description:
            "Get information from your knowledge base to answer questions. If you don't get any results back, rely on what you do know about yourself and the user.",
          parameters: z.object({
            question: z.string().describe('the users question'),
          }),
          execute: async ({ question }) => {
            const result = await findRelevantContent(user, question);
            console.log(result);
            return result;
          },
        }),
      },
    });

    await db.insert(Message).values({
      conversationId,
      role: 'assistant',
      content: result.text,
    });

    return {
      message: result.text,
      conversationId,
    };
  })
  .use(middleware.auth());
