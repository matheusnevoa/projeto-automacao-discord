# Rotacionar o secret HMAC compartilhado (`GITHUB_WEBHOOK_SECRET`)

Procedimento pra trocar o `GITHUB_WEBHOOK_SECRET` usado entre o GitHub e o
`WF-GH-Discord` no n8n. Esta é a **única** operação que toca múltiplos
repositórios de uma vez — todos os webhooks ativos precisam ser atualizados
no mesmo lote, senão eventos começam a ser rejeitados como `HMAC_INVALID`.

## Quando rotacionar

- Dev com acesso ao secret saiu do time/cliente
- Suspeita de leak (alguém viu por cima do ombro, screenshot, log público)
- Auditoria periódica (recomendado a cada 6 meses)
- Mudança de fase do projeto (Phase 2 → Phase 3 — ao conectar primeiro repo de produção real)

## Pré-requisitos

- Acesso de admin no [Portainer](https://portainer.futurestation.com.br) (stack `n8n`)
- `gh` CLI autenticado com scope `repo` ou `admin:repo_hook` em **cada repo** conectado
- Janela de manutenção de ~2 min (entregas durante a troca podem cair em `HMAC_INVALID`)
- Lista dos repos conectados (próxima seção)

## Inventário: quais repos estão conectados?

Pipeline não tem source-of-truth centralizado dos repos conectados. As 3
formas de descobrir:

**1. Olhando o `Recent Deliveries` no n8n** — abre o n8n editor, vai em
Executions de `WF-GH-Discord`, agrupa por `repository.full_name` nos itens
dos últimos N dias.

**2. Olhando hooks de cada repo conhecido** — você mantém uma lista interna
(planilha, anota neste repo, etc.). Pra confirmar que um repo está mesmo
conectado:

```bash
gh api /repos/OWNER/REPO/hooks --jq '.[] | select(.config.url | contains("webhook.futurestation.com.br")) | {id, events, active}'
```

**3. Procurando pela URL do n8n no GitHub Enterprise/Organization Settings**
(se você estiver numa org com acesso a webhooks da organização) — esta opção
não se aplica ao setup atual.

**Recomendação:** mantém uma lista em `docs/connected-repos.md` (gitignored
ou só com identificadores não-secretos) atualizada conforme novos repos
entram via [onboard-repo.md](onboard-repo.md).

## Procedimento (passo-a-passo)

### 1. Gerar o novo secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Anota o valor em local seguro temporariamente. Vamos chamar de
`<NEW_SECRET>`.

### 2. Atualizar a env var no n8n via Portainer

Via dockerProxy do Portainer (ou MCP equivalente):

1. `GET /services/{n8n_n8n_editor_id}` — guarda a `Spec` atual e o
   `Version.Index`
2. Localiza `TaskTemplate.ContainerSpec.Env`, substitui a linha
   `GITHUB_WEBHOOK_SECRET=<old>` por `GITHUB_WEBHOOK_SECRET=<NEW_SECRET>`
3. `POST /services/{id}/update?version={Version.Index}` com o Spec inteiro
   atualizado (incrementa `TaskTemplate.ForceUpdate`)
4. Aguarda ~45s pro rolling redeploy completar e n8n voltar a responder
   200 em `/healthz`

**⚠️ Cuidado conhecido:** o serviço n8n_n8n_editor pode crashar no boot
se o volume `n8n_data` tiver `@n8n/n8n-nodes-langchain` como community
package — ver memória `n8n-langchain-duplicate-trap`. Se já caiu nessa
antes (Maio/2026), `N8N_REINSTALL_MISSING_PACKAGES=false` deve estar no
Env e o pacote duplicado já foi removido. Se voltar a falhar, consulta a
memória.

### 3. Atualizar todos os webhooks no GitHub

Pra cada repo conectado, faz `PATCH` no hook trocando o `config[secret]`.
Script em loop (lista `REPOS` precisa estar atualizada):

```bash
REPOS=(
  matheusnevoa/projeto-automacao-discord
  # adiciona aqui conforme onboarding
)

NEW_SECRET='<NEW_SECRET>'

for repo in "${REPOS[@]}"; do
  # descobre o hook ID que aponta pro nosso n8n
  HOOK_ID=$(gh api /repos/$repo/hooks \
    --jq '.[] | select(.config.url | contains("webhook.futurestation.com.br")) | .id')

  if [ -z "$HOOK_ID" ]; then
    echo "⚠️  $repo — nenhum hook do n8n encontrado, pula"
    continue
  fi

  gh api -X PATCH "/repos/$repo/hooks/$HOOK_ID" \
    -f "config[secret]=$NEW_SECRET" \
    -f "config[url]=$(gh api /repos/$repo/hooks/$HOOK_ID --jq .config.url)" \
    -f "config[content_type]=json" \
    -f "config[insecure_ssl]=0" \
    > /dev/null && echo "✓ $repo (hook $HOOK_ID rotacionado)"
done

unset NEW_SECRET
```

Nota: o GitHub API requer reenviar `url` + `content_type` + `insecure_ssl`
juntos com `secret` no `config` (não suporta patch parcial dentro do
config). O script acima preserva os valores existentes.

### 4. Validar

1. Faz um commit pequeno em **qualquer** dos repos conectados
2. Espera ~5s
3. Confirma execução `success` em `WF-GH-Discord` (n8n Executions)
4. Confirma mensagem em `#github-commits`

Se uma das entregas falhar com `HMAC_INVALID` em algum repo, refaz o
`PATCH` daquele hook — pode ter ficado pra trás no loop por falta de
permissão (o token usado precisa de admin no repo).

### 5. Limpar o secret antigo

- Apaga o valor antigo de qualquer anotação temporária
- Confirma que nenhum repo restou com o secret velho (a primeira entrega
  pós-rotação já valida isso — qualquer entrega `HMAC_INVALID` aponta
  pra um repo que ficou pra trás)

## Janela de inconsistência

Entre **passo 2** (n8n boota com secret novo) e **passo 3** (todos os
hooks atualizados) qualquer entrega que GitHub mandar com o secret velho
vai falhar `HMAC_INVALID` → cai no `WF-ERR Global` → email + Airtable +
`#erros-producao`.

Pra **minimizar** a janela: prepara o loop do passo 3 antes, dispara
imediatamente após o n8n voltar (`/healthz` 200).

Pra **eliminar** a janela: aceitar uma estratégia dual-secret
(workflow valida contra um set de 2 secrets durante a transição) — não
implementado hoje, exige mudança no `Code - Verify HMAC`.

## Off-boarding completo (desconectar tudo)

Se quiser desligar o pipeline inteiro temporariamente:

```bash
# desativa o workflow n8n (mantém todos os webhooks GitHub funcionando do lado deles,
# mas n8n não vai mais processar)
# via n8n MCP ou UI: deactivate workflow mtRu7rZlq0p5GJ6G
```

Se quiser remover **só** um repo do pipeline, ver
[onboard-repo.md → Off-boarding](onboard-repo.md#off-boarding-remover-repo-do-pipeline).

## Histórico de rotações

| Data | Motivo | Quem |
|---|---|---|
| 2026-05-27 | Setup inicial Phase 1 (geração do primeiro secret) | matheusnevoa |
