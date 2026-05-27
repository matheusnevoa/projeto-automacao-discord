---
status: completed
title: n8n — implementar Code - Format Action (failure detection + @dev-alerts mention)
type: backend
complexity: medium
dependencies:
    - task_05
---

# Task 9: n8n — implementar Code - Format Action (failure detection + @dev-alerts mention)

## Overview

Implementa o formatter dos eventos `workflow_run` e `deployment_status` (o único formatter que injeta o mention `<@&dev-alerts>`). Emite mensagem verde em sucesso e mensagem vermelha com mention em falha. Por design (ADR-003 + ADR-006), este é o único caminho do pipeline que pode acionar push notification no celular dos membros opt-in.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST adicionar node `Code - Format Action` conectado às saídas `workflow_run` E `deployment_status` do Switch (uma única implementação, dois inputs).
- MUST detectar falha: para `workflow_run`, `conclusion === 'failure'`; para `deployment_status`, `state === 'failure'`.
- MUST em falha: definir `discordPayload.content = "<@&" + $vars.DEV_ALERTS_ROLE_ID + "> 🚨 ..."` (descrição curta do problema) e color = `0xe74c3c` (vermelho).
- MUST em sucesso: omitir `discordPayload.content` (sem mention) e color = `0x2ecc71` (verde).
- MUST emitir mensagem apenas quando `workflow_run.action === 'completed'` ou quando `deployment_status` tem `state` em `{success, failure}`; ignorar estados transientes (`pending`, `in_progress`, `queued`) retornando `[]`.
- MUST montar embed com fields: workflow/environment name, branch (se aplicável), status, link para run.
- MUST setar `targetChannelUrl = $vars.DISCORD_WH_TESTE` na Phase 1.
- MUST validar que `$vars.DEV_ALERTS_ROLE_ID` não está vazio antes de montar o mention; se vazio, log warning e seguir sem mention para evitar publicar `<@&>` literal.
</requirements>

## Subtasks
- [x] 9.1 Adicionar node `Code - Format Action` em JavaScript; conectar duas branches do Switch (`workflow_run` e `deployment_status`) ao mesmo node.
- [x] 9.2 Implementar detecção de evento (`workflow_run` vs `deployment_status`) lendo `headers["x-github-event"]`.
- [x] 9.3 Implementar lógica de filtro de estado transiente.
- [x] 9.4 Implementar branching success vs failure (cor + mention).
- [x] 9.5 Validar presença de `$vars.DEV_ALERTS_ROLE_ID` antes de injetar mention.
- [x] 9.6 Setar `targetChannelUrl = $vars.DISCORD_WH_TESTE`.

## Implementation Details

Este é o único formatter que injeta o mention. A lógica deve ser conservadora: se a leitura do role ID falhar (variable removida), preferir publicar sem mention a publicar com mention quebrado. Cor de erro é vermelho (`0xe74c3c`), sucesso verde (`0x2ecc71`), seguindo TechSpec section "Data Models → DiscordEmbed".

Referência: TechSpec section "Implementation Design → Core Interfaces" e ADR-006 (failure-detection responsability).

### Relevant Files
- `.compozy/tasks/discord-novo/_techspec.md` — Core Interfaces; Build Order step 11.
- `.compozy/tasks/discord-novo/adrs/adr-006.md` — explicita que este é o único formatter com mention.

### Dependent Files
- `task_10.md` — HTTP Request consumirá os itens.
- `task_12.md` — substituirá `$vars.DISCORD_WH_TESTE` por `$vars.DISCORD_WH_ACTIONS`.

### Related ADRs
- [ADR-006: One Code Node per Event Type](adrs/adr-006.md).
- [ADR-003: Organize by Event Type](adrs/adr-003.md) — failures vão para um canal único.

## Deliverables
- Node `Code - Format Action` no workflow, recebendo duas branches do Switch.
- Saída emite 1 item para eventos terminais (success/failure), 0 para estados transientes.
- Failure path inclui mention `<@&{ROLE_ID}>` em `content`.
- Success path não inclui mention.
- Unit tests com 80%+ coverage **(REQUIRED)**.
- Integration tests **(REQUIRED)**.

## Tests
- Unit tests (pin-data):
  - [x] `workflow_run` com `action=completed, conclusion=failure` → 1 item, content começa com `<@&` seguido do ROLE_ID, color `0xe74c3c`.
  - [x] `workflow_run` com `action=completed, conclusion=success` → 1 item, content ausente/vazio, color `0x2ecc71`.
  - [x] `workflow_run` com `action=requested` ou `in_progress` → 0 itens.
  - [x] `deployment_status` com `state=failure` → 1 item com mention.
  - [x] `deployment_status` com `state=success` → 1 item sem mention.
  - [x] `deployment_status` com `state=pending` → 0 itens.
  - [x] Quando `$vars.DEV_ALERTS_ROLE_ID` está vazio e o evento é failure → item emitido sem mention, log warning.
- Integration tests:
  - [ ] Execute Manually com payload `workflow_run completed failure` real → 1 output com mention; manual POST do output para webhook do `#github-teste` pinga uma conta com o role.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Failures sempre incluem mention (se ROLE_ID presente); sucessos nunca incluem.
- Estados transientes não geram ruído.
- Robusto a `DEV_ALERTS_ROLE_ID` ausente (fail-open sem mention, com log).
