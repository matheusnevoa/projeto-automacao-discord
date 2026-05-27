---
status: completed
title: n8n — implementar Code - Format Release
type: backend
complexity: low
dependencies:
    - task_05
---

# Task 8: n8n — implementar Code - Format Release

## Overview

Implementa o formatter do evento `release`: anuncia uma release publicada com embed azul contendo versão, autor, descrição curta e link. Ignora actions transientes (`created`, `prereleased`, `edited`) e dispara apenas em `published`.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST adicionar node `Code - Format Release` conectado à saída `release` do Switch.
- MUST emitir mensagem apenas quando `body.action === 'published'`; outras actions retornam `[]`.
- MUST montar embed cor azul (`0x3498db`) com título = `repo · vTAG`, descrição = primeiros ~500 chars de `release.body` (changelog), field `Publicado por`, link para release.
- MUST setar `targetChannelUrl = $vars.DISCORD_WH_TESTE` na Phase 1.
- MUST NOT injetar `<@&dev-alerts>` mention.
- SHOULD usar `🏷️` como prefix visual no título.
</requirements>

## Subtasks
- [x] 8.1 Adicionar node `Code - Format Release` em JavaScript após branch `release` do Switch.
- [x] 8.2 Filtrar `action !== 'published'` retornando `[]`.
- [x] 8.3 Montar embed azul com title/description (truncada)/author/url.
- [x] 8.4 Setar `targetChannelUrl = $vars.DISCORD_WH_TESTE`.

## Implementation Details

Padrão simétrico aos outros formatters. Cor e shape do embed definidos no TechSpec section "Data Models → DiscordEmbed".

Referência: TechSpec section "Implementation Design → Core Interfaces" e "Build Order" passo 11.

### Relevant Files
- `.compozy/tasks/discord-novo/_techspec.md` — Core Interfaces; Build Order step 11.
- `.compozy/tasks/discord-novo/adrs/adr-006.md`.

### Dependent Files
- `task_10.md` — HTTP Request consumirá os itens deste formatter.
- `task_12.md` — substituirá `$vars.DISCORD_WH_TESTE` por `$vars.DISCORD_WH_RELEASES`.

### Related ADRs
- [ADR-006: One Code Node per Event Type](adrs/adr-006.md).

## Deliverables
- Node `Code - Format Release` no workflow, conectado à branch `release`.
- Saída emite 1 item para `published`, 0 para qualquer outra action.
- Unit tests com 80%+ coverage **(REQUIRED)**.
- Integration tests **(REQUIRED)**.

## Tests
- Unit tests (pin-data):
  - [x] `action=published` → 1 item, embed azul (`0x3498db`), título contém `repo · v1.2.3`.
  - [x] `action=created` → 0 itens.
  - [x] `action=edited` → 0 itens.
  - [x] `release.body` com 1500 chars → embed.description truncada a ~500 chars com sufixo `…`.
  - [x] `release.body` vazio/null → embed.description vazia ou ausente, sem erro.
  - [x] Nenhum item tem `discordPayload.content`.
- Integration tests:
  - [ ] Execute Manually com payload `release published` real → 1 output, formato válido.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Apenas `published` gera anúncio; rascunhos e edições são silenciados.
- Embed contém versão (tag), autor e link para release no GitHub.
