import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';

interface User {
  id: number;
  username: string;
  avatar?: string;
}

interface Listing {
  id: number;
  userId: number;
  username: string;
  title: string;
  description: string;
  imageUrl?: string;
  createdAt: string;
}

interface Message {
  id: number;
  fromUserId: number;
  toUserId: number;
  content: string;
  replyToId?: number;
  createdAt: string;
}

interface Chat {
  userId: number;
  username: string;
  lastMessage: string;
  unreadCount: number;
}

const Index = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [activeTab, setActiveTab] = useState('home');
  const [listings, setListings] = useState<Listing[]>([]);
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [newListing, setNewListing] = useState({ title: '', description: '', imageUrl: '' });
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem('rotrade_user');
    if (user) {
      setCurrentUser(JSON.parse(user));
      setShowAuth(false);
      loadListings();
      loadChats();
    }
  }, []);

  useEffect(() => {
    if (!showAuth) {
      const interval = setInterval(() => {
        checkNewMessages();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [showAuth, chats]);

  const handleAuth = () => {
    if (!username || !password) {
      toast.error('Заполните все поля');
      return;
    }

    const users = JSON.parse(localStorage.getItem('rotrade_users') || '[]');
    
    if (authMode === 'register') {
      if (users.find((u: User) => u.username === username)) {
        toast.error('Это имя уже занято');
        return;
      }
      
      const newUser: User = {
        id: Date.now(),
        username,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
      };
      
      users.push(newUser);
      localStorage.setItem('rotrade_users', JSON.stringify(users));
      localStorage.setItem('rotrade_user', JSON.stringify(newUser));
      setCurrentUser(newUser);
      setShowAuth(false);
      toast.success('Регистрация успешна!');
    } else {
      const user = users.find((u: User) => u.username === username);
      if (user) {
        localStorage.setItem('rotrade_user', JSON.stringify(user));
        setCurrentUser(user);
        setShowAuth(false);
        toast.success('Вход выполнен!');
      } else {
        toast.error('Неверные данные');
      }
    }
  };

  const loadListings = () => {
    const saved = localStorage.getItem('rotrade_listings');
    if (saved) {
      setListings(JSON.parse(saved));
    }
  };

  const loadChats = () => {
    if (!currentUser) return;
    const allMessages = JSON.parse(localStorage.getItem('rotrade_messages') || '[]');
    const userChats = new Map<number, Chat>();
    
    allMessages.forEach((msg: Message) => {
      const otherUserId = msg.fromUserId === currentUser.id ? msg.toUserId : msg.fromUserId;
      if (msg.fromUserId === currentUser.id || msg.toUserId === currentUser.id) {
        const users = JSON.parse(localStorage.getItem('rotrade_users') || '[]');
        const otherUser = users.find((u: User) => u.id === otherUserId);
        
        if (otherUser) {
          userChats.set(otherUserId, {
            userId: otherUserId,
            username: otherUser.username,
            lastMessage: msg.content,
            unreadCount: 0
          });
        }
      }
    });
    
    setChats(Array.from(userChats.values()));
  };

  const checkNewMessages = () => {
    if (!currentUser) return;
    const allMessages = JSON.parse(localStorage.getItem('rotrade_messages') || '[]');
    const newMessages = allMessages.filter((msg: Message) => 
      msg.toUserId === currentUser.id && 
      !messages.find(m => m.id === msg.id)
    );
    
    if (newMessages.length > 0) {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuByvLaizsIGGS36eahUQ4QUqzn77BdGAg+ltryxngsBSh+zPDYjT0JGW26...');
      audio.play();
      toast.success('Новое сообщение!');
      loadChats();
    }
  };

  const handleImageUpload = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
        reject(new Error('Только PNG и JPG форматы'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleListingImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const imageUrl = await handleImageUpload(file);
      setNewListing({ ...newListing, imageUrl });
      toast.success('Изображение загружено!');
    } catch (error) {
      toast.error('Ошибка загрузки изображения');
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    
    try {
      const avatar = await handleImageUpload(file);
      const updatedUser = { ...currentUser, avatar };
      
      const users = JSON.parse(localStorage.getItem('rotrade_users') || '[]');
      const userIndex = users.findIndex((u: User) => u.id === currentUser.id);
      if (userIndex !== -1) {
        users[userIndex] = updatedUser;
        localStorage.setItem('rotrade_users', JSON.stringify(users));
        localStorage.setItem('rotrade_user', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        toast.success('Аватар обновлён!');
      }
    } catch (error) {
      toast.error('Ошибка загрузки аватара');
    }
  };

  const createListing = () => {
    if (!currentUser || !newListing.title || !newListing.description) {
      toast.error('Заполните все поля');
      return;
    }

    const listing: Listing = {
      id: Date.now(),
      userId: currentUser.id,
      username: currentUser.username,
      title: newListing.title,
      description: newListing.description,
      imageUrl: newListing.imageUrl || 'https://images.unsplash.com/photo-1614680376739-414d95ff43df?w=400',
      createdAt: new Date().toISOString()
    };

    const updated = [...listings, listing];
    setListings(updated);
    localStorage.setItem('rotrade_listings', JSON.stringify(updated));
    setNewListing({ title: '', description: '', imageUrl: '' });
    setShowCreateListing(false);
    toast.success('Объявление создано!');
  };

  const removeListing = (id: number) => {
    const updated = listings.filter(l => l.id !== id);
    setListings(updated);
    localStorage.setItem('rotrade_listings', JSON.stringify(updated));
    toast.success('Объявление удалено');
  };

  const startChat = (userId: number) => {
    setActiveChat(userId);
    setActiveTab('chats');
    loadMessages(userId);
  };

  const loadMessages = (userId: number) => {
    if (!currentUser) return;
    const allMessages = JSON.parse(localStorage.getItem('rotrade_messages') || '[]');
    const chatMessages = allMessages.filter((msg: Message) =>
      (msg.fromUserId === currentUser.id && msg.toUserId === userId) ||
      (msg.fromUserId === userId && msg.toUserId === currentUser.id)
    );
    setMessages(chatMessages);
  };

  const sendMessage = () => {
    if (!currentUser || !activeChat || !messageInput) return;

    const message: Message = {
      id: Date.now(),
      fromUserId: currentUser.id,
      toUserId: activeChat,
      content: messageInput,
      replyToId: replyToId || undefined,
      createdAt: new Date().toISOString()
    };

    const allMessages = JSON.parse(localStorage.getItem('rotrade_messages') || '[]');
    allMessages.push(message);
    localStorage.setItem('rotrade_messages', JSON.stringify(allMessages));
    setMessages([...messages, message]);
    setMessageInput('');
    setReplyToId(null);
    toast.success('Сообщение отправлено');
  };

  const logout = () => {
    localStorage.removeItem('rotrade_user');
    setCurrentUser(null);
    setShowAuth(true);
    setActiveTab('home');
  };

  if (showAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              RoTrade
            </h1>
            <p className="text-muted-foreground">Торговая площадка Roblox</p>
          </div>
          
          <div className="space-y-4">
            <Input
              placeholder="Имя пользователя"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
            />
            <Button onClick={handleAuth} className="w-full">
              {authMode === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </Button>
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {authMode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Есть аккаунт? Войти'}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            RoTrade
          </h1>
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarImage src={currentUser?.avatar} />
              <AvatarFallback>{currentUser?.username[0]}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{currentUser?.username}</span>
            <Button variant="outline" size="sm" onClick={logout}>
              <Icon name="LogOut" size={16} />
            </Button>
          </div>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="container mx-auto px-4 py-8">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="home">
            <Icon name="Home" size={16} className="mr-2" />
            Главная
          </TabsTrigger>
          <TabsTrigger value="listings">
            <Icon name="Package" size={16} className="mr-2" />
            Объявления
          </TabsTrigger>
          <TabsTrigger value="chats">
            <Icon name="MessageSquare" size={16} className="mr-2" />
            Чаты
            {chats.length > 0 && (
              <Badge className="ml-2" variant="secondary">{chats.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="profile">
            <Icon name="User" size={16} className="mr-2" />
            Профиль
          </TabsTrigger>
        </TabsList>

        <TabsContent value="home">
          <div className="space-y-6">
            <div className="text-center py-12">
              <h2 className="text-4xl font-bold mb-4">Добро пожаловать в RoTrade</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Безопасная торговая площадка для Roblox предметов
              </p>
              <Button size="lg" onClick={() => setActiveTab('listings')}>
                Смотреть объявления
              </Button>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {listings.slice(0, 3).map((listing) => (
                <Card key={listing.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <img
                    src={listing.imageUrl}
                    alt={listing.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-bold mb-2">{listing.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {listing.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{listing.username}</span>
                      <Button size="sm" onClick={() => startChat(listing.userId)}>
                        Связаться
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="listings">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Все объявления</h2>
              <Button onClick={() => setShowCreateListing(true)}>
                <Icon name="Plus" size={16} className="mr-2" />
                Создать объявление
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <Card key={listing.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <img
                    src={listing.imageUrl}
                    alt={listing.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-bold mb-2">{listing.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {listing.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{listing.username}</span>
                      {listing.userId === currentUser?.id ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeListing(listing.id)}
                        >
                          Удалить
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => startChat(listing.userId)}>
                          Связаться
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="chats">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 p-4">
              <h3 className="font-bold mb-4">Чаты</h3>
              <div className="space-y-2">
                {chats.map((chat) => (
                  <button
                    key={chat.userId}
                    onClick={() => {
                      setActiveChat(chat.userId);
                      loadMessages(chat.userId);
                    }}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      activeChat === chat.userId ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    }`}
                  >
                    <div className="font-medium">{chat.username}</div>
                    <div className="text-sm opacity-70 truncate">{chat.lastMessage}</div>
                  </button>
                ))}
                {chats.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Нет активных чатов
                  </p>
                )}
              </div>
            </Card>

            <Card className="md:col-span-2 p-4 flex flex-col h-[600px]">
              {activeChat ? (
                <>
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.fromUserId === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            msg.fromUserId === currentUser?.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {msg.replyToId && (
                            <div className="text-xs opacity-70 mb-1 border-l-2 pl-2">
                              Ответ на сообщение
                            </div>
                          )}
                          <p>{msg.content}</p>
                          <button
                            onClick={() => setReplyToId(msg.id)}
                            className="text-xs opacity-70 hover:opacity-100 mt-1"
                          >
                            Ответить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {replyToId && (
                    <div className="bg-muted p-2 rounded mb-2 flex justify-between items-center">
                      <span className="text-sm">Ответ на сообщение</span>
                      <Button size="sm" variant="ghost" onClick={() => setReplyToId(null)}>
                        <Icon name="X" size={14} />
                      </Button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Input
                      placeholder="Сообщение..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    />
                    <Button onClick={sendMessage}>
                      <Icon name="Send" size={16} />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  Выберите чат
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profile">
          <Card className="max-w-2xl mx-auto p-8">
            <div className="text-center space-y-6">
              <div className="relative w-24 h-24 mx-auto">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={currentUser?.avatar} />
                  <AvatarFallback className="text-2xl">{currentUser?.username[0]}</AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                  <Icon name="Camera" size={16} />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              <div>
                <h2 className="text-2xl font-bold">{currentUser?.username}</h2>
                <p className="text-muted-foreground">ID: {currentUser?.id}</p>
              </div>
              <div className="pt-6 border-t">
                <h3 className="font-bold mb-4">Правила и условия</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  RoTrade — это платформа для размещения объявлений о скупке предметов в Roblox.
                  Все сделки осуществляются напрямую между пользователями.
                </p>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="font-bold text-destructive">
                    ⚠️ САЙТ НЕ РУЧАЕТСЯ ЗА СДЕЛКИ
                  </p>
                  <p className="text-sm mt-2">
                    Администрация не несет ответственности за результаты сделок между пользователями.
                    Будьте внимательны при обмене!
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateListing} onOpenChange={setShowCreateListing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать объявление</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Название"
              value={newListing.title}
              onChange={(e) => setNewListing({ ...newListing, title: e.target.value })}
            />
            <Textarea
              placeholder="Описание"
              value={newListing.description}
              onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
              rows={4}
            />
            <div className="space-y-2">
              <label className="block text-sm font-medium">Изображение</label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleListingImageChange}
                  className="flex-1"
                />
              </div>
              {newListing.imageUrl && (
                <img
                  src={newListing.imageUrl}
                  alt="Предпросмотр"
                  className="w-full h-32 object-cover rounded-lg"
                />
              )}
            </div>
            <Button onClick={createListing} className="w-full">
              Создать
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <footer className="border-t border-border mt-12 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            © 2024 RoTrade. Торговая площадка для Roblox
          </p>
          <p className="text-xs text-destructive font-bold">
            ⚠️ САЙТ НЕ РУЧАЕТСЯ ЗА СДЕЛКИ
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;