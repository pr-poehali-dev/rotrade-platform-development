const API_URL = 'https://functions.poehali.dev/f67b84c3-8b97-41e9-83e4-e11c5e0f7999';

export interface User {
  id: number;
  username: string;
  avatar_url?: string;
  created_at?: string;
  coins?: number;
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
  is_featured?: boolean;
  featured_until?: string;
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

export interface Deposit {
  id: number;
  user_id: number;
  amount_rub: number;
  coins_received: number;
  status: string;
  created_at: string;
}

async function handleResponse(response: Response) {
  if (response.status === 402) {
    throw new Error('Сервис временно недоступен. Обратитесь к администратору.');
  }
  
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Ошибка сервера (${response.status})`);
  }
  
  return response.json();
}

export const api = {
  async registerUser(username: string, password: string): Promise<User> {
    const response = await fetch(`${API_URL}?action=register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    return handleResponse(response);
  },

  async loginUser(username: string, password: string): Promise<User> {
    const response = await fetch(`${API_URL}?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    return handleResponse(response);
  },

  async getListings(): Promise<Listing[]> {
    try {
      const response = await fetch(`${API_URL}?action=listings`);
      return handleResponse(response);
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
    const response = await fetch(`${API_URL}?action=listing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    return handleResponse(response);
  },

  async deleteListing(id: number): Promise<void> {
    const response = await fetch(`${API_URL}?action=listing&id=${id}`, {
      method: 'DELETE'
    });
    
    await handleResponse(response);
  },

  async getMessages(userId?: number): Promise<Message[]> {
    const url = userId ? `${API_URL}?action=messages&userId=${userId}` : `${API_URL}?action=messages`;
    const response = await fetch(url);
    return handleResponse(response);
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
    
    return handleResponse(response);
  },

  async deleteMessage(id: number): Promise<void> {
    const response = await fetch(`${API_URL}?action=message&id=${id}`, {
      method: 'DELETE'
    });
    
    await handleResponse(response);
  },

  async getUsers(): Promise<User[]> {
    const response = await fetch(`${API_URL}?action=users`);
    return handleResponse(response);
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
    
    return handleResponse(response);
  },

  async getReports(): Promise<Report[]> {
    const response = await fetch(`${API_URL}?action=reports`);
    return handleResponse(response);
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
    
    return handleResponse(response);
  },

  async getReviews(userId?: number): Promise<Review[]> {
    const url = userId ? `${API_URL}?action=reviews&userId=${userId}` : `${API_URL}?action=reviews`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  async getUserCoins(userId: number): Promise<{ coins: number }> {
    const response = await fetch(`${API_URL}?action=user-coins&userId=${userId}`);
    return handleResponse(response);
  },

  async createDeposit(data: {
    userId: number;
    amountRub: number;
  }): Promise<Deposit> {
    const response = await fetch(`${API_URL}?action=deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    return handleResponse(response);
  },

  async featureListing(data: {
    userId: number;
    listingId: number;
  }): Promise<{ success: boolean }> {
    const response = await fetch(`${API_URL}?action=feature-listing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    return handleResponse(response);
  },

  async getDeposits(userId?: number): Promise<Deposit[]> {
    const url = userId ? `${API_URL}?action=deposits&userId=${userId}` : `${API_URL}?action=deposits`;
    const response = await fetch(url);
    return handleResponse(response);
  }
};