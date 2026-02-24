import { NextRequest, NextResponse } from 'next/server';

// Man-in-the-middle proxy for Google's OpenAI shim to strip invalid JSON typings
export async function POST(req: NextRequest, { params }: { params: { path: string[] } } | any) {
    try {
        const pathSegments = req.nextUrl.pathname.replace('/api/chat/google-shim', '');
        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/openai${pathSegments}`;

        const body = await req.json();

        // Google's OpenAI shim throws a 400 "Value is not a string: null" error
        // when the Copilot Agentic CLI sends an assistant message with `content: null`.
        if (body.messages && Array.isArray(body.messages)) {
            body.messages = body.messages.map((msg: any) => {
                if (msg.role === 'assistant') {
                    if (msg.content === null) {
                        msg.content = ""; // Google strictly wants a string
                    }
                    if (msg.refusal === null) {
                        delete msg.refusal;
                    }
                }
                return msg;
            });
        }

        const headers: any = {
            'Content-Type': 'application/json'
        };
        const auth = req.headers.get('authorization');
        if (auth) headers['Authorization'] = auth;

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        const outHeaders = new Headers();
        response.headers.forEach((val, key) => {
            const k = key.toLowerCase();
            if (k !== 'content-encoding' && k !== 'transfer-encoding') {
                outHeaders.set(key, val);
            }
        });

        return new NextResponse(response.body, {
            status: response.status,
            headers: outHeaders
        });
    } catch (e: any) {
        console.error("Shim Error", e);
        return new NextResponse(`Shim Error: ${e.message}`, { status: 500 });
    }
}
