# Jam Session Assistant

Aplicação para ajudar músicos a **organizar e otimizar sessões de jam presenciais**: sugere uma sequência de músicas que o grupo consiga tocar, reduz tempo de decisão e aumenta a diversidade do repertório.

## O que tem neste repositório

Monorepo com frontend Next.js, projeto Supabase (schema como código) e CI para migrações.

| Pasta / ficheiro | Descrição |
|------------------|-----------|
| [`frontend/`](frontend/) | App [Next.js](https://nextjs.org) (App Router), autenticação e UI. |
| [`supabase/`](supabase/) | `config.toml`, `migrations/`, `seed.sql` — evolução da base versionada no Git. |
| [`.github/workflows/`](.github/workflows/) | GitHub Actions (por exemplo, aplicar migrações no projeto Supabase remoto). |
| [`.cursor/rules/`](.cursor/rules/) | Convenções para assistentes de código (Cursor). |

## Stack (resumo)

| Camada | Escolha |
|--------|---------|
| Frontend | Next.js / React |
| Auth, base de dados e API | [Supabase](https://supabase.com) (Auth, Postgres; migrações em `supabase/`) |
| Observabilidade | Dashboard e logs do Supabase + ferramentas do provedor onde o Next.js é implantado |

## Documentação

- [Visão, requisitos e arquitetura](docs/VISION.md)
- Convenções para agentes (Cursor): [`.cursor/rules/jam-session-conventions.mdc`](.cursor/rules/jam-session-conventions.mdc)
- Notas para quem mexe no app: [`frontend/AGENTS.md`](frontend/AGENTS.md)
- Supabase local / CI e secrets: [`supabase/README.md`](supabase/README.md)

## Como rodar o frontend

**Pré-requisitos:** Node.js (versão compatível com o Next do projeto) e npm.

Na raiz do clone:

```bash
npm install
cd frontend && npm install
```

Copia as variáveis de ambiente (ver [`frontend/.env.example`](frontend/.env.example)) para `frontend/.env.local` e preenche URL e chaves do Supabase.

```bash
cd frontend && npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Outros comandos úteis (dentro de `frontend/`):

- `npm run build` — build de produção
- `npm run lint` — ESLint
- `npm run test` — testes unitários (Vitest)
- `npm run test:coverage` — testes com cobertura (mínimo **80%** nas pastas definidas em `vitest.config.ts`)
- `npm run verify` — `lint` + `test:coverage` (é o que o **pre-commit** executa)

## Git hooks (Husky)

Depois de `npm install` na **raiz**, o Git usa o hook **pre-commit** que executa `npm run verify` em `frontend/` (**lint** + **testes com cobertura ≥ 80%** nas áreas cobertas pelo Vitest). Commits com falha de lint ou de cobertura são bloqueados. Para pular em emergência: `HUSKY=0 git commit …` (evite no fluxo normal).

## Licença

A definir.
