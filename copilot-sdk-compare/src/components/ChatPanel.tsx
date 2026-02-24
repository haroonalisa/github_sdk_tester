import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatPanelProps {
    title: string;
    messages: Message[];
    isLoading: boolean;
    loadingText?: string;
}

export function ChatPanel({ title, messages, isLoading, loadingText }: ChatPanelProps) {
    return (
        <div className="flex flex-col w-full h-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{title}</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-gray-400">
                        Send a prompt to start the comparison
                    </div>
                ) : (
                    messages.map((m, i) => (
                        <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div
                                className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${m.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-bl-none'
                                    }`}
                            >
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            code(props: any) {
                                                const { children, className, node, ...rest } = props;
                                                const match = /language-(\w+)/.exec(className || '');
                                                const isBlock = String(children).includes('\n');

                                                if (match) {
                                                    return (
                                                        <div className="rounded-md overflow-hidden my-2 border border-gray-200 dark:border-gray-700 shadow-sm bg-[#1e1e1e]">
                                                            <div className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs py-1.5 px-3 border-b border-gray-200 dark:border-gray-700 font-mono">
                                                                {match[1]}
                                                            </div>
                                                            <SyntaxHighlighter
                                                                style={vscDarkPlus as any}
                                                                language={match[1]}
                                                                PreTag="div"
                                                                customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
                                                            >
                                                                {String(children).replace(/\n$/, '')}
                                                            </SyntaxHighlighter>
                                                        </div>
                                                    );
                                                } else if (isBlock) {
                                                    return (
                                                        <div className="rounded-md overflow-hidden my-2 border border-gray-200 dark:border-gray-700 shadow-sm bg-[#1e1e1e]">
                                                            <SyntaxHighlighter
                                                                style={vscDarkPlus as any}
                                                                PreTag="div"
                                                                customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
                                                            >
                                                                {String(children).replace(/\n$/, '')}
                                                            </SyntaxHighlighter>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <code className="bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded px-1.5 py-0.5 font-mono text-sm break-words" {...rest}>
                                                        {children}
                                                    </code>
                                                );
                                            }
                                        }}
                                    >
                                        {m.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ))
                )}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-gray-800 text-gray-500 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-none p-4 shadow-sm animate-pulse">
                            {loadingText || "Thinking..."}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
