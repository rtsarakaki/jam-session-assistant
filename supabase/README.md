# Supabase (schema como código)

Este diretório é o **projeto Supabase** deste repositório: migrações SQL, seeds e configuração local (`config.toml`) ficam versionados no Git e descrevem a evolução da base de dados.

O frontend em `../frontend` consome o projeto Supabase hospedado (URL + chaves em `.env.local`); este projeto não duplica segredos.

## Pré-requisitos

- [Supabase CLI](https://supabase.com/docs/guides/cli) instalada (`supabase --version`), ou uso via `npx supabase@latest`.

## Comandos úteis

Na raiz do repositório (onde está esta pasta `supabase/`):

| Objetivo | Comando |
|----------|---------|
| Subir stack local (Postgres, Studio, API) | `supabase start` |
| Nova migração vazia | `supabase migration new nome_da_alteracao` |
| Aplicar migrações ao projeto **remoto** ligado | `supabase db push` (na CI usamos `db push --yes --include-all` para alinhar histórico quando há migrações antigas só no Git) |
| Comparar remoto com migrações locais | `supabase db diff` |
| Ligar CLI ao projeto cloud | `supabase link --project-ref <ref>` |

Documentação: [Local development](https://supabase.com/docs/guides/cli/local-development) e [Database migrations](https://supabase.com/docs/guides/deployment/database-migrations).

## Estrutura

- `config.toml` — portas e opções do ambiente local gerido pela CLI.
- `migrations/*.sql` — histórico ordenado de alterações ao schema (fonte de verdade).
- `seed.sql` — dados de exemplo após `db reset` (opcional).

### Tabelas de domínio (exemplos)

- **`public.profiles`** — uma linha por utilizador (`id` = `auth.users.id`): nome público, bio, **`instruments` (`text[]`)** lista de rótulos (presets + extras); RLS para o utilizador só ler/alterar a própria linha. Criação automática em novo signup + backfill em migração.

## GitHub Actions

O workflow [`.github/workflows/supabase-migrations.yml`](../.github/workflows/supabase-migrations.yml) corre em cada **push para `main`** que altere ficheiros em `supabase/migrations/`, e pode ser disparado manualmente (**Actions → Supabase — aplicar migrações → Run workflow**).

No GitHub do repositório: **Settings → Secrets and variables → Actions → New repository secret**. Cria **três** secrets com estes nomes exatos e os valores indicados abaixo.

### 1. `SUPABASE_ACCESS_TOKEN`

- **Não** é a “anon key”, “service role”, JWT nem nada de **Project Settings → API Keys**. Esses valores começam muitas vezes por `eyJ...` ou são chaves longas do projeto — a CLI rejeita-os com *“Invalid access token format. Must be like `sbp_0102...1920`”*.
- Tem de ser um token da **tua conta** Supabase, no formato **`sbp_`** seguido de caracteres alfanuméricos.
- Abre **[Access Tokens](https://supabase.com/dashboard/account/tokens)** (perfil → *Account* / *Access Tokens*).
- **Generate new token**, copia-o **uma vez** (só aparece na criação) e cola no secret `SUPABASE_ACCESS_TOKEN` no GitHub (sem espaços antes/depois, uma única linha).

### 2. `SUPABASE_PROJECT_ID`

- É o **reference ID** do projeto (string curta, não a URL completa).
- Está na URL quando estás dentro do projeto:  
  `https://supabase.com/dashboard/project/<ISTO_É_O_ID>/...`
- Ou em **Project Settings** (ícone de engrenagem) → **General** → campo tipo **Reference ID**.

### 3. `SUPABASE_DB_PASSWORD`

- É a **password do utilizador `postgres`** da base (a que escolheste ao criar o projeto, ou que definiste depois).
- **Project Settings** → **Database** → secção da password da base (podes **Reset database password** se não te lembrares; depois atualiza este secret no GitHub).

---

Isto alinha com a [documentação oficial](https://supabase.com/docs/guides/deployment/managing-environments#configure-github-actions). As chaves em **Settings → API Keys** servem para o **frontend** (`.env.local`), não para estes três secrets da Action.

Para **staging** e **produção** separados, duplica o workflow ou usa secrets distintos por ambiente, como no [exemplo oficial](https://supabase.com/docs/guides/deployment/managing-environments#configure-github-actions).
