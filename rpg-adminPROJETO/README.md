# 🏥 RPG Admin — Sistema de Gestão de Fisioterapia

API Node.js + MySQL + Frontend integrado.

---

## 📋 Pré-requisitos

- **Node.js** 18+
- **MySQL** 8.0+ (ou MariaDB 10.6+)
- **npm**

---

## 🚀 Instalação passo a passo

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o .env com suas credenciais MySQL:
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=SUA_SENHA_AQUI
DB_NAME=rpg_admin
JWT_SECRET=rpg_admin_secret_key_2026
```

### 3. Criar o banco de dados
```bash
# Opção A — via terminal MySQL
mysql -u root -p < sql/schema.sql

# Opção B — via MySQL Workbench
# Abra o arquivo sql/schema.sql e execute
```

### 4. Iniciar o servidor
```bash
# Produção
npm start

# Desenvolvimento (com hot-reload)
npm run dev
```

### 5. Acessar no navegador
```
http://localhost:3000
```

---

## 🔑 Login de teste

| Campo  | Valor          |
|--------|----------------|
| E-mail | maya@rpg.com   |
| Senha  | maya123        |

---

## 📡 API Endpoints

### 🔐 Autenticação
| Método | Rota                  | Descrição         |
|--------|-----------------------|-------------------|
| POST   | /api/auth/register    | Criar conta       |
| POST   | /api/auth/login       | Fazer login       |

### 👥 Clientes
| Método | Rota                      | Descrição             |
|--------|---------------------------|-----------------------|
| GET    | /api/clients              | Listar todos          |
| GET    | /api/clients?q=nome       | Buscar por nome       |
| GET    | /api/clients/:id          | Buscar por ID         |
| GET    | /api/clients/:id/stats    | Estatísticas          |
| POST   | /api/clients              | Criar cliente         |
| PUT    | /api/clients/:id          | Atualizar cliente     |
| DELETE | /api/clients/:id          | Remover cliente       |

### 📋 Fichas
| Método | Rota                          | Descrição         |
|--------|-------------------------------|-------------------|
| GET    | /api/fichas?client_id=xxx     | Listar fichas     |
| GET    | /api/fichas/:id               | Buscar ficha      |
| POST   | /api/fichas                   | Criar ficha       |
| PUT    | /api/fichas/:id               | Atualizar ficha   |
| DELETE | /api/fichas/:id               | Remover ficha     |

### 📅 Agendamentos
| Método | Rota                              | Descrição             |
|--------|-----------------------------------|-----------------------|
| GET    | /api/appointments                 | Listar todos          |
| GET    | /api/appointments?date=2026-03-25 | Filtrar por data      |
| GET    | /api/appointments/today           | Consultas de hoje     |
| POST   | /api/appointments                 | Criar agendamento     |
| PUT    | /api/appointments/:id             | Atualizar             |
| PATCH  | /api/appointments/:id/status      | Atualizar status      |
| DELETE | /api/appointments/:id             | Remover               |

### 🏋️ Exercícios
| Método | Rota                              | Descrição             |
|--------|-----------------------------------|-----------------------|
| GET    | /api/exercises                    | Listar todos          |
| GET    | /api/exercises?region=lombar      | Filtrar por região    |
| POST   | /api/exercises                    | Criar exercício       |
| PUT    | /api/exercises/:id                | Atualizar             |
| DELETE | /api/exercises/:id                | Remover               |
| GET    | /api/exercises/plans/client/:id   | Plano do cliente      |
| POST   | /api/exercises/plans              | Designar plano        |
| DELETE | /api/exercises/plans/:id          | Remover do plano      |

### 🔔 Alertas
| Método | Rota                    | Descrição                 |
|--------|-------------------------|---------------------------|
| GET    | /api/alerts             | Listar alertas            |
| POST   | /api/alerts             | Criar alerta              |
| PATCH  | /api/alerts/:id/read    | Marcar como lido          |
| PATCH  | /api/alerts/read-all    | Marcar todos como lidos   |
| DELETE | /api/alerts/:id         | Remover alerta            |

### 📊 Dashboard
| Método | Rota            | Descrição                         |
|--------|-----------------|-----------------------------------|
| GET    | /api/dashboard  | Estatísticas gerais               |
| GET    | /api/health     | Verificar status do servidor      |

---

## 📁 Estrutura do Projeto

```
rpg-admin/
├── src/
│   ├── server.js              # Servidor Express principal
│   ├── db.js                  # Conexão MySQL
│   ├── auth.middleware.js     # Validação JWT
│   └── routes/
│       ├── auth.js            # Login e Registro
│       ├── clients.js         # CRUD Clientes
│       ├── fichas.js          # CRUD Fichas
│       ├── appointments.js    # CRUD Agendamentos
│       ├── exercises.js       # CRUD Exercícios + Planos
│       ├── alerts.js          # Alertas
│       └── dashboard.js       # Estatísticas
├── public/
│   ├── index.html             # Frontend
│   ├── style.css              # Estilos
│   └── app.js                 # JavaScript integrado com API
├── sql/
│   └── schema.sql             # Banco de dados + dados de teste
├── .env.example               # Modelo de configuração
├── package.json
└── README.md
```

---

## 🛠️ Testando a API (curl)

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"maya@rpg.com","password":"maya123"}'

# Listar clientes (substitua TOKEN pelo token retornado)
curl http://localhost:3000/api/clients \
  -H "Authorization: Bearer TOKEN"

# Criar agendamento
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"client_id":"cli-enzo-01","date":"2026-04-01","time":"10:00","type":"RPG"}'
```
