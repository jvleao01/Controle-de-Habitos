CREATE DATABASE IF NOT EXISTS habitflow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE habitflow;

CREATE TABLE IF NOT EXISTS habit_entries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  habit ENUM('atividade', 'leitura', 'estudos', 'sono', 'alimentacao') NOT NULL,
  logged_on DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  note VARCHAR(500) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_habit_entries_date (logged_on, habit)
);

CREATE TABLE IF NOT EXISTS expenses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  spent_on DATE NOT NULL,
  description VARCHAR(120) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category ENUM('necessidade', 'desejo', 'investimento') NOT NULL,
  note VARCHAR(500) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_expenses_date (spent_on, category)
);