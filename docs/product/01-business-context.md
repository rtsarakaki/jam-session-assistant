# 01. Business Context

## Objetivo de negocio

Reduzir o tempo de coordenacao antes da execucao musical, aumentar previsibilidade de sessao e sustentar continuidade da comunidade.

## Stakeholders

- Musico participante (core user)
- Organizador de jam / anfitriao
- Publico que solicita musicas
- Operacao de produto

## Contexto e fronteiras

```mermaid
flowchart LR
  U[Musicos e comunidade] --> P[Jam Session Assistant]
  O[Organizadores de jam] --> P
  A[Publico/Audiencia] --> P

  P --> C[Catalogo de musicas]
  P --> R[Repertorio por usuario]
  P --> J[Motor de jam e sugestoes]
  P --> F[Rede social e feed]
  P --> E[Agenda e eventos]

  T[Plataformas externas de conteudo<br/>Lyrics/Video/Karaoke] --> P
```

## Proposta de valor

- Menos friccao para decidir o que tocar.
- Mais transparencia sobre quem sabe cada musica.
- Continuidade entre sessoes via feed, agenda e rede.
