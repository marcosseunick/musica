Projeto Musica 🎵

📌 Visão Geral do Sistema

O projeto Musica é uma plataforma web de ensino musical focada no aprendizado de Violão e Teclado. O sistema conta com autenticação de usuários, painel administrativo, dashboard de alunos e um reprodutor integrado para o consumo de materiais didáticos estruturados em arquivos PDF.

🛠️ Stack Tecnológico

Backend: Node.js (Servidor Express/Nativo)

Banco de Dados: Prisma ORM (Migrações e população inicial via seed.js)

Frontend: HTML5, CSS3 via Tailwind CSS (tailwind.config.js) e Vanilla JavaScript.

📂 Arquitetura e Mapeamento de Diretórios

Abaixo está a estrutura principal do projeto e a responsabilidade de cada diretório/arquivo para facilitar o entendimento do fluxo de dados:

1. Backend (/src e raiz)

src/server.js: Ponto central de inicialização da API e orquestração do servidor web.

src/routes/: Controladores de rotas separados por domínio:

api.js: Endpoints gerais da aplicação.

auth.js: Lógica de login, registro e autenticação.

admin.js: Rotas restritas ao painel de administração.

src/middlewares/: Camada de segurança e interceptação.

authMiddleware.js: Valida o acesso de usuários logados.

adminMiddleware.js: Restringe acesso às rotas de gestão.

src/lib/prisma.js: Instância do Prisma Client para conexão com o banco de dados.

prisma/: Contém o schema do banco (schema.prisma), histórico de migrações e o script de seed inicial (seed.js).

scripts/generate-materials.js: Automação para gerar ou indexar os materiais didáticos em PDF.

2. Frontend (/public)

Views (*.html):

index.html: Landing page.

login.html / register.html: Fluxo de onboarding.

dashboard.html: Área logada do aluno.

player.html: Interface do reprodutor de aulas.

admin.html: Interface de gestão do sistema.

Lógica de Interface (/public/js/): Scripts isolados por view (admin.js, auth.js, dashboard.js, player.js, common.js).

Estilização (/public/css/): Arquivo principal app.css processado pelo Tailwind.

📚 Estrutura de Materiais Didáticos (/public/materials/)

A engine de aulas do sistema é baseada em arquivos estáticos, organizada hierarquicamente para facilitar a navegação do usuário e a indexação pelo sistema. A estrutura segue o padrão:

[Instrumento] -> [Nível de Dificuldade] -> [Aulas e Cifras]

Exemplo de Árvore:

/teclado ou /violao

/facil

/medio

/dificil

/avancado

Padrão de Arquivos por Módulo:
Cada pasta de nível de dificuldade contém obrigatoriamente a seguinte trilha de arquivos PDF:

aula1_partitura.pdf

aula2_partitura.pdf

aula3_partitura.pdf

cifra_completa.pdf (Asset de consolidação prática)
