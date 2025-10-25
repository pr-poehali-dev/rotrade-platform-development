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
  createdAt?: string;
  rating?: number;
  reviewsCount?: number;
}

interface Listing {
  id: number;
  userId: number;
  username: string;
  title: string;
  description: string;
  imageUrl?: string;
  gameUrl?: string;
  gameName?: string;
  createdAt: string;
  views?: number;
  expiresAt: string;
}

interface Review {
  id: number;
  fromUserId: number;
  fromUsername: string;
  toUserId: number;
  rating: number;
  comment: string;
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

interface Report {
  id: number;
  reporterId: number;
  reporterUsername: string;
  reportedUserId?: number;
  reportedUsername?: string;
  listingId?: number;
  listingTitle?: string;
  reason: string;
  createdAt: string;
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
  const [newListing, setNewListing] = useState({ title: '', description: '', imageUrl: '', gameUrl: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showReportListingDialog, setShowReportListingDialog] = useState(false);
  const [reportListingId, setReportListingId] = useState<number | null>(null);
  const [reportListingReason, setReportListingReason] = useState('');
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<number[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);

  const SUPPORT_ACCOUNT_NAME = 'RoTradeAc';

  useEffect(() => {
    const user = localStorage.getItem('rotrade_user');
    if (user) {
      setCurrentUser(JSON.parse(user));
      setShowAuth(false);
      loadListings();
      loadChats();
      loadBlockedUsers();
      loadReports();
      loadReviews();
      const savedSound = localStorage.getItem('rotrade_sound_enabled');
      if (savedSound !== null) {
        setSoundEnabled(JSON.parse(savedSound));
      }
    }
  }, []);

  useEffect(() => {
    if (!showAuth) {
      const messagesInterval = setInterval(() => {
        checkNewMessages();
      }, 3000);
      
      const listingsInterval = setInterval(() => {
        loadListings();
      }, 1000);
      
      const chatsInterval = setInterval(() => {
        loadChats();
      }, 2000);
      
      const reviewsInterval = setInterval(() => {
        loadReviews();
      }, 5000);
      
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'rotrade_listings') {
          loadListings();
        }
        if (e.key === 'rotrade_messages') {
          loadChats();
          if (activeChat) {
            loadMessages(activeChat);
          }
        }
        if (e.key === 'rotrade_reviews') {
          loadReviews();
        }
        if (e.key === 'rotrade_reports') {
          loadReports();
        }
      };
      
      const handleFocus = () => {
        loadListings();
        loadChats();
        loadReviews();
        if (activeChat) {
          loadMessages(activeChat);
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('focus', handleFocus);
      
      return () => {
        clearInterval(messagesInterval);
        clearInterval(listingsInterval);
        clearInterval(chatsInterval);
        clearInterval(reviewsInterval);
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [showAuth, chats, activeChat]);

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
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        createdAt: new Date().toISOString(),
        rating: 0,
        reviewsCount: 0
      };
      
      users.push(newUser);
      localStorage.setItem('rotrade_users', JSON.stringify(users));
      window.dispatchEvent(new StorageEvent('storage', { key: 'rotrade_users' }));
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
      const allListings: Listing[] = JSON.parse(saved);
      const now = new Date();
      const validListings = allListings.filter(listing => {
        const expiresAt = new Date(listing.expiresAt);
        return expiresAt > now;
      });
      
      if (validListings.length !== allListings.length) {
        localStorage.setItem('rotrade_listings', JSON.stringify(validListings));
      }
      
      setListings(validListings);
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
    
    if (newMessages.length > 0 && soundEnabled) {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuByvLaizsIGGS36eahUQ4QUqzn77BdGAg+ltryxngsBSh+zPDYjT0JGW26...');
      audio.play();
      toast.success('Новое сообщение!');
      loadChats();
    }
  };

  const loadBlockedUsers = () => {
    if (!currentUser) return;
    const blocked = JSON.parse(localStorage.getItem(`rotrade_blocked_${currentUser.id}`) || '[]');
    setBlockedUsers(blocked);
  };

  const loadReports = () => {
    if (!currentUser) return;
    const allReports = JSON.parse(localStorage.getItem('rotrade_reports') || '[]');
    setReports(allReports);
  };

  const loadReviews = () => {
    const allReviews = JSON.parse(localStorage.getItem('rotrade_reviews') || '[]');
    setReviews(allReviews);
  };

  const extractGameName = (url: string): string | null => {
    try {
      const match = url.match(/\/games\/\d+\/([^/?]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1].replace(/-/g, ' '));
      }
      return null;
    } catch {
      return null;
    }
  };

  const getTimeSinceRegistration = (createdAt?: string): string => {
    if (!createdAt) return 'Недавно';
    const now = new Date();
    const registered = new Date(createdAt);
    const diffMs = now.getTime() - registered.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffYears > 0) return `${diffYears} ${diffYears === 1 ? 'год' : diffYears < 5 ? 'года' : 'лет'}`;
    if (diffMonths > 0) return `${diffMonths} ${diffMonths === 1 ? 'месяц' : diffMonths < 5 ? 'месяца' : 'месяцев'}`;
    if (diffDays > 0) return `${diffDays} ${diffDays === 1 ? 'день' : diffDays < 5 ? 'дня' : 'дней'}`;
    return 'Сегодня';
  };

  const formatMessageTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const getUserRating = (userId: number): { rating: number; count: number } => {
    const userReviews = reviews.filter(r => r.toUserId === userId);
    if (userReviews.length === 0) return { rating: 0, count: 0 };
    const avgRating = userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length;
    return { rating: Math.round(avgRating * 10) / 10, count: userReviews.length };
  };

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('rotrade_sound_enabled', JSON.stringify(newValue));
    toast.success(newValue ? 'Звук включен' : 'Звук выключен');
  };

  const blockUser = (userId: number) => {
    if (!currentUser) return;
    const updated = [...blockedUsers, userId];
    setBlockedUsers(updated);
    localStorage.setItem(`rotrade_blocked_${currentUser.id}`, JSON.stringify(updated));
    
    const allMessages = JSON.parse(localStorage.getItem('rotrade_messages') || '[]');
    const filteredMessages = allMessages.filter((msg: Message) => 
      !(msg.fromUserId === currentUser.id && msg.toUserId === userId) &&
      !(msg.fromUserId === userId && msg.toUserId === currentUser.id)
    );
    localStorage.setItem('rotrade_messages', JSON.stringify(filteredMessages));
    window.dispatchEvent(new StorageEvent('storage', { key: 'rotrade_messages' }));
    
    if (activeChat === userId) {
      setActiveChat(null);
      setMessages([]);
    }
    loadChats();
    toast.success('Пользователь заблокирован, чат удалён');
  };

  const unblockUser = (userId: number) => {
    if (!currentUser) return;
    const updated = blockedUsers.filter(id => id !== userId);
    setBlockedUsers(updated);
    localStorage.setItem(`rotrade_blocked_${currentUser.id}`, JSON.stringify(updated));
    toast.success('Пользователь разблокирован');
  };

  const submitReport = () => {
    if (!currentUser || !activeChat || !reportReason.trim()) {
      toast.error('Укажите причину жалобы');
      return;
    }

    const users = JSON.parse(localStorage.getItem('rotrade_users') || '[]');
    const reportedUser = users.find((u: User) => u.id === activeChat);
    const supportUser = users.find((u: User) => u.username === SUPPORT_ACCOUNT_NAME);

    if (!reportedUser) return;

    const report: Report = {
      id: Date.now(),
      reporterId: currentUser.id,
      reporterUsername: currentUser.username,
      reportedUserId: activeChat,
      reportedUsername: reportedUser.username,
      reason: reportReason,
      createdAt: new Date().toISOString()
    };

    const allReports = JSON.parse(localStorage.getItem('rotrade_reports') || '[]');
    allReports.push(report);
    localStorage.setItem('rotrade_reports', JSON.stringify(allReports));
    window.dispatchEvent(new StorageEvent('storage', { key: 'rotrade_reports' }));

    if (supportUser) {
      const supportMessage: Message = {
        id: Date.now() + 1,
        fromUserId: currentUser.id,
        toUserId: supportUser.id,
        content: `Жалоба на пользователя ${reportedUser.username}: ${reportReason}`,
        createdAt: new Date().toISOString()
      };

      const allMessages = JSON.parse(localStorage.getItem('rotrade_messages') || '[]');
      allMessages.push(supportMessage);
      localStorage.setItem('rotrade_messages', JSON.stringify(allMessages));
      window.dispatchEvent(new StorageEvent('storage', { key: 'rotrade_messages' }));
    }

    setReportReason('');
    setShowReportDialog(false);
    toast.success('Жалоба отправлена в поддержку');
    loadReports();
  };

  const removeReport = (reportId: number) => {
    const updated = reports.filter(r => r.id !== reportId);
    localStorage.setItem('rotrade_reports', JSON.stringify(updated));
    window.dispatchEvent(new StorageEvent('storage', { key: 'rotrade_reports' }));
    setReports(updated);
    toast.success('Жалоба удалена');
  };

  const deleteUserAccount = (userId: number) => {
    const users = JSON.parse(localStorage.getItem('rotrade_users') || '[]');
    const updatedUsers = users.filter((u: User) => u.id !== userId);
    localStorage.setItem('rotrade_users', JSON.stringify(updatedUsers));
    window.dispatchEvent(new StorageEvent('storage', { key: 'rotrade_users' }));

    const listingsData = JSON.parse(localStorage.getItem('rotrade_listings') || '[]');
    const updatedListings = listingsData.filter((l: Listing) => l.userId !== userId);
    localStorage.setItem('rotrade_listings', JSON.stringify(updatedListings));
    window.dispatchEvent(new StorageEvent('storage', { key: 'rotrade_listings' }));
    setListings(updatedListings);

    const updatedReports = reports.filter(r => r.reportedUserId !== userId);
    localStorage.setItem('rotrade_reports', JSON.stringify(updatedReports));
    window.dispatchEvent(new StorageEvent('storage', { key: 'rotrade_reports' }));
    setReports(updatedReports);

    toast.success('Аккаунт удален навсегда');
  };

  const submitReview = () => {
    if (!currentUser || !activeChat || !reviewComment.trim()) {
      toast.error('Заполните комментарий');
      return;
    }

    const users = JSON.parse(localStorage.getItem('rotrade_users') || '[]');
    const targetUser = users.find((u: User) => u.id === activeChat);
    if (!targetUser) return;

    const review: Review = {
      id: Date.now(),
      fromUserId: currentUser.id,
      fromUsername: currentUser.username,
      toUserId: activeChat,
      rating: reviewRating,
      comment: reviewComment,
      createdAt: new Date().toISOString()
    };

    const allReviews = JSON.parse(localStorage.getItem('rotrade_reviews') || '[]');
    allReviews.push(review);
    localStorage.setItem('rotrade_reviews', JSON.stringify(allReviews));
    window.dispatchEvent(new StorageEvent('storage', { key: 'rotrade_reviews' }));

    const userIndex = users.findIndex((u: User) => u.id === activeChat);
    if (userIndex !== -1) {
      const userReviews = allReviews.filter((r: Review) => r.toUserId === activeChat);
      const avgRating = userReviews.reduce((sum: number, r: Review) => sum + r.rating, 0) / userReviews.length;
      users[userIndex].rating = Math.round(avgRating * 10) / 10;
      users[userIndex].reviewsCount = userReviews.length;
      localStorage.setItem('rotrade_users', JSON.stringify(users));
      window.dispatchEvent(new StorageEvent('storage', { key: 'rotrade_users' }));
    }

    setReviewRating(5);
    setReviewComment('');
    setShowReviewDialog(false);
    loadReviews();
    toast.success('Отзыв отправлен!');
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
        window.dispatchEvent(new StorageEvent('storage', { key: 'rotrade_users' }));
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

    let gameName = null;
    if (newListing.gameUrl) {
      gameName = extractGameName(newListing.gameUrl);
      if (!gameName) {
        toast.error('Неверная ссылка на игру Roblox');
        return;
      }
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 24 * 60 * 60 * 1000);

    const listing: Listing = {
      id: Date.now(),
      userId: currentUser.id,
      username: currentUser.username,
      title: newListing.title,
      description: newListing.description,
      imageUrl: newListing.imageUrl || 'https://images.unsplash.com/photo-1614680376739-414d95ff43df?w=400',
      gameUrl: newListing.gameUrl,
      gameName: gameName || undefined,
      createdAt: now.toISOString(),
      views: 0,
      expiresAt: expiresAt.toISOString()
    };

    const updated = [...listings, listing];
    setListings(updated);
    localStorage.setItem('rotrade_listings', JSON.stringify(updated));
    window.dispatchEvent(new StorageEvent('storage', { key: 'rotrade_listings' }));
    setNewListing({ title: '', description: '', imageUrl: '', gameUrl: '' });
    setShowCreateListing(false);
    toast.success('Объявление создано!');
  };

  const removeListing = (id: number) => {
    const updated = listings.filter(l => l.id !== id);
    setListings(updated);
    localStorage.setItem('rotrade_listings', JSON.stringify(updated));
    window.dispatchEvent(new StorageEvent('storage', { key: 'rotrade_listings' }));
    toast.success('Объявление удалено');
  };

  const incrementListingViews = (listingId: number) => {
    const allListings = JSON.parse(localStorage.getItem('rotrade_listings') || '[]');
    const listingIndex = allListings.findIndex((l: Listing) => l.id === listingId);
    
    if (listingIndex !== -1) {
      allListings[listingIndex].views = (allListings[listingIndex].views || 0) + 1;
      localStorage.setItem('rotrade_listings', JSON.stringify(allListings));
      window.dispatchEvent(new StorageEvent('storage', { key: 'rotrade_listings' }));
      setListings(allListings);
    }
  };

  const startChat = (userId: number, listingId?: number) => {
    if (userId === currentUser?.id) {
      toast.error('Нельзя писать самому себе');
      return;
    }
    
    if (listingId) {
      incrementListingViews(listingId);
    }
    
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

    if (activeChat === currentUser.id) {
      toast.error('Нельзя писать самому себе');
      return;
    }

    if (blockedUsers.includes(activeChat)) {
      toast.error('Вы заблокировали этого пользователя');
      return;
    }

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
    window.dispatchEvent(new StorageEvent('storage', { key: 'rotrade_messages' }));
    setMessages([...messages, message]);
    setMessageInput('');
    setReplyToId(null);
    toast.success('Сообщение отправлено');
  };

  const deleteMessage = (messageId: number) => {
    const allMessages = JSON.parse(localStorage.getItem('rotrade_messages') || '[]');
    const updated = allMessages.filter((m: Message) => m.id !== messageId);
    localStorage.setItem('rotrade_messages', JSON.stringify(updated));
    window.dispatchEvent(new StorageEvent('storage', { key: 'rotrade_messages' }));
    setMessages(messages.filter(m => m.id !== messageId));
    toast.success('Сообщение удалено');
  };

  const submitListingReport = () => {
    if (!currentUser || !reportListingId || !reportListingReason.trim()) {
      toast.error('Укажите причину жалобы');
      return;
    }

    const listing = listings.find(l => l.id === reportListingId);
    if (!listing) return;

    const users = JSON.parse(localStorage.getItem('rotrade_users') || '[]');
    const supportUser = users.find((u: User) => u.username === SUPPORT_ACCOUNT_NAME);

    const report: Report = {
      id: Date.now(),
      reporterId: currentUser.id,
      reporterUsername: currentUser.username,
      listingId: reportListingId,
      listingTitle: listing.title,
      reason: reportListingReason,
      createdAt: new Date().toISOString()
    };

    const allReports = JSON.parse(localStorage.getItem('rotrade_reports') || '[]');
    allReports.push(report);
    localStorage.setItem('rotrade_reports', JSON.stringify(allReports));
    window.dispatchEvent(new StorageEvent('storage', { key: 'rotrade_reports' }));

    if (supportUser) {
      const supportMessage: Message = {
        id: Date.now() + 1,
        fromUserId: currentUser.id,
        toUserId: supportUser.id,
        content: `Жалоба на объявление "${listing.title}": ${reportListingReason}`,
        createdAt: new Date().toISOString()
      };

      const allMessages = JSON.parse(localStorage.getItem('rotrade_messages') || '[]');
      allMessages.push(supportMessage);
      localStorage.setItem('rotrade_messages', JSON.stringify(allMessages));
      window.dispatchEvent(new StorageEvent('storage', { key: 'rotrade_messages' }));
    }

    setReportListingReason('');
    setReportListingId(null);
    setShowReportListingDialog(false);
    toast.success('Жалоба на объявление отправлена');
    loadReports();
  };

  const getListingTags = (): string[] => {
    const tags = new Set<string>();
    listings.forEach(listing => {
      if (listing.gameName) {
        tags.add(listing.gameName);
      }
    });
    return Array.from(tags).sort();
  };

  const getFilteredListings = (): Listing[] => {
    let filtered = listings;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(listing => 
        listing.title.toLowerCase().includes(query) ||
        listing.description.toLowerCase().includes(query) ||
        listing.gameName?.toLowerCase().includes(query)
      );
    }

    if (selectedTag) {
      filtered = filtered.filter(listing => 
        listing.gameName === selectedTag
      );
    }

    return filtered;
  };

  const getUserListings = (): Listing[] => {
    if (!currentUser) return [];
    return listings.filter(l => l.userId === currentUser.id);
  };

  const getTimeUntilExpiration = (expiresAt: string): string => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) {
      return `${diffDays}д ${diffHours}ч`;
    } else if (diffHours > 0) {
      return `${diffHours}ч`;
    } else {
      return 'Скоро истечёт';
    }
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
        <TabsList className={`grid w-full ${currentUser?.username === SUPPORT_ACCOUNT_NAME ? 'grid-cols-6' : 'grid-cols-5'} mb-8`}>
          <TabsTrigger value="home">
            <Icon name="Home" size={16} className="mr-2" />
            Главная
          </TabsTrigger>
          <TabsTrigger value="listings">
            <Icon name="Package" size={16} className="mr-2" />
            Объявления
          </TabsTrigger>
          <TabsTrigger value="mylistings">
            <Icon name="List" size={16} className="mr-2" />
            Мои
            {getUserListings().length > 0 && (
              <Badge className="ml-2" variant="secondary">{getUserListings().length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="chats">
            <Icon name="MessageSquare" size={16} className="mr-2" />
            Чаты
            {chats.length > 0 && (
              <Badge className="ml-2" variant="secondary">{chats.length}</Badge>
            )}
          </TabsTrigger>
          {currentUser?.username === SUPPORT_ACCOUNT_NAME && (
            <TabsTrigger value="support">
              <Icon name="AlertCircle" size={16} className="mr-2" />
              Поддержка
              {reports.length > 0 && (
                <Badge className="ml-2" variant="destructive">{reports.length}</Badge>
              )}
            </TabsTrigger>
          )}
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
                    {listing.gameName && (
                      <Badge className="mb-2" variant="secondary">
                        <Icon name="Gamepad2" size={12} className="mr-1" />
                        {listing.gameName}
                      </Badge>
                    )}
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

            <div className="space-y-4">
              <Input
                placeholder="Поиск по названию, описанию или игре..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={selectedTag === null ? 'default' : 'outline'}
                  onClick={() => setSelectedTag(null)}
                >
                  Все
                </Button>
                {getListingTags().map((tag) => (
                  <Button
                    key={tag}
                    size="sm"
                    variant={selectedTag === tag ? 'default' : 'outline'}
                    onClick={() => setSelectedTag(tag)}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {getFilteredListings().map((listing) => (
                <Card key={listing.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <img
                    src={listing.imageUrl}
                    alt={listing.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-bold mb-2">{listing.title}</h3>
                    {listing.gameName && (
                      <Badge className="mb-2" variant="secondary">
                        <Icon name="Gamepad2" size={12} className="mr-1" />
                        {listing.gameName}
                      </Badge>
                    )}
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
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
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReportListingId(listing.id);
                              setShowReportListingDialog(true);
                            }}
                          >
                            <Icon name="Flag" size={14} />
                          </Button>
                          <Button size="sm" onClick={() => startChat(listing.userId, listing.id)}>
                            Связаться
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {getFilteredListings().length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Объявления не найдены
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="mylistings">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Мои объявления</h2>
              <Button onClick={() => setShowCreateListing(true)}>
                <Icon name="Plus" size={16} className="mr-2" />
                Создать объявление
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getUserListings().map((listing) => (
                <Card key={listing.id} className="overflow-hidden">
                  <img
                    src={listing.imageUrl}
                    alt={listing.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4 space-y-3">
                    <h3 className="font-bold">{listing.title}</h3>
                    {listing.gameName && (
                      <Badge variant="secondary">
                        <Icon name="Gamepad2" size={12} className="mr-1" />
                        {listing.gameName}
                      </Badge>
                    )}
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {listing.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Icon name="Eye" size={14} />
                        <span>{listing.views || 0} просмотров</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Icon name="Clock" size={14} />
                        <span>{getTimeUntilExpiration(listing.expiresAt)}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full"
                      onClick={() => removeListing(listing.id)}
                    >
                      <Icon name="Trash2" size={14} className="mr-2" />
                      Удалить
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {getUserListings().length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                У вас пока нет объявлений
              </div>
            )}
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
                  <div className="flex items-center justify-between mb-4 pb-2 border-b">
                    <h3 className="font-bold">
                      {chats.find(c => c.userId === activeChat)?.username}
                    </h3>
                    <div className="flex gap-2">
                      {!blockedUsers.includes(activeChat) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => blockUser(activeChat)}
                        >
                          <Icon name="Ban" size={14} className="mr-1" />
                          Заблокировать
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unblockUser(activeChat)}
                        >
                          <Icon name="CheckCircle" size={14} className="mr-1" />
                          Разблокировать
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setShowReportDialog(true)}
                      >
                        <Icon name="Flag" size={14} className="mr-1" />
                        Пожаловаться
                      </Button>
                    </div>
                  </div>
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
                          <p className="text-xs opacity-60 mt-1">{formatMessageTime(msg.createdAt)}</p>
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => setReplyToId(msg.id)}
                              className="text-xs opacity-70 hover:opacity-100"
                            >
                              Ответить
                            </button>
                            {msg.fromUserId === currentUser?.id && (
                              <button
                                onClick={() => deleteMessage(msg.id)}
                                className="text-xs opacity-70 hover:opacity-100 text-destructive"
                              >
                                Удалить
                              </button>
                            )}
                          </div>
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
                    <Button onClick={() => setShowReviewDialog(true)} variant="outline">
                      <Icon name="Star" size={16} />
                    </Button>
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

        {currentUser?.username === SUPPORT_ACCOUNT_NAME && (
          <TabsContent value="support">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-6">Жалобы пользователей</h2>
              {reports.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Нет активных жалоб</p>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <Card key={report.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="destructive">
                              {report.listingId ? 'Жалоба на объявление' : 'Жалоба на пользователя'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(report.createdAt).toLocaleString('ru-RU')}
                            </span>
                          </div>
                          <p className="font-medium mb-1">
                            От: <span className="text-primary">{report.reporterUsername}</span> (ID: {report.reporterId})
                          </p>
                          {report.listingId ? (
                            <p className="font-medium mb-2">
                              Объявление: <span className="text-destructive">{report.listingTitle}</span> (ID: {report.listingId})
                            </p>
                          ) : (
                            <p className="font-medium mb-2">
                              На: <span className="text-destructive">{report.reportedUsername}</span> (ID: {report.reportedUserId})
                            </p>
                          )}
                          <p className="text-sm bg-muted p-3 rounded">
                            <strong>Причина:</strong> {report.reason}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          {report.listingId ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                const listing = listings.find(l => l.id === report.listingId);
                                if (listing && confirm(`Удалить объявление "${listing.title}"?`)) {
                                  removeListing(report.listingId);
                                  removeReport(report.id);
                                }
                              }}
                            >
                              <Icon name="Trash2" size={14} className="mr-1" />
                              Удалить объявление
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (report.reportedUserId && report.reportedUsername && 
                                    confirm(`Удалить аккаунт ${report.reportedUsername} навсегда?`)) {
                                  deleteUserAccount(report.reportedUserId);
                                  removeReport(report.id);
                                }
                              }}
                            >
                              <Icon name="Trash2" size={14} className="mr-1" />
                              Удалить аккаунт
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeReport(report.id)}
                          >
                            <Icon name="X" size={14} className="mr-1" />
                            Отклонить жалобу
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        )}

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
                <div className="flex items-center justify-center gap-4 mt-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">На сайте</p>
                    <p className="font-bold">{getTimeSinceRegistration(currentUser?.createdAt)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Рейтинг</p>
                    <div className="flex items-center justify-center gap-1">
                      <Icon name="Star" size={16} className="text-yellow-500" />
                      <p className="font-bold">
                        {getUserRating(currentUser?.id || 0).rating.toFixed(1)} ({getUserRating(currentUser?.id || 0).count})
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {reviews.filter(r => r.toUserId === currentUser?.id).length > 0 && (
                <div className="pt-6 border-t">
                  <h3 className="font-bold mb-4">Отзывы</h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {reviews.filter(r => r.toUserId === currentUser?.id).map((review) => (
                      <Card key={review.id} className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-medium text-sm">{review.fromUsername}</span>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: review.rating }).map((_, i) => (
                              <Icon key={i} name="Star" size={12} className="text-yellow-500 fill-yellow-500" />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(review.createdAt).toLocaleDateString('ru-RU')}
                        </p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-6 border-t space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Звуковые уведомления</span>
                  <Button
                    variant={soundEnabled ? 'default' : 'outline'}
                    size="sm"
                    onClick={toggleSound}
                  >
                    <Icon name={soundEnabled ? 'Volume2' : 'VolumeX'} size={16} className="mr-2" />
                    {soundEnabled ? 'Включены' : 'Выключены'}
                  </Button>
                </div>
                <h3 className="font-bold mb-4 pt-4">Правила и условия</h3>
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
            <div className="space-y-2">
              <label className="block text-sm font-medium">Игра Roblox (необязательно)</label>
              <Input
                placeholder="https://www.roblox.com/games/1537690962/Bee-Swarm-Simulator"
                value={newListing.gameUrl}
                onChange={(e) => setNewListing({ ...newListing, gameUrl: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Вставьте ссылку на игру, где будет сделка
              </p>
            </div>
            <Button onClick={createListing} className="w-full">
              Создать
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Пожаловаться на пользователя</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Укажите причину жалобы. Жалоба будет отправлена в службу поддержки.
            </p>
            <Textarea
              placeholder="Опишите причину жалобы..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={4}
            />
            <Button onClick={submitReport} className="w-full">
              <Icon name="Send" size={16} className="mr-2" />
              Отправить жалобу
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Оставить отзыв</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Рейтинг</label>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Icon
                      name="Star"
                      size={32}
                      className={star <= reviewRating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}
                    />
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {reviewRating} из 5 звёзд
              </p>
            </div>
            <Textarea
              placeholder="Расскажите о сделке..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={4}
            />
            <Button onClick={submitReview} className="w-full">
              <Icon name="Send" size={16} className="mr-2" />
              Отправить отзыв
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showReportListingDialog} onOpenChange={setShowReportListingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Пожаловаться на объявление</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Укажите причину жалобы. Жалоба будет отправлена в службу поддержки.
            </p>
            <Textarea
              placeholder="Опишите причину жалобы..."
              value={reportListingReason}
              onChange={(e) => setReportListingReason(e.target.value)}
              rows={4}
            />
            <Button onClick={submitListingReport} className="w-full">
              <Icon name="Send" size={16} className="mr-2" />
              Отправить жалобу
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