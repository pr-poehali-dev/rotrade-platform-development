-- Добавляем баланс монет к пользователям
ALTER TABLE users ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0;

-- Таблица истории пополнений
CREATE TABLE IF NOT EXISTS deposits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount_rub DECIMAL(10,2) NOT NULL,
    coins_received INTEGER NOT NULL,
    payment_method VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Добавляем поле для премиум объявлений
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP NULL;

-- Таблица транзакций монет
CREATE TABLE IF NOT EXISTS coin_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
