---
status: completed
title: n8n — criar workflow WF-GH-Discord skeleton (Webhook + HMAC verify + Switch + Error Workflow link)
type: backend
complexity: medium
dependencies:
    - task_04
---

# Task 5: n8n — criar workflow WF-GH-Discord skeleton (Webhook + HMAC verify + Switch + Error Workflow link)

## Overview

Cria o esqueleto do workflow central `WF-GH-Discord` na instância `n8n.futurestation.com.br`: Webhook Trigger (endpoint público), Code node de verificação HMAC, Switch por `x-github-event`, e configuração do Error Workflow apontando para `WF-ERR Global` (id `9LyR0kYZIl6x8Dgk`). O workflow nasce **desativado** — só ativa após o pipeline completo (task_10).

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST nomear o workflow exatamente `WF-GH-Discord` (consistente com padrão `WF-*` da instância).
- MUST criar Webhook Trigger node configurado com HTTP Method = POST, Response Mode = onReceived (retorno imediato), e path autogerado pelo n8n.
- MUST criar `Code - Verify HMAC` node imediatamente após o Webhook Trigger, lendo `$vars.GITHUB_WEBHOOK_SECRET` e header `x-hub-signature-256` (ver TechSpec ADR-005 para snippet de referência).
- MUST fazer o Code lançar `Error('HMAC_INVALID')` em mismatch (não retornar silenciosamente).
- MUST criar Switch node após o Verify HMAC, roteando por `{{$json.headers["x-github-event"]}}` com branches: `push`, `pull_request`, `release`, `workflow_run`, `deployment_status`, `default` (ignored).
- MUST configurar Workflow Settings → "Error Workflow" = workflow id `9LyR0kYZIl6x8Dgk` (`WF-ERR Global`).
- MUST deixar o workflow desativado (`active: false`).
- MUST NOT conectar branches do Switch a nenhum HTTP Request ainda — as conexões viram nas tasks 06-09.
- SHOULD nomear nodes consistentemente: `Webhook`, `Code - Verify HMAC`, `Switch - Route by Event`.
</requirements>

## Subtasks
- [ ] 5.1 Criar workflow `WF-GH-Discord` via `mcp__n8n__n8n_create_workflow`.
- [ ] 5.2 Adicionar Webhook Trigger node com path autogerado e método POST.
- [ ] 5.3 Adicionar `Code - Verify HMAC` que implementa o snippet de verificação (ADR-005) e throw on mismatch.
- [ ] 5.4 Adicionar `Switch - Route by Event` com 5 branches nomeadas + default.
- [ ] 5.5 Configurar Error Workflow = `9LyR0kYZIl6x8Dgk` em Settings.
- [ ] 5.6 Salvar workflow desativado; anotar o webhook URL gerado para usar na task_11.

## Implementation Details

Workflow estrutural mostrado no TechSpec section "System Architecture → Data Flow". Padrão de naming `Code - <Purpose>` segue convenção observada em `WF1`. O snippet de HMAC está em ADR-005; copiar literalmente como ponto de partida e ajustar para a versão do n8n se `crypto.timingSafeEqual` não estiver disponível no Code runtime.

Referência: TechSpec sections "Implementation Design → Core Interfaces", "Data Flow", e "Development Sequencing → Build Order" passos 7 e 10.

### Relevant Files
- `.compozy/tasks/discord-novo/_techspec.md` — Data Flow diagram; Build Order steps 7, 10.
- `.compozy/tasks/discord-novo/adrs/adr-005.md` — snippet HMAC.
- `.compozy/tasks/discord-novo/adrs/adr-001.md` — justifica workflow único.

### Dependent Files
- `task_06.md`, `task_07.md`, `task_08.md`, `task_09.md` — anexam Code formatters a cada branch do Switch.
- `task_11.md` — usa o webhook URL gerado por este workflow para configurar GitHub.

### Related ADRs
- [ADR-001: n8n as Central Hub](adrs/adr-001.md) — single-workflow design.
- [ADR-005: HMAC-SHA256 Verification](adrs/adr-005.md) — código do Verify HMAC.
- [ADR-006: One Code Node per Event Type](adrs/adr-006.md) — justifica o Switch (não Code-único).

## Deliverables
- Workflow `WF-GH-Discord` existente no n8n, desativado, com id registrado.
- 3 nodes conectados na ordem: `Webhook` → `Code - Verify HMAC` → `Switch - Route by Event`.
- Error Workflow configurado para `WF-ERR Global`.
- Webhook URL gerado anotado (será usado na task_11 para configurar GitHub).
- Unit tests com 80%+ coverage **(REQUIRED)** — pin-data no Code HMAC.
- Integration tests **(REQUIRED)** — workflow execution com payload sintético.

## Tests
- Unit tests (pin-data no `Code - Verify HMAC`):
  - [ ] Body fixo `{"action":"opened"}` + header `x-hub-signature-256` calculado corretamente com `$vars.GITHUB_WEBHOOK_SECRET` → passa adiante.
  - [ ] Mesmo body + signature alterado em 1 byte → throw com mensagem `HMAC_INVALID`.
  - [ ] Header `x-hub-signature-256` ausente → throw com mensagem `HMAC_INVALID`.
- Integration tests:
  - [ ] Workflow Execute Manually com payload de evento `push` válido + signature correto → execução chega ao branch `push` do Switch sem erro.
  - [ ] Mesmo payload com signature inválido → execução para no Code HMAC, dispara `WF-ERR Global`, gera registro em Airtable.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Workflow `WF-GH-Discord` existe, está desativado, e tem Error Workflow apontando para `WF-ERR Global`.
- Pin-data tests no `Code - Verify HMAC` passam para os 3 cenários (válido, inválido, ausente).
- Webhook URL anotado para uso futuro.
