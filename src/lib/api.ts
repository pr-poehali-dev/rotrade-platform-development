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

export const api = {
  async registerUser(username: string, password: string): Promise<User> {
    try {
      const response = await fetch(`${API_URL}?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка регистрации');
      }
      
      return data;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },

  async loginUser(username: string, password: string): Promise<User> {
    try {
      const response = await fetch(`${API_URL}?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка входа');
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async getListings(): Promise<Listing[]> {
    try {
      const response = await fetch(`${API_URL}?action=listings`);
      if (!response.ok) {
        console.error('Failed to fetch listings:', response.status);
        return [];
      }
      return response.json();
    } catch (error) {
      console.error('Get listings error:', error);
      return [];
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
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Ошибка создания объявления');
      }
      
      return result;
    } catch (error) {
      console.error('Create listing error:', error);
      throw error;
    }
  },

  async deleteListing(id: number): Promise<void> {
    await fetch(`${API_URL}?action=listing&id=${id}`, {
      method: 'DELETE'
    });
  },

  async getMessages(userId?: number): Promise<Message[]> {
    const url = userId ? `${API_URL}?action=messages&userId=${userId}` : `${API_URL}?action=messages`;
    const response = await fetch(url);
    return response.json();
  },

  async sendMessage(data: {
    fromUserId: number;
    toUserId: number;
    content: string;
    replyToId?: number;
  }): Promise<Message> {
    const response = await fetch(`${API_URL}?action=message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  async deleteMessage(id: number): Promise<void> {
    await fetch(`${API_URL}?action=message&id=${id}`, {
      method: 'DELETE'
    });
  },

  async getUsers(): Promise<User[]> {
    const response = await fetch(`${API_URL}?action=users`);
    return response.json();
  },

  async createReport(data: {
    reporterId: number;
    reportedUserId: number;
    reason: string;
  }): Promise<Report> {
    const response = await fetch(`${API_URL}?action=report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  async getReports(): Promise<Report[]> {
    const response = await fetch(`${API_URL}?action=reports`);
    return response.json();
  },

  async createReview(data: {
    fromUserId: number;
    toUserId: number;
    rating: number;
    comment: string;
  }): Promise<Review> {
    const response = await fetch(`${API_URL}?action=review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  async getReviews(userId?: number): Promise<Review[]> {
    const url = userId ? `${API_URL}?action=reviews&userId=${userId}` : `${API_URL}?action=reviews`;
    const response = await fetch(url);
    return response.json();
  }
};