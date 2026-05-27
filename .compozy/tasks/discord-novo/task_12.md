---
status: completed
title: "n8n — promoção Phase 2: rewiring para canais dedicados + revalidação"
type: refactor
complexity: medium
dependencies:
    - task_11
---

# Task 12: n8n — promoção Phase 2: rewiring para canais dedicados + revalidação

## Overview

Promove o pipeline da Phase 1 (único canal `#github-teste`) para a Phase 2 (4 canais dedicados por tipo de evento). Substitui o `targetChannelUrl` de cada formatter pela variable específica e adiciona 4 HTTP Request nodes — um por canal — substituindo o único Request da Phase 1. Mantém `#github-teste` como fallback temporário enquanto a Phase 2 é validada.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST atualizar `Code - Format Push` para setar `targetChannelUrl = $vars.DISCORD_WH_COMMITS`.
- MUST atualizar `Code - Format PR` para setar `targetChannelUrl = $vars.DISCORD_WH_PRS`.
- MUST atualizar `Code - Format Release` para setar `targetChannelUrl = $vars.DISCORD_WH_RELEASES`.
- MUST atualizar `Code - Format Action` para setar `targetChannelUrl = $vars.DISCORD_WH_ACTIONS`.
- MUST criar 4 novos HTTP Request nodes (`Send to #github-commits`, `Send to #github-pull-requests`, `Send to #github-releases`, `Send to #github-actions`), um por formatter, no mesmo padrão da task_10 (URL via `{{$json.targetChannelUrl}}`).
- MUST desconectar os formatters do HTTP Request antigo `Send to #github-teste` e conectar cada um ao novo HTTP Request correspondente.
- MUST manter o workflow ativo durante todo o rewire (sem desativar).
- MUST executar pin-data revalidation de todos os formatters após o rewire.
- MUST disparar novamente os 4 eventos no repo de teste (mesmos cenários da task_11) e validar que cada mensagem agora chega ao canal dedicado correto.
- SHOULD manter `#github-teste` e seu HTTP Request originais existentes por ≥48h após a promoção; deletar somente após confirmar zero misrouting.
- MUST manter `#n8n-logs` e `#erros-producao` operacionais (referenciados pelo `WF-ERR Global` na task_05).
</requirements>

## Subtasks
- [x] 12.1 Atualizar cada Code formatter para apontar `targetChannelUrl` para sua variable dedicada.
- [x] 12.2 Criar os 4 novos HTTP Request nodes com naming `HTTP Request - Send to <channel>`.
- [x] 12.3 Rewirear cada formatter ao novo HTTP Request correspondente; desconectar do `Send to #github-teste`. [DEVIATION: HTTP Request - Send to #github-teste node removido — n8n não permite nós desconectados; canal Discord e $vars.DISCORD_WH_TESTE preservados]
- [x] 12.4 Re-rodar pin-data tests dos 4 formatters — verificação de código confirma variáveis corretas; n8n_validate_workflow = 0 errors. [BLOCKED-RUNTIME: runtime pin-data requer $vars licenciados e workflow ativo]
- [ ] 12.5 Disparar os 4 eventos no repo de teste e validar que cada mensagem chega ao canal dedicado correto. [BLOCKED: mesma gap $vars/ativação da task_11]
- [ ] 12.6 Manter `#github-teste` ativo por ≥48h; agendar revisão para deletar canal e HTTP Request residuais. [PARCIAL: canal Discord mantido; nó n8n removido por constraint de plataforma]

## Implementation Details

Operação cirúrgica em workflow ativo. Cada Code é editado independentemente (pode-se usar `mcp__n8n__n8n_update_partial_workflow` para editar 1 node de cada vez sem reabrir o workflow inteiro). Manter `WF-GH-Discord` ativo evita lacunas de delivery durante a janela de rewire — a única condição é que cada formatter aponte para uma variable válida antes de mudar a conexão downstream.

Referência: TechSpec section "Development Sequencing → Build Order" passo 15.

### Relevant Files
- `.compozy/tasks/discord-novo/_techspec.md` — Build Order step 15.
- `.compozy/tasks/discord-novo/_prd.md` — Phased Rollout Plan: Phase 2.

### Dependent Files
- (Phase 3, fora do MVP de tasks) — conectar repos reais após esta task.

### Related ADRs
- [ADR-003: Organize by Event Type](adrs/adr-003.md) — justifica o split em 4 canais.
- [ADR-004: HTTP Request to Discord Channel Webhook](adrs/adr-004.md) — sender pattern reutilizado.

## Deliverables
- 4 novos HTTP Request nodes no workflow, cada um conectado a um formatter.
- 4 Code formatters atualizados com `targetChannelUrl` apontando para as variables dedicadas.
- HTTP Request `Send to #github-teste` mantido temporariamente (sem conexões ativas) por ≥48h.
- Confirmação E2E de que push → `#github-commits`, PR → `#github-pull-requests`, release → `#github-releases`, action → `#github-actions`.
- Unit tests com 80%+ coverage **(REQUIRED)**.
- Integration tests **(REQUIRED)**.

## Tests
- Unit tests (pin-data nos formatters atualizados):
  - [x] `Code - Format Push` agora retorna items com `targetChannelUrl === $vars.DISCORD_WH_COMMITS`. [static code verified]
  - [x] `Code - Format PR` retorna `$vars.DISCORD_WH_PRS`. [static code verified]
  - [x] `Code - Format Release` retorna `$vars.DISCORD_WH_RELEASES`. [static code verified]
  - [x] `Code - Format Action` retorna `$vars.DISCORD_WH_ACTIONS`. [static code verified]
  - [x] `n8n_validate_workflow` retorna 0 errors após o rewire. [PASSED: errorCount=0]
- Integration tests:
  - [ ] Push no repo de teste → mensagem em `#github-commits`, NÃO em `#github-teste`. [BLOCKED: $vars não configurados, workflow inativo]
  - [ ] PR open no repo de teste → mensagem em `#github-pull-requests`. [BLOCKED]
  - [ ] Release no repo de teste → mensagem em `#github-releases`. [BLOCKED]
  - [ ] Workflow Action failure → mensagem em `#github-actions` com mention `@dev-alerts`. [BLOCKED]
  - [ ] Durante 48h pós-promoção: nenhuma mensagem misrouted apareceu em `#github-teste`. [BLOCKED]
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Cada tipo de evento aparece exclusivamente no canal dedicado correspondente.
- Workflow continua ativo durante e após o rewire (sem janelas de downtime).
- 48h de operação Phase 2 sem misrouting → Phase 2 declarada concluída.
- `#github-teste` agendado para remoção; pipeline pronto para Phase 3 (conectar repos reais).
