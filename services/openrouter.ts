import { OpenRouter } from "@openrouter/sdk";
import type { AIService, ChatMessage } from './types';

const openrouter = new OpenRouter({
  apiKey: process.env['OPENROUTER_API_KEY']
});

export const openrouterService: AIService = {
  name: 'OpenRouter',
  async chat(messages: ChatMessage[]) {
    // OpenRouter SDK doesn't seem to have a clean way to get the native stream easily 
    // from the .send() method if it doesn't return an async iterator directly.
    // Looking at the previous code, it used for await on the result of .send().
    
    console.log('--- Llamando a OpenRouter ---');
    const stream = await openrouter.chat.send({
      model: "z-ai/glm-4.5-air:free",
      messages,
      stream: true
    });

    return (async function* () {
      for await (const chunk of stream as any) {
        yield chunk.choices[0]?.delta?.content || '';
      }
    })();
  }
};
