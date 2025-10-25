-- Добавление уникального ограничения на username
ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
