import { NextResponse } from 'next/server';
import { CopilotClient } from '@github/copilot-sdk';
import { getVendorKeys } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
    console.log("[DEBUG] Inbound POST request received for /api/chat/copilot");
    try {
        const { messages, model, vendor } = await req.json();
        const vendorKeys = getVendorKeys();

        if (!vendorKeys[vendor] && vendor !== 'github') {
            return NextResponse.json({ error: `Missing BYOK for ${vendor}` }, { status: 401 });
        }

        // Initialize Copilot Client
        const clientOptions: any = {};
        if (vendor === 'github' && vendorKeys['github']) {
            clientOptions.githubToken = vendorKeys['github'];
        }

        const client = new CopilotClient(clientOptions);

        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            async start(controller) {
                try {
                    const sessionOptions: any = {
                        model: model || 'gpt-4o',
                        streaming: true,
                    };

                    // If it is BYOK (like OpenAI or Google), use the provider object
                    if (vendor === 'openai' || vendor === 'google' || vendor === 'anthropic') {
                        let providerType = vendor === 'google' ? 'openai' : vendor;
                        let baseUrl;
                        if (vendor === 'openai') baseUrl = 'https://api.openai.com/v1';
                        // Google Gemini offers OpenAI compatibility mode at this specific path mapping
                        if (vendor === 'google') baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai';

                        sessionOptions.provider = {
                            type: providerType,
                            wireApi: "completions",
                            apiKey: vendorKeys[vendor],
                            baseUrl: baseUrl
                        };
                    }

                    const session = await client.createSession(sessionOptions);

                    // Listen to events for streaming
                    let hasStreamed = false;
                    session.on('assistant.message_delta', (event: any) => {
                        const content = event.data?.deltaContent || '';
                        if (content) {
                            hasStreamed = true;
                            controller.enqueue(encoder.encode(content));
                        }
                    });

                    const lastUserMessage = messages[messages.length - 1]?.content || "Hello";

                    const finalEvent = await session.sendAndWait({
                        prompt: lastUserMessage
                    }, 120000); // Wait up to 2 minutes for the agent to finish complex tasks

                    // Fallback: If no streaming chunks were emitted (due to BYOK wrapper constraints),
                    // output the fully buffered message at the end.
                    if (!hasStreamed && finalEvent?.data?.content) {
                        controller.enqueue(encoder.encode(finalEvent.data.content));
                    }

                    await session.destroy();
                    controller.close();
                } catch (e: any) {
                    console.error('Error in session:', e);
                    controller.enqueue(encoder.encode(`\n\n**Error formatting stream:** ${e.message || 'Unknown CLI Error'}`));
                    controller.close();
                }
            },
        });

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error: any) {
        console.error('Copilot API error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
