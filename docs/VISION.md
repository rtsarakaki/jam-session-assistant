# Jam Session Assistant — Visão do produto

## Visão geral

Este projeto tem como objetivo criar uma aplicação que ajude músicos a **organizar e otimizar sessões de jam presenciais**, sugerindo automaticamente uma **sequência de músicas** que todos consigam tocar, reduzindo o tempo de decisão e aumentando a diversidade do repertório.

## Problema

Em ambientes onde músicos se reúnem para tocar (por exemplo, sala de música da empresa):

- Os **participantes variam** a cada sessão.
- Não há **visibilidade clara** do repertório de cada músico.
- **Muito tempo** é gasto decidindo o que tocar.
- As **mesmas músicas** são repetidas com frequência.

## Solução

Uma aplicação onde:

1. Músicos **cadastram músicas** que sabem tocar.
2. Indicam **nível de conhecimento** (por exemplo: domina / aprendendo).
3. Durante uma sessão:
   - Um usuário cria uma **Jam Session**.
   - **Adiciona os participantes** presentes.
   - O sistema **sugere automaticamente**:
     - músicas que **todos** conseguem tocar;
     - uma **sequência otimizada** (setlist).

## Conceito central

O sistema funciona como um **motor de geração de setlist para grupos dinâmicos de músicos**, baseado em:

- **Interseção de repertório** (só entram músicas que todos têm).
- **Nível de habilidade** por participante.
- **Diversidade** (evitar repetição desnecessária).

## Funcionalidades principais

### 1. Catálogo musical

- CRUD de **artistas**.
- CRUD de **músicas**.
- Base **comum** para todos os usuários.

### 2. Repertório do músico

- Usuário adiciona músicas ao **seu** repertório.
- Define nível:
  - **`ADVANCED`** — domina bem.
  - **`LEARNING`** — em aprendizado.

### 3. Jam session

- **Criar sessão** — um usuário cria uma sessão.
- **Participantes** — adiciona outros usuários.
- **Gerar setlist** — o sistema calcula:
  - músicas que **todos** conseguem tocar;
  - ranking baseado em:
    - nível médio do grupo;
    - frequência de uso (evitar repetição).

**Contrato de resposta (exemplo):**

```json
{
  "sessionId": "123",
  "suggestedSetlist": [
    {
      "musicId": "1",
      "title": "Song A",
      "confidenceScore": 0.92
    }
  ]
}
```

### 4. Social (opcional / evolutivo)

- Seguir outros músicos.
- Visualizar repertório de quem segue.
- **Futuro:** recomendações baseadas em rede.

## Arquitetura (alto nível)

### Frontend

- **Next.js / React**
- Autenticação via **Clerk**

### Backend (serverless — AWS)

- **API Gateway** — entrada única para todas as requisições.

#### MusicianPlatformService

Responsável por:

- Catálogo
- Repertório
- Jam sessions

**Lambdas:**

- `MusicCatalogLambda`
- `MusicianRepertoireLambda`
- `JamSessionLambda`

**Banco:** DynamoDB (tabela única ou por domínio interno — a definir na implementação).

#### SocialService

Responsável por:

- Follow / unfollow
- Relações entre usuários

**Lambda:** `SocialLambda`

**Banco:** DynamoDB separado.

### Observabilidade

Camada transversal:

- Logs, métricas, tracing.

**Ferramentas:** CloudWatch, X-Ray.

## Lógica de negócio (core)

### Interseção de repertório

Dado um grupo de usuários:

> **Resultado** = músicas que **TODOS** possuem no repertório.

### Score da música

Cada música recebe um score baseado em (conceitualmente):

- **+** nível médio dos participantes naquela música.
- **+** quantidade de usuários que dominam bem.
- **−** penalidade por repetição recente.

### Ordenação (setlist)

O sistema retorna a **lista ordenada por score**.

**Opcionalmente (evolução):**

- alternar dificuldade;
- inserir músicas “desafio leve”.

## Possíveis evoluções

- Histórico de sessões.
- Evitar músicas tocadas recentemente.
- Recomendar músicas para aprender.
- Sugestão de músicos compatíveis.
- Criação de bandas / grupos fixos.
- Sistema de votação durante a jam.

## Pontos em aberto (para definir)

- **Como adicionar participantes na sessão?** Busca por nome? Lista de seguidores? QR code?
- **Sessão é persistida ou efêmera?**
- **Repertório é privado ou público?** (e o que é visível por padrão)

## Casos de uso

| Caso | Fluxo |
|------|--------|
| Criar sessão | Usuário cria sessão → adiciona participantes → sistema gera setlist. |
| Atualizar repertório | Usuário adiciona música → define nível. |
| Buscar catálogo | Frontend carrega músicas + artistas. |

## Filosofia do projeto

- **Simplicidade primeiro** (MVP).
- **Evolução incremental**.
- **Otimização só quando necessário**.
- **Contrato estável**, implementação evolutiva.

## Objetivo final

Reduzir fricção em jam sessions e tornar a experiência mais **fluida**, **variada** e **divertida** através de sugestões inteligentes de repertório.
