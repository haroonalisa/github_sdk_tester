import { NextResponse } from 'next/server';
import { CopilotClient } from '@github/copilot-sdk';
import { getVendorKeys } from '@/lib/config';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes to allow big agentic changes

export async function POST(req: Request) {
    console.log("[DEBUG] Inbound POST request received for /api/chat/copilot");
    try {
        const { messages, model, vendor, sessionId } = await req.json();
        const vendorKeys = getVendorKeys();

        if (!vendorKeys[vendor] && vendor !== 'github') {
            return NextResponse.json({ error: `Missing BYOK for ${vendor}` }, { status: 401 });
        }

        const effectiveSessionId = sessionId || 'default';
        const workspaceDir = path.join(process.cwd(), 'tmp', effectiveSessionId);
        if (!fs.existsSync(workspaceDir)) {
            fs.mkdirSync(workspaceDir, { recursive: true });
        }

        // Initialize Copilot Client
        const clientOptions: any = {
            logLevel: 'debug'
        };
        if (vendor === 'github' && vendorKeys['github']) {
            clientOptions.githubToken = vendorKeys['github'];
        }

        const client = new CopilotClient(clientOptions);

        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            async start(controller) {
                const sendStream = (type: string, content: string) => {
                    const chunk = `data: ${JSON.stringify({ type, content })}\n\n`;
                    controller.enqueue(encoder.encode(chunk));
                };
                try {
                    const sessionOptions: any = {
                        model: model || 'gpt-4o',
                        streaming: true,
                        workingDirectory: workspaceDir,
                    };

                    // If it is BYOK (like OpenAI or Google), use the provider object
                    if (vendor === 'openai' || vendor === 'google' || vendor === 'anthropic') {
                        let providerType = vendor === 'google' ? 'openai' : vendor;
                        let baseUrl;
                        if (vendor === 'openai') baseUrl = 'https://api.openai.com/v1';
                        // Google Gemini offers OpenAI compatibility mode at this specific path mapping
                        const origin = req.headers.get('origin') || `http://${req.headers.get('host') || 'localhost:3000'}`;
                        if (vendor === 'google') baseUrl = `${origin}/api/chat/google-shim`;

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
                            sendStream("content", content);
                        }
                    });

                    // Listen to tool events for Agentic 'thinking' replacement
                    session.on('tool.execution_start', (event: any) => {
                        const toolName = event.data?.toolName || 'tool';
                        sendStream("status", `Running ${toolName}...`);
                    });

                    session.on('tool.execution_complete', (event: any) => {
                        sendStream("status", ''); // Clear status
                    });

                    const lastUserMessage = messages[messages.length - 1]?.content || "Hello";

                    const finalEvent = await session.sendAndWait({
                        prompt: lastUserMessage
                    }, 120000); // Wait up to 2 minutes for the agent to finish complex tasks

                    // Fallback: If no streaming chunks were emitted (due to BYOK wrapper constraints),
                    // output the fully buffered message at the end.
                    if (!hasStreamed && finalEvent?.data?.content) {
                        sendStream("content", finalEvent.data.content);
                    }

                    await session.destroy();
                    controller.close();
                } catch (e: any) {
                    console.error('Error in session:', e);
                    sendStream("error", `Error formatting stream: ${e.message || 'Unknown CLI Error'}`);
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
