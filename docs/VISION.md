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
- **Participantes** — adiciona outros usuários (busca por nome, filtro por instrumento).
- **Rede / descoberta** — na busca de participantes, filtrar por **todos** ou **só a minha rede** (pessoas que o usuário segue); quem já está marcado na sessão continua visível na rede para poder desmarcar.
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

- **Seguir / deixar de seguir** outros músicos (relação assimétrica tipo “follow”).
- **Tela de amigos / rede** — listar quem você segue, explorar **todos** os perfis disponíveis e uma camada de **amigos de amigos** (sugestões a partir de quem você segue).
- **Busca independente por aba** — cada visão (seguindo, sugestões, todos) tem o próprio campo de busca; o filtro não se propaga entre abas.
- Visualizar repertório de quem segue (produto alvo; ainda não no protótipo).
- **Futuro:** recomendações mais ricas (gosto musical, jams em comum, etc.).

No **protótipo HTML** (ver secção abaixo), a rede é simulada com músicos mock, grafo fixo “quem conhece quem” para amigos de amigos, e dados de demo marcados como fictícios; persistência só no navegador (`localStorage`).

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

## Protótipo (`prototype/index.html`)

Protótipo **somente front-end**, sem servidor: catálogo, repertórios, perfil, jam e rede social simulados ficam no **localStorage** do navegador.

| Área | O que o protótipo cobre hoje |
|------|------------------------------|
| **Participantes da jam** | Modal “Choose participants”: busca por nome, filtro por instrumento, **Scope** (*Everyone* / *My network* — rede = quem o usuário segue, mais quem já está na sessão), checkboxes e **Follow / Following** por músico mock. |
| **Seguir** | Lista de IDs seguidos por conta (chave = e-mail do utilizador autenticado, ou convidado); partilhado entre jam e painel Friends. |
| **Friends (dock)** | Nova área na navegação inferior: abas **Following** → **Friends of friends** → **Everyone**; cada aba tem **campo de busca próprio**; cartões com nome, instrumentos, ação Follow e etiqueta **Mock** (roster fictício). |
| **Dados de demo** | IDs extra fundidos nas listas para as três abas nunca ficarem vazias no demo; amigos de amigos usam um mapa estático “mutual” entre mocks além das sugestões derivadas de quem você segue. |
| **Idioma da UI** | Textos da interface do protótipo em **inglês** (alinhado ao restante do HTML). |

Isto serve para **validar fluxos** (rede + jam + descoberta) antes da API real (`SocialService`, filtros na listagem de utilizadores, etc.).

## Possíveis evoluções

- Histórico de sessões.
- Evitar músicas tocadas recentemente.
- Recomendar músicas para aprender.
- Sugestão de músicos compatíveis.
- Criação de bandas / grupos fixos.
- Sistema de votação durante a jam.

## Pontos em aberto (para definir)

- **Como adicionar participantes na sessão?** No protótipo: busca + instrumento + rede/geral + follow inline. No produto: validar se basta busca global + filtro “só rede”, se entra **QR / convite**, ou lista curada de **recentes**.
- **Sessão é persistida ou efêmera?**
- **Repertório é privado ou público?** (e o que é visível por padrão)

## Casos de uso

| Caso | Fluxo |
|------|--------|
| Criar sessão | Usuário cria sessão → adiciona participantes → sistema gera setlist. |
| Atualizar repertório | Usuário adiciona música → define nível. |
| Buscar catálogo | Frontend carrega músicas + artistas. |
| Gerir rede (protótipo) | Dock **Friends** → abas Following / Friends of friends / Everyone → busca por aba → Follow ou unfollow; jam reutiliza a mesma lista de seguidos no filtro “My network”. |

## Filosofia do projeto

- **Simplicidade primeiro** (MVP).
- **Evolução incremental**.
- **Otimização só quando necessário**.
- **Contrato estável**, implementação evolutiva.

## Objetivo final

Reduzir fricção em jam sessions e tornar a experiência mais **fluida**, **variada** e **divertida** através de sugestões inteligentes de repertório.
