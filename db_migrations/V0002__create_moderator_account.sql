-- Создание аккаунта модератора RoTradeAc
INSERT INTO users (username, password_hash, avatar_url, created_at, reports_count, is_removed) 
VALUES ('RoTradeAc', 'admin123', 'https://api.dicebear.com/7.x/avataaars/svg?seed=RoTradeAc', NOW(), 0, false)
ON CONFLICT (username) DO NOTHING;
