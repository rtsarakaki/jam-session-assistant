# Jam Session Assistant

Aplicação para ajudar músicos a **organizar e otimizar sessões de jam presenciais**, sugerindo automaticamente uma sequência de músicas que o grupo consiga tocar, reduzindo tempo de decisão e aumentando a diversidade do repertório.

## Documentação

- [Visão, requisitos e arquitetura (alto nível)](docs/VISION.md)

## Stack planejada (resumo)

| Camada | Escolha |
|--------|---------|
| Frontend | Next.js / React |
| Auth, base de dados e API | [Supabase](https://supabase.com) (Auth, Postgres; migrações versionadas em `supabase/`) |
| Observabilidade | Supabase (dashboard, logs) e ferramentas da plataforma onde o Next.js é alojado |

## Repositório

Monorepo — a estrutura de pastas (`apps/`, `packages/`, infra) será definida conforme o MVP evoluir.

## Licença

A definir.
