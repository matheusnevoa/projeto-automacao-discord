# discord-novo — Task List

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | Discord — criar role @dev-alerts e categorias GITHUB / AUTOMAÇÕES | pending | low | — |
| 02 | Discord — criar 8 canais novos e aplicar permissões de visibilidade | completed | medium | task_01 |
| 03 | Discord — criar 8 webhooks de canal e capturar URLs | pending | low | task_02 |
| 04 | n8n — popular Variables (DISCORD_WH_*, DEV_ALERTS_ROLE_ID, GITHUB_WEBHOOK_SECRET) | pending | low | task_01, task_03 |
| 05 | n8n — criar workflow WF-GH-Discord skeleton (Webhook + HMAC verify + Switch + Error Workflow link) | pending | medium | task_04 |
| 06 | n8n — implementar Code - Format Push (fanout 1 commit = 1 mensagem) | pending | medium | task_05 |
| 07 | n8n — implementar Code - Format PR | pending | low | task_05 |
| 08 | n8n — implementar Code - Format Release | pending | low | task_05 |
| 09 | n8n — implementar Code - Format Action (failure detection + @dev-alerts mention) | pending | medium | task_05 |
| 10 | n8n — wiring Phase 1 (HTTP Request → #github-teste) + pin-data unit tests | pending | medium | task_06, task_07, task_08, task_09 |
| 11 | GitHub — configurar webhook em repo de teste + validação E2E Phase 1 | pending | medium | task_10 |
| 12 | n8n — promoção Phase 2: rewiring para canais dedicados + revalidação | in_progress | medium | task_11 |
