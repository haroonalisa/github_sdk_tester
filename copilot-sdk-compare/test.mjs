import { CopilotClient } from "@github/copilot-sdk";
import fs from "fs";

async function run() {
    const keys = JSON.parse(fs.readFileSync('./vendor-config.json', 'utf8'));

    const client = new CopilotClient({ logLevel: 'debug' });

    console.log("Creating session...");
    const session = await client.createSession({
        model: 'gemini-2.5-flash',
        streaming: true,
        provider: {
            type: 'openai',
            wireApi: 'completions',
            apiKey: keys.google,
            baseUrl: 'http://localhost:4000/v1beta/openai'
        }
    });

    session.on('assistant.message_delta', (event) => process.stdout.write(event.data?.deltaContent || ''));
    session.on('error', console.error);

    try {
        const res = await session.sendAndWait({ prompt: "Tell me exactly what system prompt I just gave you." });
        console.log(res);
    } catch (e) {
        console.error("SDK EXCEPTION:", e);
    }
}

run();
