# Onboarding de repo novo no pipeline

Como adicionar um repo GitHub novo (seu ou de outro dev) ao pipeline
`WF-GH-Discord`. Tempo médio: **2 minutos** se você tem admin do repo;
**~5 min** se precisar coordenar com o dono.

> **Princípio:** **não precisa duplicar o workflow.** Todos os repos apontam
> pro mesmo endpoint n8n. O workflow já roteia por tipo de evento e identifica
> o repo de origem via `body.repository.full_name`.

## Valores que você vai precisar

Estes **não estão neste repo** (PRD trata como secret). Pega no Portainer ou
pede pra quem opera o n8n:

| Valor | Onde achar |
|---|---|
| **Payload URL** (endpoint do trigger n8n) | Webhook node `webhook_github` no workflow `WF-GH-Discord` no n8n, ou env var `WEBHOOK_URL` + path do trigger |
| **Secret HMAC** (`GITHUB_WEBHOOK_SECRET`) | Env var do serviço `n8n_n8n_editor` no Portainer, stack `n8n` |

## Antes de pedir pro dev, descubra 3 coisas

1. **Nome do repo** no formato `owner/name`
   Exemplo: `joao-dev/api-clientes`, `future-station/web-app`
2. **Quem é admin do repo?** (admin é quem pode criar webhook)
   - Se for **você** → vai pro caminho [Você-mesmo-faz](#caminho-1--você-mesmo-faz-com-gh-cli)
   - Se for **outro dev** → escolhe entre os 3 caminhos abaixo
3. **Tem autorização social?** Se o repo é de cliente/freela, confirma que
   ele aceita os eventos aparecerem na Discord interna

## Perguntas opcionais (vale fazer junto)

| Pergunta | Por quê |
|---|---|
| Branches específicas? (ex.: só `main` e `develop`) | filtro de 1 linha no `Code - Format Push` |
| Bot ruidoso no repo? (Dependabot, Renovate, Snyk) | filtro `sender.login.endsWith('[bot]')` |
| Quer canal próprio? (ex.: `#flutter-app` separado) | criar canal + webhook + mapping no Format node |
| Eventos a ignorar? (ex.: ignorar releases pre-release) | filtro no formatador correspondente |

Se nenhum filtro especial for pedido, o repo cai no fluxo padrão e roteia pra
`#github-commits`, `#github-pull-requests`, `#github-releases`,
`#github-actions`, `#deploys`.

## Caminho 1 — Você mesmo faz (com `gh` CLI)

Só funciona se você tem admin no repo (seu, ou foi adicionado como
collaborator com role Admin). Substitui `OWNER/REPO`, `<PAYLOAD_URL>` e
`<SECRET>` pelos valores reais.

```bash
gh api -X POST /repos/OWNER/REPO/hooks \
  -f name=web \
  -F active=true \
  -F "events[]=push" \
  -F "events[]=pull_request" \
  -F "events[]=release" \
  -F "events[]=workflow_run" \
  -F "events[]=deployment_status" \
  -f config[url]='<PAYLOAD_URL>' \
  -f config[content_type]=json \
  -f config[secret]='<SECRET>' \
  -f config[insecure_ssl]=0
```

Resposta de sucesso traz `"active": true` e o `id` do webhook. Guarda esse
`id` se planeja rotacionar secret no futuro.

## Caminho 2 — Dev faz pela UI do GitHub

Mais simples se o repo é dele e ele não usa `gh` CLI. **Atenção:** ele vai
ver o secret — só use se confia. Template pra mandar no DM dele:

```
Adiciona esse webhook no repo OWNER/NOME pra commits/PRs/releases
aparecerem no Discord da Future Station:

1) Settings → Webhooks → Add webhook
2) Preenche:

   Payload URL:    <PAYLOAD_URL>
   Content type:   application/json
   Secret:         <SECRET>
   SSL:            Enable SSL verification (default)
   Which events:   Let me select individual events →
                   marca push, Pull requests, Releases,
                   Workflow runs, Deployment statuses
   Active:         ✓

3) Add webhook. Me avisa quando terminar que eu valido a primeira
   delivery (você vê em Settings → Webhooks → Recent Deliveries).
```

## Caminho 3 — Dev te adiciona como admin temporário

Zero exposição do secret pro dev externo. Fluxo:

1. Dev abre `Settings → Collaborators → Add` no repo dele
2. Adiciona você (`matheusnevoa`) com role **Admin**
3. Você roda o comando do [Caminho 1](#caminho-1--você-mesmo-faz-com-gh-cli)
4. Dev remove você de Collaborators
5. **O webhook persiste** depois que você sai — controle continua dele

## Caminho 4 — Dev te empresta um PAT só pra isso

Pior do que o 3 (token tem mais poder), mas funciona em situações de
urgência. Fluxo:

1. Dev gera um Personal Access Token só com scope `admin:repo_hook`
2. Manda pra você (DM privado)
3. Você roda: `GH_TOKEN=<token-dele> gh api -X POST /repos/OWNER/REPO/hooks ...`
4. Dev revoga o token imediatamente

## Validar que funcionou (faz logo após adicionar)

1. **GitHub envia um `ping` automaticamente** quando o webhook é criado
2. Em `Settings → Webhooks → Recent Deliveries`, clica no ping
3. Verifica: `Response 200`, sem erro
4. Pede pro dev fazer um commit pequeno em qualquer branch
5. Em ~1 segundo deve aparecer mensagem em `#github-commits` (ou no canal
   alternativo configurado)

**Se não aparecer em 30s:** ver [Troubleshooting](#troubleshooting) abaixo.

## Onboarding em lote (múltiplos repos do mesmo dev)

```bash
for repo in joao-dev/api joao-dev/web joao-dev/mobile; do
  gh api -X POST /repos/$repo/hooks \
    -f name=web -F active=true \
    -F "events[]=push" -F "events[]=pull_request" \
    -F "events[]=release" -F "events[]=workflow_run" \
    -F "events[]=deployment_status" \
    -f config[url]='<PAYLOAD_URL>' \
    -f config[content_type]=json \
    -f config[secret]='<SECRET>' \
    -f config[insecure_ssl]=0
  echo "✓ $repo"
done
```

## Aplicar filtros após onboarding

Filtros vivem nos Code nodes do workflow `WF-GH-Discord` no n8n. Cada
adição é mudança pequena (1–3 linhas) na função do formatter
correspondente. Exemplos:

**Ignorar pushes de bots em todos os repos** — em `Code - Format Push`,
logo após `const commits = ...`:

```js
if (sender.login && sender.login.endsWith('[bot]')) return [];
```

**Só processar push de branches específicas** — em `Code - Format Push`,
após definir `branch`:

```js
const ALLOWED = ['main', 'develop', 'staging'];
if (!ALLOWED.includes(branch)) return [];
```

**Repo específico em canal diferente** — em `Code - Format Push`, trocar
a linha de `targetChannelUrl`:

```js
const channelByRepo = {
  'future-station/app-flutter': $env.DISCORD_WH_FLUTTER,
  'future-station/web-app': $env.DISCORD_WH_WEB,
};
const targetChannelUrl = channelByRepo[repoName] || $env.DISCORD_WH_COMMITS;
```

(precisa criar o canal Discord + webhook + nova env var antes)

**Lembre-se de espelhar a mudança em `tests/code-format-*.test.mjs` e
rodar `npm test` antes de salvar no n8n.**

## Troubleshooting

### Webhook entregou mas não aparece no Discord

1. Ver `Settings → Webhooks → Recent Deliveries` no GitHub:
   - **200 + Response body vazio:** n8n recebeu, problema é downstream → ver execução no n8n
   - **400:** payload mal-formado (raro)
   - **401/403:** secret errado
   - **404:** workflow desativado no n8n
   - **500/504:** n8n caiu ou está reiniciando
2. Se 200: abre n8n editor → workflow `WF-GH-Discord` → Executions → procura
   a execução com `started_at` próximo da hora do delivery
3. Se a execução tem status `error` em `Code - Verify HMAC`:
   secret no GitHub não bate com `$env.GITHUB_WEBHOOK_SECRET` do n8n.
   Recria o webhook no GitHub com o secret correto.

### Recebi `@dev-alerts` mas não era pra ser failure

Provavelmente um `workflow_run` com conclusion `timed_out` ou
`startup_failure`. Por design (review round 1 issue 002), esses contam como
failure — são problemas reais de CI. Se um workflow específico costuma ter
falsos positivos, considere desabilitar Notifications dele no GitHub ou
ignorar pelo nome (ver [filtros](#aplicar-filtros-após-onboarding)).

### Volume de mensagens muito alto

Se `#github-commits` está saturando (>30 msgs/min sustained), aplica:

1. **Curto prazo:** filtro de branches (só `main`)
2. **Médio prazo:** filtro de bots
3. **Longo prazo (Phase 4):** digest format (1 mensagem com N commits agrupados)

### Webhook respondeu 404 num momento específico

Quase sempre é janela de re-registro do trigger n8n (quando alguém salva
mudança no workflow). GitHub geralmente retenta automaticamente. Se uma
entrega importante caiu nessa janela, reentrega manualmente:

```bash
gh api -X POST /repos/OWNER/REPO/hooks/HOOK_ID/deliveries/DELIVERY_ID/attempts
```

(`HOOK_ID` e `DELIVERY_ID` vêm de `gh api /repos/OWNER/REPO/hooks/HOOK_ID/deliveries`)

## Off-boarding (remover repo do pipeline)

Dois caminhos, qualquer um basta:

**Pelo GitHub** (preferido — controle fica com o dev):
```bash
gh api -X DELETE /repos/OWNER/REPO/hooks/HOOK_ID
```

**Pelo n8n** (não recomendado — afeta todos os repos):
Desativar o workflow `WF-GH-Discord` no n8n para evento receber zero.
**Nunca faça isso** — desativa o pipeline inteiro.

## Checklist resumida

- [ ] Coletei `owner/name` do repo
- [ ] Identifiquei quem é admin
- [ ] Confirmei autorização social (se for repo de cliente)
- [ ] Perguntei sobre filtros opcionais (branches/bots/canal)
- [ ] Criei o webhook via Caminho 1/2/3/4
- [ ] Validei o `ping` automático = 200
- [ ] Pedi um commit teste e confirmei mensagem em `#github-commits`
- [ ] (se aplicável) Apliquei filtros no Code node + atualizei testes
