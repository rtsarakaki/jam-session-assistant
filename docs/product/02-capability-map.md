# 02. Capability Map

## Mapa de capacidades de negocio

```mermaid
flowchart TB
  P[Produto: Jam Session Assistant]

  subgraph C1[Planejar e Preparar]
    C11[Gerenciar catalogo de musicas]
    C12[Gerenciar links de apoio<br/>lyrics/listen/karaoke]
    C13[Manter repertorio pessoal]
  end

  subgraph C2[Executar Sessao]
    C21[Formar grupo da jam]
    C22[Sugerir musicas por aderencia]
    C23[Receber solicitacoes da audiencia]
    C24[Ajustar nivel e disponibilidade]
  end

  subgraph C3[Coordenar Comunidade]
    C31[Seguir musicos]
    C32[Compartilhar atualizacoes no feed]
    C33[Gerenciar agenda/eventos]
    C34[Navegar atividades por usuario]
  end

  subgraph C4[Inteligencia Operacional]
    C41[Medir cobertura de repertorio]
    C42[Medir engajamento social]
    C43[Medir desempenho de sessoes]
  end

  P --> C1
  P --> C2
  P --> C3
  P --> C4
```

## Priorizacao sugerida

1. Preparacao (`C1`) e execucao (`C2`) como capacidades core.
2. Comunidade (`C3`) como acelerador de rede.
3. Inteligencia (`C4`) para escalar governanca e melhoria continua.
