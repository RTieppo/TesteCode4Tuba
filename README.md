
# GitHub Repository Manager - Backend

Backend desenvolvido para gerenciamento de repositórios GitHub via OAuth, com sistema de favoritos, criação de repositórios e caching com Redis.

Este projeto faz parte de um desafio técnico **fullstack**, mas aqui está focado 100% no **backend**.
## Stack utilizada

**Back-end:** Node.js, Express.js, PostgreSQL, Prisma ORM, Redis (ioredis), GitHub OAuth, JWT, Helmet, CORS, Express Rate Limit, Axios

## Pré-requisitos

- Node.js >= 18
- PostgreSQL instalado e rodando
- Redis local ou via Redis Cloud
- Conta no GitHub e app OAuth configurado
## Instalação e configuração

### 1. Clone o projeto

```bash
git clone https://github.com/RTieppo/TesteCode4Tuba.git
cd github-backend
```

### 2.Instale as dependências

```bash
npm install
```

### 3.Configure o ambiente
Crie um arquivo .env com base no .env.example e preencha os valores:

```bash
npm install
```

### 4.Configure e inicie o banco com Prisma

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Inicie o Redis (local)

```bash
sudo service redis-server start
```

### 6.Rodando o projeto
```bash
npm run dev
```
## Documentação da API

A documentação completa da API está disponível via **Postman**.

Inclui todas as rotas organizadas em pastas, com exemplos de uso e variáveis de ambiente configuradas para facilitar os testes.

---

### Autenticação com GitHub

 Importante: o fluxo de autenticação com GitHub **deve ser iniciado via navegador**, e não diretamente pelo Postman.

Fluxo:

### 1. Acesse no navegador:
```bash
    http://localhost:5000/auth/github
```


### 2. Copie o JWT retornado e **cole na variável de ambiente `jwt_token` do Postman**.

Adicione o jwt_token nas variáveis de da pasta rais

### Variáveis de Ambiente esperadas no Postman

| Variável       | Descrição                                      |
|----------------|------------------------------------------------|
| `base_url`     | URL base da API (ex: `http://localhost:5000`)  |
| `jwt_token`    | Token JWT obtido via login com GitHub          |

Você pode definir essas variáveis em:  
Postman → Environments → New Environment → `base_url`, `jwt_token`

---

## Endpoints disponíveis

| Método | Rota                                | Descrição                                             |
|--------|-------------------------------------|-------------------------------------------------------|
| GET    | `/auth/github`                      | Redireciona para login com GitHub                     |
| GET    | `/auth/callback`                    | Captura token do GitHub e retorna JWT                |
| GET    | `/repos?user=nome&page=1&sort=desc` | Busca repositórios públicos com paginação             |
| POST   | `/repos`                            | Cria repositório na conta do usuário autenticado      |
| POST   | `/repos/favorite`                   | Adiciona um repositório aos favoritos                 |
| GET    | `/repos/favorites`                  | Lista favoritos do usuário autenticado                |
| DELETE | `/repos/favorite/:githubId`         | Remove repositório dos favoritos                      |
| POST   | `/webhook/github`                   | Recebe eventos de repositórios criados (Webhook GitHub) |
| GET    | `/github/favorites`                 | Lista repositórios "starred" do usuário no GitHub     |

---

### Importação da coleção no Postman

Você pode importar a coleção de testes da API diretamente no Postman:

- [Clique aqui para baixar a coleção Postman](./doc/TesteCode4tuba.postman_collection.json)

No Postman:
1. Vá em `File > Import`
2. Selecione o arquivo `.json`
3. Defina as variáveis de ambiente `base_url` e `jwt_token`
