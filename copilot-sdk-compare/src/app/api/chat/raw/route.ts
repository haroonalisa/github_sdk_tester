import { NextResponse } from 'next/server';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getVendorKeys } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { messages, model, vendor } = await req.json();
        const vendorKeys = getVendorKeys();

        if (!vendorKeys[vendor]) {
            return NextResponse.json({ error: `Missing BYOK for ${vendor}` }, { status: 401 });
        }

        let aiModel;

        // Choose the right provider SDK based on the vendor
        if (vendor === 'openai') {
            const openai = createOpenAI({
                apiKey: vendorKeys['openai'],
            });
            aiModel = openai(model);
        } else if (vendor === 'google') {
            const google = createGoogleGenerativeAI({
                apiKey: vendorKeys['google'],
            });
            aiModel = google(model);
        } else {
            return NextResponse.json({ error: `Unsupported raw vendor: ${vendor}` }, { status: 400 });
        }

        // Use standard Vercel AI SDK stream
        const result = await streamText({
            model: aiModel,
            messages,
        });

        return result.toTextStreamResponse();
    } catch (error: any) {
        console.error('Raw Model API error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
