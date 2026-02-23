'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Settings, ArrowRightLeft } from 'lucide-react';
import { ChatPanel } from '@/components/ChatPanel';

interface Model {
  id: string;
  name: string;
  vendor: string;
}

export default function Home() {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);

  const [input, setInput] = useState('');

  // Independent chat states
  const [copilotMessages, setCopilotMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [rawMessages, setRawMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);

  const [isCopilotLoading, setIsCopilotLoading] = useState(false);
  const [isRawLoading, setIsRawLoading] = useState(false);

  useEffect(() => {
    // Fetch available models
    fetch('/api/models')
      .then(res => res.json())
      .then(data => {
        if (data.models && data.models.length > 0) {
          setModels(data.models);
          setSelectedModel(data.models[0]);
        }
      })
      .catch(err => console.error("Failed to fetch models", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedModel) return;

    const userMessage = { role: 'user' as const, content: input.trim() };
    const currentInput = input.trim();

    setInput('');

    setCopilotMessages(prev => [...prev, userMessage]);
    setRawMessages(prev => [...prev, userMessage]);

    setIsCopilotLoading(true);
    setIsRawLoading(true);

    const payload = {
      messages: [...copilotMessages, userMessage],
      model: selectedModel.id,
      vendor: selectedModel.vendor
    };

    const fetchCopilot = async () => {
      try {
        const copilotRes = await fetch('/api/chat/copilot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!copilotRes.ok) throw new Error(await copilotRes.text());
        const reader = copilotRes.body?.getReader();
        const decoder = new TextDecoder();

        setCopilotMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        if (reader) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const text = decoder.decode(value, { stream: true });

              setCopilotMessages(prev => {
                const newMsgs = [...prev];
                const lastIdx = newMsgs.length - 1;
                newMsgs[lastIdx] = {
                  ...newMsgs[lastIdx],
                  content: newMsgs[lastIdx].content + text
                };
                return newMsgs;
              });
            }
          } catch (e: any) {
            console.warn("Copilot reader interrupted:", e);
            setCopilotMessages(prev => {
              const newMsgs = [...prev];
              const lastIdx = newMsgs.length - 1;
              newMsgs[lastIdx] = {
                ...newMsgs[lastIdx],
                content: newMsgs[lastIdx].content + `\n\n[Connection Interrupted]`
              };
              return newMsgs;
            });
          }
        }
      } catch (err: any) {
        console.error(err);
        setCopilotMessages(prev => {
          const newMsgs = [...prev];
          const lastIdx = newMsgs.length - 1;
          if (lastIdx >= 0 && newMsgs[lastIdx].role === 'assistant') {
            newMsgs[lastIdx] = { ...newMsgs[lastIdx], content: newMsgs[lastIdx].content + `\n\n**Error:** ${err.message}` };
            return newMsgs;
          }
          return [...newMsgs, { role: 'assistant', content: `**Error:** ${err.message}` }];
        });
      } finally {
        setIsCopilotLoading(false);
      }
    };

    // 2. Trigger Raw Model Stream
    const fetchRaw = async () => {
      try {
        const rawRes = await fetch('/api/chat/raw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!rawRes.ok) throw new Error(await rawRes.text());
        const reader = rawRes.body?.getReader();
        const decoder = new TextDecoder();

        setRawMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        if (reader) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const text = decoder.decode(value, { stream: true });

              setRawMessages(prev => {
                const newMsgs = [...prev];
                const lastIdx = newMsgs.length - 1;
                newMsgs[lastIdx] = {
                  ...newMsgs[lastIdx],
                  content: newMsgs[lastIdx].content + text
                };
                return newMsgs;
              });
            }
          } catch (e: any) {
            console.warn("Reader stream interrupted:", e);
            setRawMessages(prev => {
              const newMsgs = [...prev];
              const lastIdx = newMsgs.length - 1;
              newMsgs[lastIdx] = {
                ...newMsgs[lastIdx],
                content: newMsgs[lastIdx].content + `\n\n[Connection Interrupted]`
              };
              return newMsgs;
            });
          }
        }
      } catch (err: any) {
        console.error(err);
        setRawMessages(prev => {
          const newMsgs = [...prev];
          const lastIdx = newMsgs.length - 1;
          if (lastIdx >= 0 && newMsgs[lastIdx].role === 'assistant') {
            newMsgs[lastIdx] = { ...newMsgs[lastIdx], content: newMsgs[lastIdx].content + `\n\n**Error:** ${err.message}` };
            return newMsgs;
          }
          return [...newMsgs, { role: 'assistant', content: `**Error:** ${err.message || 'Failed to fetch raw API'}` }];
        });
      } finally {
        setIsRawLoading(false);
      }
    };

    // Launch both fetch engines consistently
    fetchCopilot();
    fetchRaw();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-black font-sans">

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <ArrowRightLeft className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
              Copilot vs. Raw API
            </h1>
            <p className="text-xs text-gray-500">Agentic Workflow vs Direct Inference</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">Model:</label>
            <div className="relative">
              <select
                className="appearance-none bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 text-sm rounded-lg pr-10 pl-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium min-w-[200px]"
                value={selectedModel?.id || ''}
                onChange={(e) => {
                  const model = models.find(m => m.id === e.target.value);
                  if (model) setSelectedModel(model);
                }}
              >
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
          <button className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Panels */}
      <main className="flex-1 flex flex-col md:flex-row gap-4 p-4 lg:p-6 overflow-hidden min-h-0">
        <div className="flex-1 flex min-w-0">
          <ChatPanel
            title="GitHub Copilot Agentic SDK"
            messages={copilotMessages}
            isLoading={isCopilotLoading}
          />
        </div>
        <div className="flex-1 flex min-w-0">
          <ChatPanel
            title="Raw AI Model (Direct SDK)"
            messages={rawMessages}
            isLoading={isRawLoading}
          />
        </div>
      </main>

      {/* Input Area */}
      <footer className="p-4 lg:p-6 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative group flex flex-col">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          <div className="relative flex items-end gap-2 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-2 shadow-inner">
            <textarea
              className="flex-1 w-full bg-transparent border-none text-gray-800 dark:text-gray-200 outline-none placeholder-gray-400 focus:ring-0 resize-none max-h-32 min-h-[56px] py-3 px-4 text-base"
              placeholder="Ask both models to perform a complex technical task..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || (isCopilotLoading && isRawLoading)}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3.5 rounded-xl transition-all shadow-md m-1 flex items-center justify-center h-[50px] w-[50px] flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-xs text-gray-500 mt-3 font-medium">
            Requests are sent simultaneously to {selectedModel ? selectedModel.name : 'the selected model'}. Ensure your <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">vendor-config.json</code> has the required BYOK.
          </p>
        </form>
      </footer>
    </div>
  );
}
