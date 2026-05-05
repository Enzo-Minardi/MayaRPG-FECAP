-- =============================================
-- RPG Admin — Banco de Dados MySQL
-- Execute: mysql -u root -p < schema.sql
-- =============================================
-- drop database rpg_admin;
CREATE DATABASE IF NOT EXISTS rpg_admin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rpg_admin;

-- ===== USUÁRIOS (fisioterapeutas/admins) =====
CREATE TABLE IF NOT EXISTS users (
  id         VARCHAR(36)  PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  phone      VARCHAR(20),
  age        INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===== CLIENTES (pacientes) =====
CREATE TABLE IF NOT EXISTS clients (
  id         VARCHAR(36)  PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150),
  phone      VARCHAR(20),
  age        INT,
  status     ENUM('ativo','concluido','pendente') DEFAULT 'ativo',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===== FICHAS DE ATENDIMENTO =====
CREATE TABLE IF NOT EXISTS fichas (
  id          VARCHAR(36)   PRIMARY KEY,
  client_id   VARCHAR(36)   NOT NULL,
  date        DATE          NOT NULL,
  complaint   VARCHAR(500)  NOT NULL,
  region      VARCHAR(100)  NOT NULL,
  pain        INT           DEFAULT 0,
  notes       TEXT,
  plan        TEXT,
  created_at  DATETIME      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- ===== AGENDAMENTOS =====
CREATE TABLE IF NOT EXISTS appointments (
  id          VARCHAR(36)  PRIMARY KEY,
  client_id   VARCHAR(36)  NOT NULL,
  date        DATE         NOT NULL,
  time        TIME         NOT NULL,
  end_time    TIME,
  type        VARCHAR(50)  DEFAULT 'RPG',
  status      ENUM('pendente','confirmado','concluido','cancelado') DEFAULT 'pendente',
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- ===== EXERCÍCIOS =====
CREATE TABLE IF NOT EXISTS exercises (
  id          INT          AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  region      VARCHAR(50)  NOT NULL,
  icon        VARCHAR(10)  DEFAULT '🏋️',
  description TEXT,
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- ===== PLANOS DE EXERCÍCIOS =====
CREATE TABLE IF NOT EXISTS plans (
  id            VARCHAR(36) PRIMARY KEY,
  client_id     VARCHAR(36) NOT NULL,
  ficha_id      VARCHAR(36),
  exercise_id   INT         NOT NULL,
  series        INT         DEFAULT 3,
  reps          INT         DEFAULT 10,
  created_at    DATETIME    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id)   REFERENCES clients(id)   ON DELETE CASCADE,
  FOREIGN KEY (ficha_id)    REFERENCES fichas(id)     ON DELETE SET NULL,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)  ON DELETE CASCADE
);

-- ===== ALERTAS =====
CREATE TABLE IF NOT EXISTS alerts (
  id          VARCHAR(36)  PRIMARY KEY,
  type        ENUM('pain','info') DEFAULT 'info',
  client_name VARCHAR(100),
  region      VARCHAR(100),
  message     TEXT,
  alert_time  VARCHAR(50),
  is_read     BOOLEAN      DEFAULT FALSE,
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- SEED DATA — Dados de exemplo para testar
-- =============================================

-- Usuário admin (senha: maya123)
INSERT IGNORE INTO users (id, name, email, password, phone, age) VALUES
('user-maya-01', 'Maya Silva', 'maya@rpg.com', 'maya123', '(11) 99999-1111', 32);

-- Clientes (pacientes)
INSERT IGNORE INTO clients (id, name, email, phone, age, status, created_at) VALUES
('cli-enzo-01',   'Enzo',          'enzo@email.com',   '(11) 98765-4321', 30, 'ativo',    '2026-03-01'),
('cli-sota-02',   'Sota Lima',     'sota@email.com',   '(11) 91234-5678', 45, 'ativo',    '2026-03-10'),
('cli-carlos-03', 'Carlos Mendes', 'carlos@email.com', '(11) 94567-8901', 52, 'concluido','2026-02-05'),
('cli-ana-04',    'Ana Beatriz',   'ana@email.com',    '(11) 97654-3210', 28, 'ativo',    '2026-03-20');

-- Exercícios
INSERT IGNORE INTO exercises (id, name, region, icon, description) VALUES
(1,  'Williams Flexão',              'lombar',   '🧘', 'Flexão lombar progressiva para alívio de dor'),
(2,  'Mobilização Lombar em 4 apoios','lombar',  '🐱', 'Cat-cow para mobilidade lombar'),
(3,  'Ponte Glútea',                 'lombar',   '🌉', 'Ativação glútea e estabilização lombar'),
(4,  'Alongamento Piriformis',       'lombar',   '🦵', 'Relaxamento do músculo piriforme'),
(5,  'McKenzie Extensão',            'lombar',   '↗️', 'Extensão lombar progressiva'),
(6,  'Dead Bug',                     'lombar',   '🐞', 'Estabilização do core com controle lombar'),
(7,  'Bird Dog',                     'lombar',   '🦅', 'Equilíbrio e força da musculatura paravertebral'),
(8,  'Retração Cervical',            'cervical', '⬅️', 'Fortalecimento dos flexores profundos'),
(9,  'Alongamento Trapézio',         'cervical', '🔵', 'Relaxamento do trapézio superior'),
(10, 'Rotação Cervical Ativa',       'cervical', '🔄', 'Mobilidade cervical rotacional'),
(11, 'Flexão Lateral Cervical',      'cervical', '↔️', 'Mobilidade cervical lateral'),
(12, 'Chin Tuck',                    'cervical', '👆', 'Correção postural cervical'),
(13, 'Agachamento Sumô',             'joelho',   '🦵', 'Fortalecimento quadríceps e glúteo'),
(14, 'Terminal Knee Extension',      'joelho',   '🦿', 'Fortalecimento VMO'),
(15, 'Leg Press 90°',               'joelho',   '💪', 'Fortalecimento cadeia extensora'),
(16, 'Alongamento IT Band',          'joelho',   '🟡', 'Mobilidade do trato iliotibial'),
(17, 'Step Up Lateral',              'joelho',   '⬆️', 'Propriocepção e força lateral'),
(18, 'SLR (Elevação Perna Reta)',    'joelho',   '🏋️','Fortalecimento quadríceps sem carga articular'),
(19, 'Rotação Interna Ombro',        'ombro',    '🔁', 'Fortalecimento manguito rotador interno'),
(20, 'Rotação Externa Ombro',        'ombro',    '🔃', 'Fortalecimento manguito rotador externo'),
(21, 'Pendular de Codman',           'ombro',    '🫱', 'Mobilização pendular suave do ombro'),
(22, 'Scaption',                     'ombro',    '✋', 'Elevação no plano da escápula'),
(23, 'Alongamento Cápsula Posterior','ombro',    '🤗', 'Cross arm stretch capsular'),
(24, 'Clam Shell',                   'quadril',  '🦀', 'Ativação glúteo médio'),
(25, 'Hip Thrust',                   'quadril',  '🍑', 'Fortalecimento glúteo máximo'),
(26, 'Leg Raise Lateral',            'quadril',  '↕️', 'Abdutores do quadril'),
(27, 'Alongamento Flexor Quadril',   'quadril',  '🧎', 'Relaxamento do iliopsoas'),
(28, 'Cadeia Anterior - Deitado',    'coluna',   '🟢', 'Postura RPG cadeia anterior em decúbito'),
(29, 'Cadeia Posterior - Deitado',   'coluna',   '🔵', 'Postura RPG cadeia posterior em decúbito'),
(30, 'Cadeia Posterior - Sentado',   'coluna',   '🟣', 'Postura RPG cadeia posterior sentado'),
(31, 'Cadeia Anterior - Em Pé',      'coluna',   '🟠', 'Postura RPG cadeia anterior em pé'),
(32, 'Reeducação Postural Global',   'coluna',   '⭕', 'Postura global corretiva'),
(33, 'Respiração Diafragmática',     'coluna',   '💨', 'Ativação do diafragma e core profundo'),
(34, 'Agachamento RPG 1',            'coluna',   '🏔️','Agachamento com consciência postural RPG'),
(35, 'Agachamento RPG 2',            'coluna',   '⛰️', 'Agachamento avançado RPG');

-- Fichas de exemplo
INSERT IGNORE INTO fichas (id, client_id, date, complaint, region, pain, notes, plan) VALUES
('fic-01', 'cli-enzo-01', '2026-03-18', 'Dor lombar irradiando para glúteo', 'Lombar', 7,
 'Paciente relata piora com flexão. Encurtamento de isquiotibiais. Desequilíbrio pélvico anterior.',
 'RPG - Cadeia posterior 3x/semana, mobilização lombar, fortalecimento core.'),
('fic-02', 'cli-enzo-01', '2026-03-11', 'Lombar e tensão cervical', 'Lombar', 6,
 'Melhora parcial desde última sessão. Mantém postura anteriorizada da cabeça.',
 'Continuar cadeia posterior + retração cervical.');

-- Agendamentos de exemplo
INSERT IGNORE INTO appointments (id, client_id, date, time, end_time, type, status) VALUES
('apt-01', 'cli-enzo-01',   '2026-03-25', '08:00', '09:00', 'RPG',       'concluido'),
('apt-02', 'cli-sota-02',   '2026-03-25', '10:00', '11:00', 'Avaliação', 'confirmado'),
('apt-03', 'cli-enzo-01',   '2026-03-26', '08:00', '09:00', 'RPG',       'pendente'),
('apt-04', 'cli-ana-04',    '2026-03-27', '14:00', '15:00', 'RPG',       'pendente');

-- Alertas de exemplo
INSERT IGNORE INTO alerts (id, type, client_name, region, message, alert_time, is_read) VALUES
('alt-01', 'pain', 'Enzo',       'Dorsal',  'Relatou dor dorsal intensa (8/10) via app',        '25/03 - 07:42', FALSE),
('alt-02', 'pain', 'Sota Lima',  'Cervical','Avaliação de dor cervical aguda reportada',          '25/03 - 09:15', FALSE),
('alt-03', 'pain', 'João Almeida','Dorsal', 'Segunda ocorrência de dor dorsal esta semana',       '24/03 - 18:30', FALSE),
('alt-04', 'info', 'Ana Beatriz','—',       'Completou todos os exercícios do plano semanal',     '24/03 - 12:00', TRUE);

select * from users;
select* from clients;
drop table users;


INSERT INTO appointments (id, client_id, date, time, end_time, type, status) VALUES

-- MAIO 2026 - Semana 1
('apt-10', 'cli-enzo-01',   '2026-05-04', '08:00', '09:00', 'RPG',       'confirmado'),
('apt-11', 'cli-ana-04',    '2026-05-04', '09:30', '10:30', 'Avaliação', 'confirmado'),
('apt-12', 'cli-sota-02',   '2026-05-05', '10:00', '11:00', 'RPG',       'pendente'),
('apt-13', 'cli-carlos-03', '2026-05-05', '14:00', '15:00', 'Retorno',   'pendente'),
('apt-14', 'cli-enzo-01',   '2026-05-06', '08:00', '09:00', 'RPG',       'pendente'),
('apt-15', 'cli-ana-04',    '2026-05-07', '11:00', '12:00', 'RPG',       'pendente'),
('apt-16', 'cli-sota-02',   '2026-05-08', '09:00', '10:00', 'Avaliação', 'pendente'),

-- MAIO 2026 - Semana 2
('apt-20', 'cli-enzo-01',   '2026-05-11', '08:00', '09:00', 'RPG',       'pendente'),
('apt-21', 'cli-carlos-03', '2026-05-12', '10:00', '11:00', 'RPG',       'pendente'),
('apt-22', 'cli-ana-04',    '2026-05-13', '09:00', '10:00', 'RPG',       'pendente'),
('apt-23', 'cli-sota-02',   '2026-05-14', '14:00', '15:00', 'Retorno',   'pendente'),
('apt-24', 'cli-enzo-01',   '2026-05-15', '08:00', '09:00', 'RPG',       'pendente'),

-- MAIO 2026 - Semana 3
('apt-30', 'cli-ana-04',    '2026-05-19', '10:00', '11:00', 'RPG',       'pendente'),
('apt-31', 'cli-carlos-03', '2026-05-20', '09:00', '10:00', 'Alta',      'pendente'),
('apt-32', 'cli-sota-02',   '2026-05-21', '11:00', '12:00', 'RPG',       'pendente'),
('apt-33', 'cli-enzo-01',   '2026-05-22', '08:00', '09:00', 'RPG',       'pendente'),

-- ABRIL 2026 - já concluídos (histórico)
('apt-40', 'cli-enzo-01',   '2026-04-28', '08:00', '09:00', 'RPG',       'concluido'),
('apt-41', 'cli-sota-02',   '2026-04-29', '10:00', '11:00', 'Avaliação', 'concluido'),
('apt-42', 'cli-ana-04',    '2026-04-30', '14:00', '15:00', 'RPG',       'concluido'),
('apt-43', 'cli-carlos-03', '2026-04-22', '09:00', '10:00', 'RPG',       'cancelado');