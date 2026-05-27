---
status: completed
title: n8n — popular Variables (DISCORD_WH_*, DEV_ALERTS_ROLE_ID, GITHUB_WEBHOOK_SECRET)
type: infra
complexity: low
dependencies:
    - task_01
    - task_03
---

# Task 4: n8n — popular Variables (DISCORD_WH_*, DEV_ALERTS_ROLE_ID, GITHUB_WEBHOOK_SECRET)

## Overview

Centraliza toda a configuração sensível do pipeline em n8n Variables, acessíveis via `{{$vars.NOME}}` dentro dos nodes. Esta task transforma URLs/IDs/segredos efêmeros (capturados nas tasks anteriores) em fonte de verdade rotacionável pela UI do n8n, sem precisar mexer no JSON do workflow.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST criar exatamente as 10 Variables listadas na tabela "Data Models → n8n Variables" do TechSpec, com os nomes exatos.
- MUST gerar `GITHUB_WEBHOOK_SECRET` como uma string aleatória ≥32 caracteres (URL-safe), nunca reusar uma chave existente.
- MUST popular `DEV_ALERTS_ROLE_ID` com o snowflake do role criado na task_01.
- MUST popular `DISCORD_WH_TESTE`, `DISCORD_WH_COMMITS`, `DISCORD_WH_PRS`, `DISCORD_WH_RELEASES`, `DISCORD_WH_ACTIONS`, `DISCORD_WH_N8N_LOGS`, `DISCORD_WH_DEPLOYS`, `DISCORD_WH_ERROS_PRODUCAO` com as URLs capturadas na task_03.
- MUST NOT armazenar nenhum desses valores em arquivos do repositório.
- MUST verificar no painel de Settings → Variables que cada valor foi salvo (não fica em branco por timeout ou erro silencioso).
</requirements>

## Subtasks
- [ ] 4.1 Gerar `GITHUB_WEBHOOK_SECRET` (`openssl rand -base64 32` ou equivalente) e copiar.
- [ ] 4.2 Acessar `n8n.futurestation.com.br` → Settings → Variables → Add Variable, e criar `GITHUB_WEBHOOK_SECRET`.
- [ ] 4.3 Criar `DEV_ALERTS_ROLE_ID` colando o ID da task_01.
- [ ] 4.4 Criar as 8 variáveis `DISCORD_WH_*` colando as URLs da task_03 (uma por uma).
- [ ] 4.5 Validar que todas as 10 variáveis aparecem na lista com valores não-vazios.

## Implementation Details

n8n Variables ficam em Settings → Variables (n8n self-hosted Enterprise tem esta UI; em planos sem Variables nativas, usar Credentials customizadas como fallback — confirmar antes de iniciar). As variáveis são acessíveis via `{{$vars.NOME}}` em qualquer node a partir do momento que existem; não requerem restart.

Referência: TechSpec sections "Implementation Design → Data Models → n8n Variables" e "Development Sequencing → Build Order" passo 2.

### Relevant Files
- `.compozy/tasks/discord-novo/_techspec.md` — Data Models: tabela de Variables; Build Order step 2.
- `.compozy/tasks/discord-novo/task_01.md` — fornece `DEV_ALERTS_ROLE_ID`.
- `.compozy/tasks/discord-novo/task_03.md` — fornece os 8 webhook URLs.

### Dependent Files
- `task_05.md` — workflow lê `$vars.GITHUB_WEBHOOK_SECRET` e `$vars.DISCORD_WH_TESTE`.
- `task_06.md`, `task_07.md`, `task_08.md`, `task_09.md` — formatters leem `$vars.DEV_ALERTS_ROLE_ID` (apenas task_09 efetivamente).

### Related ADRs
- [ADR-004: HTTP Request to Discord Channel Webhook](adrs/adr-004.md) — Justifica URLs por canal.
- [ADR-005: HMAC-SHA256 Verification in Phase 1](adrs/adr-005.md) — Justifica `GITHUB_WEBHOOK_SECRET`.

## Deliverables
- 10 entradas em `Settings → Variables` com valores válidos.
- `GITHUB_WEBHOOK_SECRET` é único, recém-gerado, e armazenado em local seguro fora do repositório (para configurar GitHub na task_11).
- Unit tests com 80%+ coverage **(REQUIRED)** — verificações em workflow descartável.
- Integration tests **(REQUIRED)**.

## Tests
- Unit tests:
  - [ ] Criar um workflow descartável "test-vars" com um Set node que lê `{{$vars.DISCORD_WH_TESTE}}` e verifica que o valor casa com `https://discord.com/api/webhooks/...`.
  - [ ] Repetir para `DEV_ALERTS_ROLE_ID` — verificar que retorna string numérica ≥17 dígitos.
  - [ ] Repetir para `GITHUB_WEBHOOK_SECRET` — verificar que retorna string ≥32 chars.
- Integration tests:
  - [ ] No mesmo workflow descartável, um Code node faz `crypto.createHmac('sha256', $vars.GITHUB_WEBHOOK_SECRET).update('test').digest('hex')` e retorna um valor não-vazio.
  - [ ] Deletar o workflow descartável após validação.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- As 10 Variables aparecem em `Settings → Variables` com valores populados.
- Workflow descartável de validação confirma que `{{$vars.NOME}}` resolve corretamente para os 10 nomes.
- `GITHUB_WEBHOOK_SECRET` documentado em ferramenta de senhas para uso na task_11 (configuração GitHub).
