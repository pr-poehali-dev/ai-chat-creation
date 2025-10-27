import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

const Index = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const API_URL = 'https://functions.poehali.dev/50c9483c-f0d8-4188-a362-4dc7ecc7d69a';

  const currentChat = chats.find(c => c.id === currentChatId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentChat?.messages]);

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'Новый чат',
      messages: [],
      createdAt: new Date()
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    if (!currentChatId) {
      createNewChat();
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setChats(prev => prev.map(chat => 
      chat.id === currentChatId 
        ? { 
            ...chat, 
            messages: [...chat.messages, userMessage],
            title: chat.messages.length === 0 ? input.trim().slice(0, 30) : chat.title
          }
        : chat
    ));

    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: userMessage.content
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', errorText);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('API response:', data);
      
      const aiContent = data.result?.ai_response?.content || data.result?.content || data.response || 'Не удалось получить ответ';
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date()
      };

      setChats(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, messages: [...chat.messages, assistantMessage] }
          : chat
      ));

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Извините, произошла ошибка при обращении к AI. Проверьте API ключ и попробуйте снова.',
        timestamp: new Date()
      };
      
      setChats(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, messages: [...chat.messages, errorMessage] }
          : chat
      ));
      
      toast({
        title: 'Ошибка',
        description: 'Не удалось отправить сообщение. Попробуйте снова.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChat = (chatId: string) => {
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }
  };

  useEffect(() => {
    if (chats.length === 0) {
      createNewChat();
    }
  }, []);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <aside 
        className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed md:relative z-50 md:z-0 w-64 md:w-64 transition-transform duration-300 bg-sidebar border-r border-sidebar-border flex flex-col h-full`}
      >
        <div className="p-4 border-b border-sidebar-border">
          <Button 
            onClick={createNewChat}
            className="w-full bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-accent-foreground"
          >
            <Icon name="Plus" size={18} className="mr-2" />
            Новый чат
          </Button>
        </div>
        
        <ScrollArea className="flex-1 p-2">
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`group flex items-center gap-2 p-3 mb-1 rounded-lg cursor-pointer transition-colors ${
                currentChatId === chat.id 
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                  : 'hover:bg-sidebar-accent/50'
              }`}
              onClick={() => setCurrentChatId(chat.id)}
            >
              <Icon name="MessageSquare" size={16} className="flex-shrink-0" />
              <span className="flex-1 truncate text-sm">{chat.title}</span>
              <Button
                size="icon"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100 h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(chat.id);
                }}
              >
                <Icon name="Trash2" size={14} />
              </Button>
            </div>
          ))}
        </ScrollArea>
      </aside>

      <main className="flex-1 flex flex-col w-full">
        <header className="h-14 border-b border-border flex items-center px-2 md:px-4 gap-2 md:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Icon name={isSidebarOpen ? 'PanelLeftClose' : 'PanelLeftOpen'} size={20} />
          </Button>
          <h1 className="text-lg font-semibold">MadAI 1.0</h1>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 md:p-4 space-y-4 md:space-y-6">
          {!currentChat || currentChat.messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4 max-w-md">
                <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
                  <Icon name="Sparkles" size={32} className="text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">Привет! Как я могу помочь?</h2>
                <p className="text-muted-foreground">
                  Начните новый разговор с AI-ассистентом
                </p>
              </div>
            </div>
          ) : (
            currentChat.messages.map(message => (
              <div 
                key={message.id}
                className={`fade-in flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-2 md:gap-3 max-w-3xl ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user' ? 'bg-primary' : 'bg-muted'
                  }`}>
                    <Icon 
                      name={message.role === 'user' ? 'User' : 'Bot'} 
                      size={16}
                      className={message.role === 'user' ? 'text-primary-foreground' : ''}
                    />
                  </div>
                  <div className={`px-3 py-2 md:px-4 md:py-3 rounded-2xl text-sm md:text-base ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="fade-in flex gap-4">
              <div className="flex gap-2 md:gap-3 max-w-3xl">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon name="Bot" size={16} />
                </div>
                <div className="px-3 py-2 md:px-4 md:py-3 rounded-2xl bg-muted">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-2 md:p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2 items-end">
              <Button
                size="icon"
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary hover:bg-primary/90 flex-shrink-0"
              >
                <Icon name="Send" size={18} />
              </Button>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Введите сообщение..."
                className="min-h-[40px] md:min-h-[48px] max-h-[120px] md:max-h-[200px] resize-none bg-muted border-muted-foreground/20 rounded-xl text-sm md:text-base"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;