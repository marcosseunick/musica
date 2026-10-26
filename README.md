# Harmonia — Plataforma de Cursos de Música com Progressão Didática

MVP de plataforma web (VOD) para o ensino de repertório musical por níveis de dificuldade com materiais de apoio integrados.

---

## 🎵 Proposta Pedagógica

Ao contrário de plataformas convencionais que dividem o aprendizado por músicas isoladas, a **Harmonia** estrutura cada canção em uma progressão contínua de **4 níveis de arranjo**:

1. **Fácil (Nível 1):** Acordes básicos em bloco e estrutura tonal fundamental.
2. **Médio (Nível 2):** Inversões de acordes e transições suaves.
3. **Difícil (Nível 3):** Dedilhado, arpejos e dinâmicas de interpretação.
4. **Avançado (Nível 4):** Arranjo solo e coral completo com rearmonização e tensões.

O aluno pode alternar instantaneamente entre os níveis de dificuldade através da interface do player ou usando os atalhos de teclado `1` a `4`.

---

## 🚀 Tecnologias

- **Backend:** Node.js, Express 5, Prisma ORM (SQLite).
- **Frontend:** Vanilla HTML, CSS3, JavaScript ES6+ e Tailwind CSS (CDN).
- **Autenticação:** JSON Web Token (JWT) com hash seguro via `bcryptjs`.
- **Segurança:** Rate limiting integrado em memória, sanitização de URLs e validação estrita.

---

## 🛠️ Como Executar

### 1. Clonar e Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
Copie o modelo de ambiente:
```bash
cp .env.example .env
```
*(Certifique-se de que `JWT_SECRET` e `DATABASE_URL` estejam preenchidos no arquivo `.env`)*

### 3. Migrar e Popular o Banco de Dados
```bash
npm run db:migrate
npm run db:seed
```

### 4. Gerar Materiais em PDF de Demonstração
```bash
npm run materials
```

### 5. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
Acesse no seu navegador: `http://localhost:3000`

---

## 👤 Credenciais de Demonstração (Seed)

| Papel | E-mail | Senha | Acesso |
|---|---|---|---|
| **Administrador** | `admin@harmonia.com` | `admin123` | Painel do Aluno + Estúdio (`/admin.html`) |
| **Aluno** | `aluno@harmonia.com` | `aluno123` | Trilha de Teclado (`/dashboard.html`) |

---

## 📁 Estrutura do Projeto

```
musica/
├── prisma/
│   ├── schema.prisma       # Definição das entidades e relacionamentos
│   ├── seed.js             # Povoamento inicial de usuários e canções
│   └── dev.db              # Banco de dados SQLite local
├── public/
│   ├── assets/             # Imagens e identidade visual
│   ├── css/app.css         # Design system unificado
│   ├── js/
│   │   ├── common.js       # Utilidades compartilhadas (fetch, toasts, modals)
│   │   ├── auth.js         # Validações e fluxos de login/cadastro
│   │   ├── dashboard.js    # Grade de músicas e trilhas
│   │   ├── player.js       # Player didático com 4 níveis
│   │   └── admin.js        # Estúdio administrativo (CRUD completo)
│   ├── index.html          # Landing page institucional
│   ├── login.html          # Autenticação
│   ├── register.html       # Cadastro com escolha de instrumento
│   ├── dashboard.html      # Trilha do aluno
│   ├── player.html         # Player da aula
│   └── admin.html          # Estúdio administrativo
├── scripts/
│   └── generate-materials.js # Gerador de PDFs demonstrativos
└── src/
    ├── lib/
    │   ├── http.js         # Helpers HTTP e tratamento de erros do Prisma
    │   ├── levels.js       # Fonte única da verdade dos níveis
    │   └── prisma.js       # Cliente compartilhado do Prisma
    ├── middlewares/
    │   ├── authMiddleware.js  # Validação JWT + usuário atualizado
    │   ├── adminMiddleware.js # Controle de permissão de admin
    │   └── rateLimit.js       # Proteção contra força bruta
    ├── routes/
    │   ├── auth.js         # Login, cadastro e /me
    │   ├── api.js          # Músicas, instrumentos e aulas
    │   └── admin.js        # CRUD completo de conteúdo
    └── server.js           # Inicialização do Express
```