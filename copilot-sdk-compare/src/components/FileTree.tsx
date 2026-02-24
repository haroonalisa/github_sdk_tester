'use client';

import { useState, useEffect, useCallback } from 'react';
import { Folder, FolderOpen, File, Code, Database, FileText, ChevronRight, ChevronDown, X, Copy, Check } from 'lucide-react';

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

// ── File icon by extension ────────────────────────────────────────────────────
const FileIcon = ({ filename }: { filename: string }) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'ts': case 'tsx': case 'js': case 'jsx':
            return <Code className="w-4 h-4 text-yellow-400" />;
        case 'json':
            return <Database className="w-4 h-4 text-green-400" />;
        case 'md': case 'txt':
            return <FileText className="w-4 h-4 text-blue-400" />;
        case 'ino': case 'c': case 'cpp': case 'h':
            return <Code className="w-4 h-4 text-purple-400" />;
        default:
            return <File className="w-4 h-4 text-gray-400" />;
    }
};

// ── File viewer popup ─────────────────────────────────────────────────────────
const FileViewer = ({ filePath, onClose }: { filePath: string; onClose: () => void }) => {
    const [content, setContent] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`/api/files/content?path=${encodeURIComponent(filePath)}`)
            .then(r => r.json())
            .then(d => {
                if (d.error) setError(d.error);
                else { setContent(d.content); setName(d.name); }
            })
            .catch(e => setError(e.message));
    }, [filePath]);

    const handleCopy = () => {
        if (content) {
            navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    };

    // Close on backdrop click
    const onBackdrop = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onBackdrop}
        >
            <div className="relative flex flex-col bg-[#1e1e1e] rounded-xl shadow-2xl border border-gray-700 w-full max-w-3xl max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-gray-700 flex-shrink-0">
                    <span className="font-mono text-sm text-gray-200 truncate">{name || filePath}</span>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-700"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                {/* Content */}
                <div className="overflow-auto flex-1 p-4">
                    {error ? (
                        <p className="text-red-400 text-sm">{error}</p>
                    ) : content === null ? (
                        <p className="text-gray-400 text-sm animate-pulse">Loading…</p>
                    ) : (
                        <pre className="text-sm text-gray-200 font-mono whitespace-pre-wrap break-words leading-relaxed">
                            {content}
                        </pre>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Tree node ─────────────────────────────────────────────────────────────────
const TreeNode = ({
    node,
    level,
    onFileClick,
}: {
    node: FileNode;
    level: number;
    onFileClick: (path: string) => void;
}) => {
    const [isOpen, setIsOpen] = useState(true);
    const isDir = node.type === 'directory';

    return (
        <div className="w-full select-none">
            <div
                className="flex items-center py-[3px] px-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer text-sm text-gray-700 dark:text-gray-300 group"
                style={{ paddingLeft: `${8 + level * 14}px` }}
                onClick={() => isDir ? setIsOpen(o => !o) : onFileClick(node.path)}
            >
                {isDir ? (
                    <>
                        <span className="mr-1 text-gray-400">
                            {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </span>
                        {isOpen
                            ? <FolderOpen className="w-4 h-4 text-blue-400 mr-1.5 flex-shrink-0" />
                            : <Folder className="w-4 h-4 text-blue-400 mr-1.5 flex-shrink-0" />
                        }
                        <span className="font-medium truncate">{node.name}</span>
                    </>
                ) : (
                    <>
                        <span className="w-4 mr-1 flex-shrink-0" /> {/* indent spacer aligning with folder chevron */}
                        <span className="mr-1.5 flex-shrink-0"><FileIcon filename={node.name} /></span>
                        <span className="truncate group-hover:underline">{node.name}</span>
                        <span className="ml-auto text-xs text-gray-400 opacity-60 pl-2 flex-shrink-0">
                            {node.size < 1024 ? `${node.size}B` : `${(node.size / 1024).toFixed(1)}kb`}
                        </span>
                    </>
                )}
            </div>

            {isDir && isOpen && node.children && node.children.length > 0 && (
                <div className="border-l border-gray-200 dark:border-gray-700 ml-[20px]">
                    {node.children.map((child, idx) => (
                        <TreeNode key={idx} node={child} level={level + 1} onFileClick={onFileClick} />
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Main FileTree export ──────────────────────────────────────────────────────
export function FileTree({ sessionId, isPolling }: FileTreeProps) {
    const [tree, setTree] = useState<FileNode | null>(null);
    const [viewingFile, setViewingFile] = useState<string | null>(null);

    const fetchTree = useCallback(async () => {
        try {
            const res = await fetch(`/api/files?sessionId=${sessionId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.tree) setTree(data.tree);
            }
        } catch (e) {
            console.error('Failed to fetch file tree', e);
        }
    }, [sessionId]);

    useEffect(() => {
        fetchTree();
        if (!isPolling) return;
        const id = setInterval(fetchTree, 2000);
        return () => clearInterval(id);
    }, [fetchTree, isPolling]);

    // The API returns the session workspace as root. We render its children directly
    // so we don't show the sessionId folder itself — just its contents.
    const rootChildren = tree?.children ?? [];

    return (
        <>
            {viewingFile && (
                <FileViewer filePath={viewingFile} onClose={() => setViewingFile(null)} />
            )}
            {/* Polling indicator */}
            {isPolling && (
                <div className="flex items-center gap-2 px-4 py-2 text-xs text-gray-500 border-b border-gray-100 dark:border-gray-800">
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                    </span>
                    Agent is working…
                </div>
            )}
            {rootChildren.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-gray-400 p-4">
                    No files yet. Send a prompt to start.
                </div>
            ) : (
                <div className="p-2 overflow-y-auto h-full">
                    {rootChildren.map((child, idx) => (
                        <TreeNode
                            key={idx}
                            node={child}
                            level={0}
                            onFileClick={path => setViewingFile(path)}
                        />
                    ))}
                </div>
            )}
        </>
    );
}
