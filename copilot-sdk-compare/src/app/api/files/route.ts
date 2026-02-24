import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getDirectoryTree(dirPath: string): any {
    const stats = fs.statSync(dirPath);
    const info = {
        path: dirPath,
        name: path.basename(dirPath),
        type: stats.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        children: [] as any[]
    };

    if (stats.isDirectory()) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            // Ignore hidden directories to prevent bloat
            if (file.startsWith('.')) continue;
            const childPath = path.join(dirPath, file);
            info.children.push(getDirectoryTree(childPath));
        }
        // sort so directories are first
        info.children.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'directory' ? -1 : 1;
        });
    }

    return info;
}

export async function GET(req: Request) {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
        return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    try {
        const workspaceDir = path.join(process.cwd(), 'tmp', sessionId);

        if (!fs.existsSync(workspaceDir)) {
            return NextResponse.json({ tree: null });
        }

        const tree = getDirectoryTree(workspaceDir);
        return NextResponse.json({ tree });
    } catch (e: any) {
        console.error("Error reading directory:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
