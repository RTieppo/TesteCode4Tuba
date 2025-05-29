# 📘 GitHub Repository Manager - Backend

Backend desenvolvido para gerenciamento de repositórios GitHub via OAuth, com sistema de favoritos, criação de repositórios e caching com Redis.

Este projeto faz parte de um desafio técnico **fullstack**, mas aqui está focado 100% no **backend**.

---

## 🚀 Tecnologias utilizadas

- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- Redis (ioredis)
- GitHub OAuth
- JWT
- Helmet
- CORS
- Express Rate Limit
- Axios

---

##  Pré-requisitos

- Node.js >= 18
- PostgreSQL instalado e rodando
- Redis local ou via Redis Cloud
- Conta no GitHub e app OAuth configurado

---

## Instalação e configuração

### 1. Clone o projeto

```bash
git clone https://github.com/seu-usuario/github-backend.git
cd github-backend
'''

### 2.Instale as dependências
npm install

3. Configure o ambiente
Crie um arquivo .env com base no .env.example e preencha os valores:
cp .env.example .env


4. Configure e inicie o banco com Prisma

npx prisma generate
npx prisma migrate dev --name init

5. Inicie o Redis (local)
sudo service redis-server start

Rodando o projeto
npm run dev

Endpoints disponíveis


| Método | Rota                                | Descrição                                             |
| ------ | ----------------------------------- | ----------------------------------------------------- |
| GET    | `/auth/github`                      | Redireciona para login com GitHub                     |
| GET    | `/auth/callback`                    | Captura token do GitHub e retorna JWT                 |
| GET    | `/repos?user=nome&page=1&sort=desc` | Busca repositórios públicos com paginação             |
| POST   | `/repos`                            | Cria repositório na conta do usuário                  |
| POST   | `/repos/favorite`                   | Adiciona um repositório aos favoritos                 |
| GET    | `/repos/favorites`                  | Lista favoritos do usuário autenticado                |
| DELETE | `/repos/favorite/:githubId`         | Remove repositório dos favoritos                      |
| POST   | `/webhook/github`                   | Rota para Webhook GitHub registrar novos repositórios |
| GET    | `/github/favorites`                 | Busca repositórios "starred" direto do GitHub         |
