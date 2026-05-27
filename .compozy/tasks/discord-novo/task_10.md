---
status: completed
title: "n8n — wiring Phase 1 (HTTP Request → #github-teste) + pin-data unit tests"
type: test
complexity: medium
dependencies:
    - task_06
    - task_07
    - task_08
    - task_09
---

# Task 10: n8n — wiring Phase 1 (HTTP Request → #github-teste) + pin-data unit tests

## Overview

Conecta todos os 4 formatters (Push, PR, Release, Action) a um único node HTTP Request que publica em `#github-teste` na Phase 1, executa a bateria de pin-data unit tests definida no TechSpec, ativa o workflow, e confirma que cada cenário de teste passa antes de qualquer integração com GitHub. Esta task é a porta de entrada para a Phase 1 acceptance.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST criar 1 node HTTP Request chamado `HTTP Request - Send to #github-teste`.
- MUST conectar saída dos 4 formatters (`Code - Format Push`, `Code - Format PR`, `Code - Format Release`, `Code - Format Action`) ao mesmo HTTP Request.
- MUST configurar HTTP Request: Method=POST, URL=`{{$json.targetChannelUrl}}`, Body Content Type=JSON, Body=`{{$json.discordPayload}}` (expression), Headers=`Content-Type: application/json`.
- MUST executar pin-data tests do TechSpec section "Testing Approach → Unit Tests" para cada Code node antes de ativar o workflow.
- MUST ativar o workflow somente após todos os pin-data tests passarem.
- MUST NOT configurar GitHub webhook nesta task — isso é responsabilidade da task_11.
- SHOULD pinar payloads reais de cada tipo de evento (extraídos de "Recent Deliveries" de webhooks existentes ou da documentação GitHub) para os pin-data tests.
</requirements>

## Subtasks
- [x] 10.1 Adicionar node `HTTP Request - Send to #github-teste` configurado com URL/body via expressions.
- [x] 10.2 Conectar saídas dos 4 formatters (Push, PR, Release, Action) ao HTTP Request.
- [ ] 10.3 Pin payloads de exemplo nos 4 Code formatters + no Code Verify HMAC.
- [ ] 10.4 Rodar Execute Workflow com cada pin-data e verificar saída esperada (sem ativar o workflow).
- [x] 10.5 Disparar `mcp__n8n__n8n_validate_workflow` para detectar problemas de schema.
- [ ] 10.6 Ativar o workflow após todos os tests passarem.

## Implementation Details

Único HTTP Request usa `targetChannelUrl` carregado em cada item. Como `targetChannelUrl` durante Phase 1 sempre aponta para `$vars.DISCORD_WH_TESTE`, todas as mensagens vão para `#github-teste`. A Phase 2 (task_12) trocará o destino sem alterar o HTTP Request — só atualizando os formatters.

Pin-data tests: cada Code node tem aba "Settings → Pin Data" no n8n; cola um payload JSON e clica em "Execute Node" para verificar o output sem rodar todo o workflow.

Referência: TechSpec section "Testing Approach → Unit Tests" lista os 5 cenários obrigatórios; Build Order passos 8, 9, 11, 12.

### Relevant Files
- `.compozy/tasks/discord-novo/_techspec.md` — Testing Approach; Build Order steps 8-12.
- `.compozy/tasks/discord-novo/task_05.md` até `task_09.md` — fornecem os nodes a serem testados.

### Dependent Files
- `task_11.md` — depende deste workflow estar ativo + testado.

### Related ADRs
- [ADR-004: HTTP Request to Discord Channel Webhook](adrs/adr-004.md) — define o sender pattern.
- [ADR-006: One Code Node per Event Type](adrs/adr-006.md) — fluxo de Code → único HTTP Request.

## Deliverables
- Node `HTTP Request - Send to #github-teste` no workflow, recebendo conexão dos 4 formatters.
- Workflow `WF-GH-Discord` ativo (`active: true`).
- Bateria de pin-data tests documentada (qual payload em qual node, qual output esperado).
- Saída de `n8n_validate_workflow` sem errors.
- Unit tests com 80%+ coverage **(REQUIRED)**.
- Integration tests **(REQUIRED)**.

## Tests
- Unit tests (pin-data inputs nos Code nodes, conforme TechSpec section "Testing Approach"):
  - [ ] `Code - Verify HMAC`: body+signature válidos passam; signature inválido throw; header ausente throw.
  - [ ] `Code - Format Push`: push de 3 commits → 3 itens com SHAs distintos.
  - [ ] `Code - Format PR`: action=opened → 1 item verde "Aberto"; action=closed+merged=true → "Merged".
  - [ ] `Code - Format Release`: action=published → 1 item; action=created → 0 itens.
  - [ ] `Code - Format Action`: conclusion=failure → 1 item com mention; conclusion=success → 1 item sem mention.
- Integration tests:
  - [ ] Após ativar o workflow, manual Execute do node HTTP Request com input pinado de cada formatter → uma mensagem real aparece em `#github-teste` por execução.
  - [ ] `mcp__n8n__n8n_validate_workflow` retorna 0 errors.
  - [ ] Mensagens deletadas após validação para não confundir testes futuros.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Workflow ativo, validator clean, 4 formatters convergindo para 1 HTTP Request.
- Toda mensagem pinada produz a saída esperada em `#github-teste`.
- Pronto para receber GitHub webhooks na task_11.
