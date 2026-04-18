# Jam Session Assistant

Aplicação para ajudar músicos a **organizar e otimizar sessões de jam presenciais**, sugerindo automaticamente uma sequência de músicas que o grupo consiga tocar, reduzindo tempo de decisão e aumentando a diversidade do repertório.

## Documentação

- [Visão, requisitos e arquitetura (alto nível)](docs/VISION.md)

## Stack planejada (resumo)

| Camada | Escolha |
|--------|---------|
| Frontend | Next.js / React, autenticação [Clerk](https://clerk.com) |
| Backend | AWS serverless: API Gateway, Lambda, DynamoDB |
| Observabilidade | CloudWatch, X-Ray |

## Repositório

Monorepo — a estrutura de pastas (`apps/`, `packages/`, infra) será definida conforme o MVP evoluir.

## Licença

A definir.
