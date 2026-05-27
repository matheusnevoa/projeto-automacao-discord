---
status: completed
title: Discord — criar 8 canais novos e aplicar permissões de visibilidade
type: infra
complexity: medium
dependencies:
  - task_01
---

# Task 2: Discord — criar 8 canais novos e aplicar permissões de visibilidade

## Overview

Cria os 8 canais de texto novos dentro das categorias `🔗 GITHUB` e `🤖 AUTOMAÇÕES` e aplica overrides de permissão que escondem ambas as categorias dos roles de cliente, garantindo que atividade de engenharia não vaze para clientes. Esta task entrega os endpoints físicos que receberão webhooks e mensagens nas próximas tasks.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST criar exatamente estes 8 canais como `GuildText` na categoria `🔗 GITHUB`: `github-teste`, `github-commits`, `github-pull-requests`, `github-releases`, `github-actions`.
- MUST criar exatamente estes 3 canais como `GuildText` na categoria `🤖 AUTOMAÇÕES`: `n8n-logs`, `deploys`, `erros-producao`.
- MUST seguir naming convention lowercase-com-hifens (consistente com `chat-clientes`, `banco-de-dados`).
- MUST aplicar override "View Channel = deny" para qualquer role identificado como de cliente nas duas categorias (herdado pelos canais).
- MUST NOT criar canais fora destas duas categorias.
- MUST NOT modificar permissões dos canais ou categorias preexistentes.
- SHOULD documentar quais role IDs foram tratados como "cliente" durante a aplicação das permissões.
</requirements>

## Subtasks
- [x] 2.1 Identificar os role IDs de cliente atualmente em uso no servidor (se houver) consultando a estrutura via MCP ou Discord UI.
- [x] 2.2 Criar os 5 canais sob `🔗 GITHUB` via `mcp__discord__discord_create_text_channel`.
- [x] 2.3 Criar os 3 canais sob `🤖 AUTOMAÇÕES` via `mcp__discord__discord_create_text_channel`.
- [x] 2.4 Aplicar override "View Channel = deny" para o(s) role(s) de cliente nas duas novas categorias (manual via Discord UI se o MCP não expuser channel-permission overrides).
- [x] 2.5 Validar via `discord_get_server_info` que os 8 canais aparecem nos `categoryId` corretos.

## Execution Notes

O role tratado como cliente nesta task foi `Clientes` (`1407449603485470881`). O MCP Discord exposto não aceitava `categoryId` em `discord_create_text_channel` e não expunha overrides de permissão; por isso, a criação dos canais com `parent_id` e os overrides de categoria foram aplicados via Discord REST API usando o mesmo bot configurado localmente para o MCP.

Channel IDs criados para uso na task_03:

| Channel | ID | Category |
|---|---:|---|
| `github-teste` | `1509247712166416566` | `🔗 GITHUB` (`1509246632514814134`) |
| `github-commits` | `1509247713827622962` | `🔗 GITHUB` (`1509246632514814134`) |
| `github-pull-requests` | `1509247715140174075` | `🔗 GITHUB` (`1509246632514814134`) |
| `github-releases` | `1509247716213919929` | `🔗 GITHUB` (`1509246632514814134`) |
| `github-actions` | `1509247717627658412` | `🔗 GITHUB` (`1509246632514814134`) |
| `n8n-logs` | `1509247719842250864` | `🤖 AUTOMAÇÕES` (`1509246652781821972`) |
| `deploys` | `1509247721851326515` | `🤖 AUTOMAÇÕES` (`1509246652781821972`) |
| `erros-producao` | `1509247723701014649` | `🤖 AUTOMAÇÕES` (`1509246652781821972`) |

## Implementation Details

Cada canal é criado individualmente com `mcp__discord__discord_create_text_channel`, recebendo `guildId=1402242287110590596` e o `categoryId` retornado pela task_01. Permissões de visibilidade são aplicadas no nível da **categoria** (não canal-a-canal) para que canais novos herdem automaticamente — se o MCP não suportar esse override, aplicar pela Discord UI (Edit Category → Permissions).

Referência: TechSpec sections "System Architecture → Component Overview" e "Development Sequencing → Build Order" passos 4, 5.

### Relevant Files
- `.compozy/tasks/discord-novo/_techspec.md` — Build Order steps 4 (channels) e 5 (permissions).
- `.compozy/tasks/discord-novo/_prd.md` — Core Features F1 e F2 (listagem exata dos canais).
- `.compozy/tasks/discord-novo/task_01.md` — fornece categoryIds usados aqui.

### Dependent Files
- `task_03.md` — criará 1 webhook por canal criado nesta task.

### Related ADRs
- [ADR-002: Minimal MVP Scope](adrs/adr-002.md) — Define exatamente quais canais existem no MVP.
- [ADR-003: Organize by Event Type](adrs/adr-003.md) — Justifica os 4 canais de event-type específicos.

## Deliverables
- 5 canais criados em `🔗 GITHUB`: `#github-teste`, `#github-commits`, `#github-pull-requests`, `#github-releases`, `#github-actions`.
- 3 canais criados em `🤖 AUTOMAÇÕES`: `#n8n-logs`, `#deploys`, `#erros-producao`.
- Permissão "View Channel = deny" aplicada a qualquer role de cliente nas duas categorias.
- Lista de `channelId` (snowflake) de cada canal criado, registrada para uso na task_03.
- Unit tests com 80%+ coverage **(REQUIRED)** — verificações pós-criação via MCP.
- Integration tests para visibilidade **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] Cada `discord_create_text_channel` retorna `id` numérico válido e `categoryId` igual ao esperado.
  - [x] Os 8 nomes de canal aparecem em `discord_get_server_info` exatamente como especificados (lowercase, com hífens).
  - [x] Nenhum canal foi criado fora das duas categorias-alvo.
- Integration tests:
  - [x] Após a task, `discord_get_server_info` reporta 17 canais de texto (9 antigos + 8 novos) e 5 canais de voz (inalterados).
  - [x] Membro com role de cliente (teste manual com conta secundária ou inspeção via Discord UI) NÃO vê as categorias `🔗 GITHUB` e `🤖 AUTOMAÇÕES`.
  - [x] Membro do time (sem role de cliente) vê as duas categorias e seus 8 canais.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Os 8 canais novos visíveis para o time interno, ocultos para clientes.
- Lista de channelIds documentada e disponível para a task_03.
- Estrutura prévia (9 canais texto + 5 voz nas categorias originais) intacta.
