import { CopilotClient } from '@github/copilot-sdk';
import { getVendorKeys } from './src/lib/config';
import fs from 'fs';

async function main() {
    console.log("Starting SDK debug...");
    const keys = JSON.parse(fs.readFileSync('./vendor-config.json', 'utf8'));

    const client = new CopilotClient({
        logLevel: 'trace'
    });

    try {
        const sessionOptions: any = {
            model: 'gemini-2.5-flash',
            streaming: true,
            provider: {
                type: 'openai',
                wireApi: 'completions',
                apiKey: keys.google,
                baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai'
            }
        };

        console.log("Creating Session...");
        const session = await client.createSession(sessionOptions);

        session.on('assistant.message_delta', (event) => console.log("DELTA:", event.data?.deltaContent));
        session.on('tool.execution_start', (event) => console.log("TOOL_START:", event.data?.toolName));
        session.on('error', (err) => console.log("ERROR EVENT:", err));

        console.log("Sending prompt...");
        const res = await session.sendAndWait({
            prompt: "Create an ESP32 arduino code for PID motor"
        }, 120000);

        console.log("DONE");
    } catch (e: any) {
        console.error("SDK EXCEPTION:", e);
    }
}

main().catch(console.error);
