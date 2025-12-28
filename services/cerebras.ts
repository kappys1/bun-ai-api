import Cerebras from '@cerebras/cerebras_cloud_sdk';
import type { AIService, ChatMessage } from './types';

const cerebras = new Cerebras({
  apiKey: process.env['CEREBRAS_API_KEY']
});

export const cerebrasService: AIService = {
  name: 'Cerebras',
  async chat(messages: ChatMessage[]) {
    console.log('--- Llamando a Cerebras ---');
    const stream = await (cerebras.chat.completions.create({
      messages: messages as any,
      model: 'zai-glm-4.6',
      stream: true,
      max_completion_tokens: 40960,
      temperature: 0.6,
      top_p: 0.95
    }) as any);

    return (async function* () {
      for await (const chunk of stream) {
        yield chunk.choices[0]?.delta?.content || '';
      }
    })();
  }
};
