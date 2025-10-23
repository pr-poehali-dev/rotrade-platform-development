
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMP,
  reports_count INTEGER,
  is_removed BOOLEAN
);

CREATE TABLE listings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP,
  is_active BOOLEAN
);

CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  from_user_id INTEGER NOT NULL,
  to_user_id INTEGER NOT NULL,
  listing_id INTEGER,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  from_user_id INTEGER NOT NULL,
  to_user_id INTEGER NOT NULL,
  listing_id INTEGER,
  content TEXT NOT NULL,
  is_read BOOLEAN,
  reply_to_id INTEGER,
  created_at TIMESTAMP
);

CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER NOT NULL,
  reported_user_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP
);

CREATE TABLE blocked_users (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  blocked_user_id INTEGER NOT NULL,
  created_at TIMESTAMP,
  UNIQUE(user_id, blocked_user_id)
);

CREATE TABLE deal_confirmations (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL,
  buyer_id INTEGER NOT NULL,
  seller_id INTEGER NOT NULL,
  buyer_confirmed BOOLEAN,
  seller_confirmed BOOLEAN,
  created_at TIMESTAMP,
  UNIQUE(listing_id, buyer_id)
);

CREATE INDEX idx_listings_user_id ON listings(user_id);
CREATE INDEX idx_messages_from_user ON messages(from_user_id);
CREATE INDEX idx_messages_to_user ON messages(to_user_id);
CREATE INDEX idx_reviews_to_user ON reviews(to_user_id);
