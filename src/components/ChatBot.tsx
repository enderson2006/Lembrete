import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Calendar, Clock, Check, Edit } from 'lucide-react';
import { ChatMessage, ParsedReminder } from '../types/reminder';
import { formatDate } from '../utils/reminderUtils';

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateReminder: (reminder: any, assignedUserIds: string[]) => void;
  selectedDate: string;
}

const ChatBot: React.FC<ChatBotProps> = ({
  isOpen,
  onClose,
  onCreateReminder,
  selectedDate,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingReminder, setPendingReminder] = useState<ParsedReminder | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Welcome message
      const welcomeMessage: ChatMessage = {
        id: '1',
        type: 'bot',
        content: '👋 Olá! Sou seu assistente de lembretes. Você pode me dizer coisas como:\n\n• "Me lembre de enviar o relatório amanhã às 10h"\n• "Criar lembrete para reunião na sexta às 14:30"\n• "Lembrar de ligar para o médico hoje às 16h"\n\nO que posso ajudar você a lembrar?',
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const parseNaturalLanguage = (text: string): ParsedReminder | null => {
    const lowerText = text.toLowerCase();
    
    // Extract title (everything before time/date indicators)
    let title = text;
    const timeIndicators = ['às', 'as', 'em', 'na', 'no', 'para', 'amanhã', 'hoje', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
    
    for (const indicator of timeIndicators) {
      const index = lowerText.indexOf(indicator);
      if (index > 0) {
        title = text.substring(0, index).trim();
        break;
      }
    }

    // Clean up title
    title = title.replace(/^(me lembre de|lembrar de|criar lembrete para|lembrete para|lembrete:)/i, '').trim();
    
    if (!title) {
      return null;
    }

    // Extract date
    let date = selectedDate;
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (lowerText.includes('amanhã')) {
      date = formatDate(tomorrow);
    } else if (lowerText.includes('hoje')) {
      date = formatDate(today);
    }

    // Extract time
    let time = '09:00';
    const timeRegex = /(\d{1,2}):?(\d{2})?\s*(h|horas?)?/g;
    const timeMatch = timeRegex.exec(lowerText);
    
    if (timeMatch) {
      const hours = timeMatch[1].padStart(2, '0');
      const minutes = timeMatch[2] || '00';
      time = `${hours}:${minutes}`;
    }

    // Alternative time formats
    const altTimeRegex = /(\d{1,2})\s*(h|horas?)/g;
    const altTimeMatch = altTimeRegex.exec(lowerText);
    if (altTimeMatch && !timeMatch) {
      const hours = altTimeMatch[1].padStart(2, '0');
      time = `${hours}:00`;
    }

    return {
      title,
      date,
      time,
      confidence: 0.8, // Simple confidence score
    };
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const parsed = parseNaturalLanguage(inputValue);
      
      if (parsed) {
        setPendingReminder(parsed);
        const botResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: `Entendi! Vou criar um lembrete para:\n\n📋 **${parsed.title}**\n📅 Data: ${new Date(parsed.date).toLocaleDateString('pt-BR')}\n🕐 Horário: ${parsed.time}\n\nEsta informação está correta?`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botResponse]);
      } else {
        const botResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: 'Desculpe, não consegui entender completamente. Tente ser mais específico, por exemplo:\n\n"Me lembre de enviar email amanhã às 14h"',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botResponse]);
      }
      
      setIsTyping(false);
    }, 1000);
  };

  const handleConfirmReminder = () => {
    if (!pendingReminder) return;

    const reminderData = {
      title: pendingReminder.title,
      description: `Criado via assistente: "${inputValue}"`,
      date: pendingReminder.date,
      time: pendingReminder.time,
      completed: false,
      notified: false,
      notification_enabled: true,
      assigned_to_user_id: null,
    };

    onCreateReminder(reminderData, []);
    setPendingReminder(null);

    const successMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'bot',
      content: '✅ Lembrete criado com sucesso! Você receberá uma notificação no horário programado.\n\nPosso ajudar com mais alguma coisa?',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, successMessage]);
  };

  const handleEditReminder = () => {
    setPendingReminder(null);
    const editMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'bot',
      content: 'Ok, vamos tentar novamente. Me diga como você gostaria que fosse o lembrete:',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, editMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-end justify-end p-4 z-50 pointer-events-none">
      <div className="card-glass w-96 h-[500px] flex flex-col animate-slide-in-right pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-glass">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full glass flex items-center justify-center">
              <Bot className="h-5 w-5" style={{ color: 'var(--neon-cyan)' }} />
            </div>
            <div>
              <h3 className="font-semibold transition-colors" style={{ color: 'var(--text-primary)' }}>
                Assistente de Lembretes
              </h3>
              <p className="text-xs transition-colors" style={{ color: 'var(--text-secondary)' }}>
                Online
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="glass-hover p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`chat-bubble ${message.type}`}>
                {message.type === 'bot' && (
                  <div className="flex items-center space-x-2 mb-2">
                    <Bot className="h-4 w-4" style={{ color: 'var(--neon-cyan)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Assistente
                    </span>
                  </div>
                )}
                <div className="whitespace-pre-wrap text-sm">
                  {message.content}
                </div>
              </div>
            </div>
          ))}

          {/* Pending Reminder Actions */}
          {pendingReminder && (
            <div className="flex justify-center space-x-2">
              <button
                onClick={handleConfirmReminder}
                className="btn-primary px-4 py-2 text-sm flex items-center space-x-2"
              >
                <Check className="h-4 w-4" />
                <span>Confirmar</span>
              </button>
              <button
                onClick={handleEditReminder}
                className="btn-neon px-4 py-2 text-sm flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>Editar</span>
              </button>
            </div>
          )}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="chat-bubble bot">
                <div className="flex items-center space-x-2">
                  <Bot className="h-4 w-4" style={{ color: 'var(--neon-cyan)' }} />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--neon-cyan)' }}></div>
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--neon-cyan)', animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--neon-cyan)', animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-glass">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite seu lembrete em linguagem natural..."
              className="input-glass flex-1 text-sm"
              disabled={isTyping}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="btn-primary p-2 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;