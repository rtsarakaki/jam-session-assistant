# 04. Domain and Information Architecture

## Entidades principais

```mermaid
erDiagram
  PROFILE ||--o{ REPERTOIRE_SONG : has
  PROFILE ||--o{ PROFILE_FOLLOW : follows
  PROFILE ||--o{ FEED_POST : authors
  PROFILE ||--o{ AGENDA_EVENT : creates
  SONG ||--o{ REPERTOIRE_SONG : referenced_by
  SONG ||--o{ FEED_POST : linked_in
  JAM_SESSION ||--o{ JAM_PARTICIPANT : contains
  PROFILE ||--o{ JAM_PARTICIPANT : joins
  JAM_SESSION ||--o{ JAM_SONG_REQUEST : receives
```

## Regras de negocio relevantes

- `Repertoire_Song` representa capacidade declarada individual.
- Flag `Any song (full repertoire)` amplia elegibilidade no calculo de quem "sabe tocar".
- Feed e agenda preservam continuidade operacional entre sessoes.
- Rede de follows define alcance social e relevancia de descoberta.
