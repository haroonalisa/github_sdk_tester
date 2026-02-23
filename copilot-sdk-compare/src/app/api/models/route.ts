import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { CopilotClient } from '@github/copilot-sdk';

export async function GET() {
  try {
    // Basic hardcoded models based on the GitHub Copilot SDK documentation
    // In a production app, Copilot SDK should list models dynamically.
    const models = [
      { id: 'gpt-4o', name: 'GPT-4o (OpenAI)', vendor: 'openai' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (OpenAI)', vendor: 'openai' },
      { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (Anthropic)', vendor: 'anthropic' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Google)', vendor: 'google' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Google)', vendor: 'google' }
    ];

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
  }
}
