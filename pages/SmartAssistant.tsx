import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, WorkOrder, Asset, WorkOrderPart, InventoryPart } from '../types';
import { complexDiagnostics, searchMaintenanceKnowledge, queryAppAssistant } from '../services/geminiService';
import { Send, Bot, User, Globe, BrainCircuit, Loader2, Sparkles, Database } from 'lucide-react';

interface SmartAssistantProps {
  workOrders?: WorkOrder[];
  assets?: Asset[];
  partsUsed?: WorkOrderPart[];
  inventoryParts?: InventoryPart[];
}

export const SmartAssistant: React.FC<SmartAssistantProps> = ({ 
  workOrders = [], 
  assets = [], 
  partsUsed = [], 
  inventoryParts = [] 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'model', text: 'สวัสดีค่ะ เบลพร้อมช่วยค้นหาข้อมูลงานซ่อม คู่มือ หรือวิเคราะห์ปัญหาค่ะ ถามมาได้เลยนะคะ!' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'search' | 'database' | 'thinking'>('database');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    // 1. Add User Message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue
    };
    const updatedMessages = [...messages, userMsg]; // รวมข้อความล่าสุด
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      let responseText = '';
      let sources: string[] = [];

      if (mode === 'search') {
        // Google Search Grounding
        const result = await searchMaintenanceKnowledge(userMsg.text);
        responseText = result.text;
        sources = result.sources.map(s => s.uri);
      } 
      else if (mode === 'database') {
        // ✅ Internal App Query (with Memory)
        // แปลง Format ให้ตรงกับ Google Generative AI SDK
        const historyForAI = updatedMessages
            .filter(m => m.role === 'user' || m.role === 'model')
            .map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

        responseText = await queryAppAssistant(
            userMsg.text, 
            historyForAI as any, // ส่งประวัติการคุยไปด้วย
            { workOrders, assets, partsUsed, inventoryParts }
        );
      } 
      else {
        // Deep Thinking Mode
        responseText = await complexDiagnostics("Industrial Maintenance Environment", userMsg.text);
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        isThinking: mode === 'thinking',
        groundingUrls: sources
      };
      setMessages(prev => [...prev, aiMsg]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "ขอโทษค่ะ เบลเกิดข้อผิดพลาดในการประมวลผล ลองใหม่อีกครั้งนะคะ"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">ผู้ช่วยอัจฉริยะ (Belle)</h2>
            <p className="text-xs text-slate-500">Powered by Gemini 1.5 Pro</p>
          </div>
        </div>

        <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
           <button
            onClick={() => setMode('database')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${mode === 'database' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Database size={14} />
            ฐานข้อมูลภายใน
          </button>
          <button
            onClick={() => setMode('search')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${mode === 'search' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Globe size={14} />
            ค้นหาคู่มือ (Web)
          </button>
          <button
            onClick={() => setMode('thinking')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${mode === 'thinking' ? 'bg-purple-50 text-purple-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <BrainCircuit size={14} />
            วิเคราะห์เชิงลึก
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-blue-100 text-blue-600'}`}>
              {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
            </div>
            <div className={`max-w-[85%] md:max-w-[70%] p-3 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
            }`}>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</div>
              
              {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                    <Globe size={12} /> แหล่งข้อมูลอ้างอิง:
                  </p>
                  <ul className="space-y-1">
                    {msg.groundingUrls.map((url, idx) => (
                      <li key={idx}>
                        <a href={url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline truncate block max-w-xs">
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {msg.isThinking && (
                 <div className="mt-2 flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full w-fit">
                    <BrainCircuit size={12} />
                    <span>ใช้โหมดการคิดวิเคราะห์ (Deep Thinking)</span>
                 </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
           <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
               <Bot size={18} />
             </div>
             <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2 text-slate-500 text-sm">
               <Loader2 className="animate-spin" size={16} />
               {mode === 'database' ? 'กำลังค้นหาข้อมูลในระบบ...' : mode === 'search' ? 'กำลังค้นหาข้อมูลจากเว็บ...' : 'กำลังวิเคราะห์ปัญหา...'}
             </div>
           </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={
                mode === 'database' ? "ถามเกี่ยวกับงานซ่อม, อะไหล่ เช่น 'มีงานค้างที่โรงเรือน 1 ไหม?'" :
                mode === 'search' ? "ค้นหาคู่มือ วิธีซ่อม หรือสเปคเครื่องจักร..." : 
                "ถามปัญหาซับซ้อน เช่น 'มอเตอร์ร้อนจัดเกิดจากอะไร?'"
            }
            className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
            className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 text-center">
            Mode: {mode === 'database' ? 'Internal Data Access' : mode === 'search' ? 'Google Search Grounding' : 'Deep Reasoning'}
        </p>
      </div>
    </div>
  );
};