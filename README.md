# Desafio-de-Automacao-de-Testes-de-API

# API Tests - Serverest (Desafio)

## Visão geral
Conjunto de testes automatizados para a API de usuários (CRUD). Implementado com Mocha, Chai e Axios. Gera relatório HTML via Mochawesome e integra-se com GitHub Actions.

## Requisitos
- Node.js 18+ / 20+
- NPM
- Acesso à API (ex.: https://serverest.dev)
- Credenciais de usuário administrador para autenticação (JWT)

## Como rodar localmente
1. Clone:
   ```bash
   git clone <repo-url>
   cd api-tests

2. Crie .env:
cp .env.example .env
# edite .env e informe API_BASE_URL, ADMIN_EMAIL e ADMIN_PASSWORD

3. Instale dependências:
npm ci

4. Executar testes:
npm test

5. Relatório:
Após execução, o relatório HTML ficará em reports/mochawesome.html.
Abra no navegador.

Integração CI (GitHub Actions)
O workflow .github/workflows/ci-tests.yml executa testes em pushes/PRs nas branches main/master.

Configure os Secrets do repositório:
API_BASE_URL
ADMIN_EMAIL
ADMIN_PASSWORD

O relatório HTML é publicado como artefato da execução do workflow.
Casos de teste cobertos
Autenticação via JWT (obtenção do token).
POST /users — criação correta de usuário.
GET /users — listagem e presença do usuário criado.
GET /users/{id} — leitura de usuário por id.
PUT /users/{id} — atualização de dados do usuário.
DELETE /users/{id} — exclusão do usuário.

Validações de campos obrigatórios (nome, email, password, administrador).
Proteção de endpoints (rejeição quando sem token).
Rate-limit: envio de 101 requisições para verificar aparecimento de 429 Too Many Requests.

Observações
Ajuste os endpoints no config.js caso a API mude caminhos.
O teste de rate-limit busca pelo menos uma resposta 429 para evitar falsos positivos por diferenças de throttle entre ambientes.
Caso a API retorne estruturas diferentes (ex.: wrapper data), os testes têm tentativas de leitura flexíveis mas podem precisar de ajustes pontuais.

