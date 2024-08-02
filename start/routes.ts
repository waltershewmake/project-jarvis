/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import hash from '@adonisjs/core/services/hash';
import router from '@adonisjs/core/services/router';
import { openai } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#database/index';
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

router
  .post('chat', async ({ request, auth, response }) => {
    const user = auth.getUserOrFail();
    const { message } = request.all();

    const result = await generateText({
      model: openai('gpt-4-turbo'),
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
      prompt: message,
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
            createResource({ content });
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
            const result = await findRelevantContent(question);
            console.log(result);
            return result;
          },
        }),
      },
    });

    return result.text;
  })
  .use(middleware.auth());
