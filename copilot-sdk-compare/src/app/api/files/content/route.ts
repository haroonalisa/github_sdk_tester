import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const filePath = url.searchParams.get('path');

    if (!filePath) {
        return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    // Restrict to tmp directory only
    const tmpDir = path.join(process.cwd(), 'tmp');
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(tmpDir)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    try {
        const content = fs.readFileSync(resolved, 'utf-8');
        return NextResponse.json({ content, path: resolved, name: path.basename(resolved) });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
