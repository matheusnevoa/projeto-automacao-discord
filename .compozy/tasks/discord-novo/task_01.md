---
status: completed
title: Discord — criar role @dev-alerts e categorias GITHUB / AUTOMAÇÕES
type: infra
complexity: low
dependencies: []
---

# Task 1: Discord — criar role @dev-alerts e categorias GITHUB / AUTOMAÇÕES

## Overview

Prepara a base estrutural do servidor Discord da Future Station para a automação GitHub → n8n → Discord: cria o role `@dev-alerts` (manualmente, pela UI) e as duas novas categorias temáticas (`🔗 GITHUB` e `🤖 AUTOMAÇÕES`) via MCP, sem mover nem renomear nenhum canal pré-existente. Essa task estabelece os contêineres aos quais as próximas tasks anexarão canais e webhooks.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST criar o role `@dev-alerts` manualmente via Discord UI (MCP Discord não expõe criação de roles).
- MUST configurar o role `@dev-alerts` como mentionable.
- MUST anotar o role ID (numeric snowflake) imediatamente após a criação para uso na task_04.
- MUST criar a categoria `🔗 GITHUB` no servidor `Future Station` (guildId `1402242287110590596`) usando `mcp__discord__discord_create_category`.
- MUST criar a categoria `🤖 AUTOMAÇÕES` no mesmo servidor.
- MUST posicionar as duas novas categorias após `Canais de Texto` e `Canais de Voz` (não antes).
- MUST NOT modificar, renomear ou deletar qualquer categoria/canal existente.
- SHOULD validar via `mcp__discord__discord_get_server_info` que as duas categorias aparecem na lista após criação.
</requirements>

## Subtasks
- [ ] 1.1 Criar role `@dev-alerts` no Discord (Server Settings → Roles → Create Role), marcar como mentionable.
- [ ] 1.2 Copiar o ID numérico do role recém-criado (right-click → Copy ID).
- [x] 1.3 Criar categoria `🔗 GITHUB` via MCP Discord.
- [x] 1.4 Criar categoria `🤖 AUTOMAÇÕES` via MCP Discord.
- [x] 1.5 Confirmar via `discord_get_server_info` que ambas as categorias existem e o restante da estrutura está intacto.

## Implementation Details

Usa o MCP Discord (servidor `mcp-discord`, bot `claudinha#3001`) para criar as categorias. O role é criado pela UI porque o MCP não expõe role management. A ordem das categorias é controlada pelo Discord conforme a sequência de criação — confirmar visualmente que ficam abaixo das duas categorias atuais.

Referência: TechSpec sections "System Architecture → Component Overview" e "Development Sequencing → Build Order" passos 1, 3.

### Relevant Files
- `.compozy/tasks/discord-novo/_techspec.md` — Build Order steps 1 (role), 3 (categories).
- `.compozy/tasks/discord-novo/_prd.md` — Core Features F1, F2, F3.

### Dependent Files
- `task_02.md` — criará canais dentro destas categorias.
- `task_04.md` — usará o role ID em `$vars.DEV_ALERTS_ROLE_ID`.

### Related ADRs
- [ADR-002: Minimal MVP Scope](adrs/adr-002.md) — Justifica criar só estas duas categorias sem mexer no resto.

## Deliverables
- Role `@dev-alerts` existente, mentionable, com ID anotado fora do repositório.
- Categoria `🔗 GITHUB` criada no servidor.
- Categoria `🤖 AUTOMAÇÕES` criada no servidor.
- Estrutura existente do servidor confirmadamente intacta (9 canais de texto + 5 canais de voz nas categorias originais).
- Unit tests com 80%+ coverage **(REQUIRED)** — neste caso, "testes" são verificações via MCP imediatamente após criação (assertions sobre o resultado do `discord_get_server_info`).
- Integration tests para presença e ordenação das categorias **(REQUIRED)**.

## Tests
- Unit tests:
  - [ ] Após `discord_create_category`, a resposta retorna `id` numérico válido.
  - [ ] `discord_get_server_info` lista a categoria recém-criada com `type === "GuildCategory"`.
  - [ ] Role ID copiado é uma string numérica de ≥17 dígitos (formato snowflake).
- Integration tests:
  - [ ] `discord_get_server_info` mostra exatamente 4 categorias após esta task (2 antigas + 2 novas).
  - [ ] Os 9 canais de texto originais continuam dentro de `Canais de Texto` (categoryId inalterado).
  - [ ] Os 5 canais de voz originais continuam dentro de `Canais de Voz`.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Categorias `🔗 GITHUB` e `🤖 AUTOMAÇÕES` aparecem no sidebar do Discord.
- Role `@dev-alerts` existe e é mentionable; ID registrado para uso na task_04.
- Nenhuma alteração observada em canais ou categorias preexistentes.
