# Jam Session Assistant

Aplicação para ajudar músicos a **organizar e otimizar sessões de jam presenciais**, sugerindo automaticamente uma sequência de músicas que o grupo consiga tocar, reduzindo tempo de decisão e aumentando a diversidade do repertório.

## Documentação

- [Visão, requisitos e arquitetura (alto nível)](docs/VISION.md)
- Convenções para agentes (Cursor): [`.cursor/rules/jam-session-conventions.mdc`](.cursor/rules/jam-session-conventions.mdc)
- Notas do agente no frontend: [`frontend/AGENTS.md`](frontend/AGENTS.md)

## Stack planejada (resumo)

| Camada | Escolha |
|--------|---------|
| Frontend | Next.js / React |
| Auth, base de dados e API | [Supabase](https://supabase.com) (Auth, Postgres; migrações versionadas em `supabase/`) |
| Observabilidade | Supabase (dashboard, logs) e ferramentas da plataforma onde o Next.js é alojado |

## Repositório

Monorepo: `frontend/` (Next.js), `supabase/` (migrações e CLI), `.github/` (CI).

## Desenvolvimento

1. `npm install` na **raiz** do repositório (ativa [Husky](https://typicode.github.io/husky/) e o hook `pre-commit` que corre `npm run lint` em `frontend/`).
2. `cd frontend && npm install` para dependências da app.

## Licença

A definir.
