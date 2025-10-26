const API_URL = 'https://functions.poehali.dev/f67b84c3-8b97-41e9-83e4-e11c5e0f7999';

export interface User {
  id: number;
  username: string;
  avatar_url?: string;
  created_at?: string;
}

export interface Listing {
  id: number;
  user_id: number;
  username: string;
  title: string;
  description: string;
  image_url?: string;
  game_url?: string;
  game_name?: string;
  created_at: string;
}

export interface Message {
  id: number;
  from_user_id: number;
  to_user_id: number;
  content: string;
  reply_to_id?: number;
  created_at: string;
}

export interface Report {
  id: number;
  reporter_id: number;
  reporter_username: string;
  reported_user_id: number;
  reported_username: string;
  reason: string;
  created_at: string;
}

export interface Review {
  id: number;
  from_user_id: number;
  from_username: string;
  to_user_id: number;
  rating: number;
  comment: string;
  created_at: string;
}

class LocalStorageAPI {
  private getFromStorage<T>(key: string, defaultValue: T): T {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  }

  private saveToStorage<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  registerUser(username: string, password: string): User {
    const users = this.getFromStorage<User[]>('users', []);
    
    if (users.find(u => u.username === username)) {
      throw new Error('Username already exists');
    }

    const newUser: User = {
      id: Date.now(),
      username,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    this.saveToStorage('users', users);
    this.saveToStorage('passwords', { ...this.getFromStorage('passwords', {}), [username]: password });
    
    return newUser;
  }

  loginUser(username: string, password: string): User {
    const users = this.getFromStorage<User[]>('users', []);
    const passwords = this.getFromStorage<Record<string, string>>('passwords', {});

    if (passwords[username] !== password) {
      throw new Error('Invalid credentials');
    }

    const user = users.find(u => u.username === username);
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  getListings(): Listing[] {
    return this.getFromStorage<Listing[]>('listings', []);
  }

  createListing(data: {
    userId: number;
    title: string;
    description: string;
    imageUrl?: string;
    gameUrl?: string;
    gameName?: string;
  }): Listing {
    const listings = this.getFromStorage<Listing[]>('listings', []);
    const users = this.getFromStorage<User[]>('users', []);
    const user = users.find(u => u.id === data.userId);

    const newListing: Listing = {
      id: Date.now(),
      user_id: data.userId,
      username: user?.username || 'Unknown',
      title: data.title,
      description: data.description,
      image_url: data.imageUrl,
      game_url: data.gameUrl,
      game_name: data.gameName,
      created_at: new Date().toISOString()
    };

    listings.unshift(newListing);
    this.saveToStorage('listings', listings);
    
    return newListing;
  }

  deleteListing(id: number): void {
    const listings = this.getFromStorage<Listing[]>('listings', []);
    this.saveToStorage('listings', listings.filter(l => l.id !== id));
  }

  getMessages(userId?: number): Message[] {
    const messages = this.getFromStorage<Message[]>('messages', []);
    if (!userId) return messages;
    return messages.filter(m => m.from_user_id === userId || m.to_user_id === userId);
  }

  sendMessage(data: {
    fromUserId: number;
    toUserId: number;
    content: string;
    replyToId?: number;
  }): Message {
    const messages = this.getFromStorage<Message[]>('messages', []);

    const newMessage: Message = {
      id: Date.now(),
      from_user_id: data.fromUserId,
      to_user_id: data.toUserId,
      content: data.content,
      reply_to_id: data.replyToId,
      created_at: new Date().toISOString()
    };

    messages.push(newMessage);
    this.saveToStorage('messages', messages);
    
    return newMessage;
  }

  deleteMessage(id: number): void {
    const messages = this.getFromStorage<Message[]>('messages', []);
    this.saveToStorage('messages', messages.filter(m => m.id !== id));
  }

  getUsers(): User[] {
    return this.getFromStorage<User[]>('users', []);
  }

  createReport(data: {
    reporterId: number;
    reportedUserId: number;
    reason: string;
  }): Report {
    const reports = this.getFromStorage<Report[]>('reports', []);
    const users = this.getFromStorage<User[]>('users', []);
    
    const reporter = users.find(u => u.id === data.reporterId);
    const reported = users.find(u => u.id === data.reportedUserId);

    const newReport: Report = {
      id: Date.now(),
      reporter_id: data.reporterId,
      reporter_username: reporter?.username || 'Unknown',
      reported_user_id: data.reportedUserId,
      reported_username: reported?.username || 'Unknown',
      reason: data.reason,
      created_at: new Date().toISOString()
    };

    reports.push(newReport);
    this.saveToStorage('reports', reports);
    
    return newReport;
  }

  getReports(): Report[] {
    return this.getFromStorage<Report[]>('reports', []);
  }

  createReview(data: {
    fromUserId: number;
    toUserId: number;
    rating: number;
    comment: string;
  }): Review {
    const reviews = this.getFromStorage<Review[]>('reviews', []);
    const users = this.getFromStorage<User[]>('users', []);
    
    const fromUser = users.find(u => u.id === data.fromUserId);

    const newReview: Review = {
      id: Date.now(),
      from_user_id: data.fromUserId,
      from_username: fromUser?.username || 'Unknown',
      to_user_id: data.toUserId,
      rating: data.rating,
      comment: data.comment,
      created_at: new Date().toISOString()
    };

    reviews.push(newReview);
    this.saveToStorage('reviews', reviews);
    
    return newReview;
  }

  getReviews(userId?: number): Review[] {
    const reviews = this.getFromStorage<Review[]>('reviews', []);
    if (!userId) return reviews;
    return reviews.filter(r => r.to_user_id === userId);
  }
}

const localAPI = new LocalStorageAPI();

export const api = {
  async registerUser(username: string, password: string): Promise<User> {
    try {
      const response = await fetch(`${API_URL}?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) {
        throw new Error('Backend unavailable');
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
      return localAPI.registerUser(username, password);
    }
  },

  async loginUser(username: string, password: string): Promise<User> {
    try {
      const response = await fetch(`${API_URL}?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) {
        throw new Error('Backend unavailable');
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
      return localAPI.loginUser(username, password);
    }
  },

  async getListings(): Promise<Listing[]> {
    try {
      const response = await fetch(`${API_URL}?action=listings`);
      if (!response.ok) {
        throw new Error('Backend unavailable');
      }
      return await response.json();
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
      return localAPI.getListings();
    }
  },

  async createListing(data: {
    userId: number;
    title: string;
    description: string;
    imageUrl?: string;
    gameUrl?: string;
    gameName?: string;
  }): Promise<Listing> {
    try {
      const response = await fetch(`${API_URL}?action=listing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Backend unavailable');
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
      return localAPI.createListing(data);
    }
  },

  async deleteListing(id: number): Promise<void> {
    try {
      const response = await fetch(`${API_URL}?action=listing&id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Backend unavailable');
      }
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
      localAPI.deleteListing(id);
    }
  },

  async getMessages(userId?: number): Promise<Message[]> {
    try {
      const url = userId ? `${API_URL}?action=messages&userId=${userId}` : `${API_URL}?action=messages`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Backend unavailable');
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
      return localAPI.getMessages(userId);
    }
  },

  async sendMessage(data: {
    fromUserId: number;
    toUserId: number;
    content: string;
    replyToId?: number;
  }): Promise<Message> {
    try {
      const response = await fetch(`${API_URL}?action=message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Backend unavailable');
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
      return localAPI.sendMessage(data);
    }
  },

  async deleteMessage(id: number): Promise<void> {
    try {
      const response = await fetch(`${API_URL}?action=message&id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Backend unavailable');
      }
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
      localAPI.deleteMessage(id);
    }
  },

  async getUsers(): Promise<User[]> {
    try {
      const response = await fetch(`${API_URL}?action=users`);
      
      if (!response.ok) {
        throw new Error('Backend unavailable');
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
      return localAPI.getUsers();
    }
  },

  async createReport(data: {
    reporterId: number;
    reportedUserId: number;
    reason: string;
  }): Promise<Report> {
    try {
      const response = await fetch(`${API_URL}?action=report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Backend unavailable');
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
      return localAPI.createReport(data);
    }
  },

  async getReports(): Promise<Report[]> {
    try {
      const response = await fetch(`${API_URL}?action=reports`);
      
      if (!response.ok) {
        throw new Error('Backend unavailable');
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
      return localAPI.getReports();
    }
  },

  async createReview(data: {
    fromUserId: number;
    toUserId: number;
    rating: number;
    comment: string;
  }): Promise<Review> {
    try {
      const response = await fetch(`${API_URL}?action=review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Backend unavailable');
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
      return localAPI.createReview(data);
    }
  },

  async getReviews(userId?: number): Promise<Review[]> {
    try {
      const url = userId ? `${API_URL}?action=reviews&userId=${userId}` : `${API_URL}?action=reviews`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Backend unavailable');
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
      return localAPI.getReviews(userId);
    }
  }
};
