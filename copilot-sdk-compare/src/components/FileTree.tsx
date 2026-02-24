'use client';

import { useState, useEffect } from 'react';
import { Folder, File, Code, Database, FileText, ChevronRight, ChevronDown } from 'lucide-react';

interface FileNode {
    path: string;
    name: string;
    type: 'file' | 'directory';
    size: number;
    children?: FileNode[];
}

interface FileTreeProps {
    sessionId: string;
    isPolling: boolean;
}

const FileIcon = ({ filename }: { filename: string }) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'ts':
        case 'tsx':
        case 'js':
        case 'jsx':
            return <Code className="w-4 h-4 text-yellow-500" />;
        case 'json':
            return <Database className="w-4 h-4 text-green-500" />;
        case 'md':
        case 'txt':
            return <FileText className="w-4 h-4 text-blue-500" />;
        default:
            return <File className="w-4 h-4 text-gray-400" />;
    }
};

const TreeNode = ({ node, level = 0 }: { node: FileNode; level?: number }) => {
    const [isOpen, setIsOpen] = useState(true);
    const isDir = node.type === 'directory';

    if (node.name === 'tmp' && level === 0 && node.children) {
        // Skip rendering the root 'tmp' and 'sessionId' folders directly
        return (
            <div className="w-full">
                {node.children.map((child, idx) => (
                    <TreeNode key={idx} node={child} level={level} />
                ))}
            </div>
        );
    }

    // Also skip rendering the sessionId folder itself
    if (level === 0 && isDir && node.children) {
        return (
            <div className="w-full">
                {node.children.map((child, idx) => (
                    <TreeNode key={idx} node={child} level={level} />
                ))}
            </div>
        );
    }

    return (
        <div className="w-full select-none" style={{ paddingLeft: `${level * 12}px` }}>
            <div
                className="flex items-center py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 roundedcursor-pointer text-sm text-gray-700 dark:text-gray-300"
                onClick={() => isDir && setIsOpen(!isOpen)}
            >
                {isDir ? (
                    <div className="flex items-center">
                        {isOpen ? <ChevronDown className="w-3 h-3 mr-1 opacity-50" /> : <ChevronRight className="w-3 h-3 mr-1 opacity-50" />}
                        <Folder className="w-4 h-4 text-blue-400 mr-2" />
                        <span className="font-medium">{node.name}</span>
                    </div>
                ) : (
                    <div className="flex items-center pl-4">
                        <FileIcon filename={node.name} />
                        <span className="ml-2">{node.name}</span>
                        <span className="ml-auto text-xs text-gray-400 opacity-50">
                            {(node.size / 1024).toFixed(1)}kb
                        </span>
                    </div>
                )}
            </div>

            {isDir && isOpen && node.children && (
                <div className="mt-0.5 border-l border-gray-200 dark:border-gray-800 ml-3">
                    {node.children.map((child, idx) => (
                        <TreeNode key={idx} node={child} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};

export function FileTree({ sessionId, isPolling }: FileTreeProps) {
    const [tree, setTree] = useState<FileNode | null>(null);

    const fetchTree = async () => {
        try {
            const res = await fetch(`/api/files?sessionId=${sessionId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.tree) {
                    setTree(data.tree);
                }
            }
        } catch (e) {
            console.error("Failed to fetch file tree", e);
        }
    };

    useEffect(() => {
        fetchTree();

        let interval: NodeJS.Timeout;
        if (isPolling) {
            interval = setInterval(fetchTree, 2000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [sessionId, isPolling]);

    if (!tree || (tree.children && tree.children.length === 0)) {
        return null; // Don't show empty workspaces
    }

    return (
        <div className="w-full mt-4 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-gray-50 dark:bg-[#252526] px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                <span>Agent Workspace Files</span>
                {isPolling && (
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                )}
            </div>
            <div className="p-2 overflow-y-auto max-h-64 scrollbar-thin">
                <TreeNode node={tree} />
            </div>
        </div>
    );
}
