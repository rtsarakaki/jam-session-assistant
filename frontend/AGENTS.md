# Agent notes — `frontend/` (Jam Session)

## Next.js

O bloco no topo deste ficheiro (nextjs-agent-rules) aplica-se a versões recentes do Next.js: verifica APIs em `node_modules/next/dist/docs/` quando houver dúvida.

## Convenções deste projecto

### Camada `lib/platform` (ACL)

- **Auth, sessão e acesso a dados** passam por `@/lib/platform`, não por `@/lib/supabase/*` na app.
- Rotas OAuth: `@/lib/platform/oauth-routes`.
- Proxy (Edge): `@/lib/supabase/middleware-auth` (import relativo a partir de `proxy.ts` na raiz do `frontend/`).
- Detalhes e lista de exports: `lib/platform/index.ts`.

### UI em inglês

- Texto visível ao utilizador (labels, botões, erros de formulário, títulos de páginas de UI): **inglês**.

### Onde está o quê

| Área | Caminho |
|------|---------|
| App Router | `app/` |
| Área autenticada | `app/(private)/` |
| Auth (login, signup, OAuth) | `app/auth/` |
| Componentes partilhados | `components/` |
| Validação | `lib/validation/` |
| Plataforma (fachada) | `lib/platform/` |
| Adaptador Supabase (interno) | `lib/supabase/` |

### Monorepo (fora de `frontend/`)

- Migrações e CLI Supabase: **`../supabase/`** (ver `../supabase/README.md`).
- Workflow de migrações: **`../.github/workflows/supabase-migrations.yml`**.
- Na **raiz** do repo: `npm install` ativa Husky; o **pre-commit** corre `npm run verify` (`lint` + `test:coverage` com **≥ 80%** nos ficheiros listados em `vitest.config.ts`).

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
