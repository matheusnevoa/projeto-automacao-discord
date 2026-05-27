# Future Station — Discord + GitHub + n8n Automation

Pipeline que ingere webhooks do GitHub (push, pull_request, release, workflow_run,
deployment_status), valida assinatura HMAC, formata cada evento como embed do
Discord e posta no canal correto do servidor [Future Station][guild]. Falhas
de Actions/deploy mencionam a role `@dev-alerts`.

```
GitHub repo ─► webhook.futurestation.com.br ─► n8n WF-GH-Discord ─► Discord
              (HMAC-SHA256 verify)            (format por evento)   (1 canal/tipo)
```

## Estado

- **Workflow n8n:** `WF-GH-Discord` (id `mtRu7rZlq0p5GJ6G`) — ativo, Phase 2 wiring
- **Discord guild:** `1402242287110590596` (Future Station)
- **Categorias novas:** `🔗 GITHUB`, `🤖 AUTOMAÇÕES` (escondidas da role `Clientes`)
- **Repo teste E2E:** `matheusnevoa/projeto-automacao-discord` (este aqui)
- **Latência ponta-a-ponta observada:** 0.4–0.8s

## O que mora aqui (planejamento + testes)

```
.compozy/tasks/discord-novo/        PRD, TechSpec, ADRs, plano de tarefas
  _prd.md                           requisitos e success criteria
  _techspec.md                      desenho técnico (componentes, fluxo, vars)
  adrs/                             ADR-001..006 (decisões arquiteturais)
  reviews-001/                      review round 1 (9 issues, 8 resolved, 1 deferred)
  task_NN.md                        breakdown das 12 tarefas de execução

tests/                              espelhos unitários dos Code nodes do n8n
  code-format-action.test.mjs       Format Action (workflow_run + deployment_status)
  code-format-pr.test.mjs           Format PR
  code-format-release.test.mjs      Format Release
  README.md                         contrato de mirror-maintenance

docs/                               runbooks operacionais
  onboard-repo.md                   adicionar repo novo ao pipeline
  rotate-secret.md                  rotacionar GITHUB_WEBHOOK_SECRET

package.json                        `npm test` roda os mirrors (34 tests)
```

O **código que roda em produção** mora **dentro do n8n** (workflow
`mtRu7rZlq0p5GJ6G`), não neste repo. Os `tests/*.mjs` são cópias manuais dos
Code nodes mantidas em sincronia — n8n Code nodes não suportam `import`.

## Como rodar os testes

```bash
npm test    # 34 tests, todos formatadores
```

`node --test tests/` não funciona no Node 22 (vê `tests/README.md` pra detalhes).

## Operações comuns

| Tarefa | Documento |
|---|---|
| Adicionar repo novo de outro dev ao pipeline | [`docs/onboard-repo.md`](docs/onboard-repo.md) |
| Rotacionar o secret HMAC compartilhado | [`docs/rotate-secret.md`](docs/rotate-secret.md) |
| Entender uma decisão arquitetural | `.compozy/tasks/discord-novo/adrs/adr-*.md` |
| Investigar bug / regressão | `.compozy/tasks/discord-novo/reviews-001/issue_*.md` |

## Canais Discord (roteamento por evento)

| Evento GitHub | Canal destino | Cor embed | `@dev-alerts`? |
|---|---|---|---|
| `push` (1 mensagem/commit) | `#github-commits` | verde | não |
| `pull_request` (opened/closed/merged/etc.) | `#github-pull-requests` | laranja | não |
| `release` (só `published`) | `#github-releases` | azul | não |
| `workflow_run` completed | `#github-actions` | vermelho se failure | **sim** se failure |
| `deployment_status` (só success/failure) | `#deploys` | vermelho se failure | **sim** se failure |
| (exceções não capturadas) | `#erros-producao` | via WF-ERR Global | sim |
| (warnings — deferred) | `#n8n-logs` | — | — |

## Limites práticos atuais

- **Discord webhook:** 30 msgs/min por canal — `#github-commits` é o primeiro a estourar
- **n8n editor:** 1 CPU, 1 GB — handles milhares de eventos/dia
- **GitHub:** sem limite no número de repos apontando pro mesmo n8n endpoint
- **Repos suportados:** indefinido — só limitado por rate do Discord

## Referências externas (não-secret)

- n8n editor: <https://n8n.futurestation.com.br>
- Webhook ingress host: `webhook.futurestation.com.br` (path/secret só no Portainer)
- Discord guild: `1402242287110590596`
- Error workflow handler: `WF-ERR Global` (id `9LyR0kYZIl6x8Dgk`)
