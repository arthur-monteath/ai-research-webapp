// app/api/gpt/route.ts
import { NextRequest } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    // Validate that messages is an array
    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages format', { status: 400 });
    }

    const abortController = new AbortController();

    const stream = await openai.chat.completions.create(
      {
        model: 'gpt-4o', // Or 'gpt-3.5-turbo'
        messages: messages,
        stream: true,
      },
      {
        signal: abortController.signal, // Pass the abort signal here
      }
    );

    const encoder = new TextEncoder();

    const streamResponse = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            controller.enqueue(encoder.encode(content));
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
      cancel() {
        abortController.abort(); // Abort the OpenAI request on cancellation
      },
    });

    return new Response(streamResponse, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in API route:', error);
    return new Response('Failed to process the request', { status: 500 });
  }
}
