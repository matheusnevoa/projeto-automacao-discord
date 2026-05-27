---
status: completed
title: GitHub — configurar webhook em repo de teste + validação E2E Phase 1
type: test
complexity: medium
dependencies:
    - task_10
---

# Task 11: GitHub — configurar webhook em repo de teste + validação E2E Phase 1

## Overview

Conecta o pipeline ao mundo real: configura um webhook GitHub em 1 repositório de teste (preferencialmente um sandbox com baixíssimo tráfego), dispara manualmente cada um dos 4 tipos de evento, e valida visualmente que cada mensagem chega ao `#github-teste` no formato esperado. É o teste de aceitação da Phase 1.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST escolher 1 repositório GitHub de teste (baixo tráfego, idealmente sandbox).
- MUST configurar webhook no repositório com: Payload URL = URL gerada pelo Webhook Trigger da task_05; Content type = `application/json`; Secret = mesmo valor de `$vars.GITHUB_WEBHOOK_SECRET` definido na task_04; SSL verification = enabled; Events = `Just the events I select` → `Pushes`, `Pull requests`, `Releases`, `Workflow runs`, `Deployment statuses`.
- MUST validar que a "Recent Deliveries" do webhook no GitHub mostra a entrega inicial com response 200/204.
- MUST gerar manualmente cada um dos 4 tipos de evento no repositório de teste e confirmar mensagem em `#github-teste`:
  - 1 push (commit pequeno em branch sandbox).
  - 1 PR aberto + 1 PR merged.
  - 1 release publicada (pode ser pre-release ou draft promovida).
  - 1 GitHub Actions falhando deliberadamente (workflow simples com `exit 1`).
- MUST confirmar que a mensagem de falha do GitHub Actions menciona o role `@dev-alerts` e dispara push notification em uma conta com o role aplicado.
- MUST verificar que durante todos os testes, nenhum canal preexistente do servidor recebeu mensagem indevida.
- SHOULD documentar quaisquer divergências visuais (typo, cor errada, link quebrado) como bugs a corrigir antes de promover para Phase 2.
</requirements>

## Subtasks
- [ ] 11.1 Escolher repo de teste e validar permissão `admin:repo_hook` (ou acesso UI a Repository Settings → Webhooks).
- [ ] 11.2 Criar o webhook no GitHub com URL/secret/events conforme requirements.
- [ ] 11.3 Disparar push, PR open, PR merge, release publish, workflow failure no repo.
- [ ] 11.4 Validar visualmente em `#github-teste` que cada mensagem chega com formato correto.
- [ ] 11.5 Validar que `@dev-alerts` dispara push notification em failure.
- [ ] 11.6 Documentar bugs encontrados (se houver) em `.compozy/tasks/discord-novo/_phase1-bugs.md` e re-rodar.

## Implementation Details

URL do webhook GitHub é a "Production URL" do Webhook Trigger do `WF-GH-Discord` (anotada na task_05). Secret deve ser exatamente o mesmo string armazenado em `$vars.GITHUB_WEBHOOK_SECRET`; qualquer diferença → todas as deliveries falham com `HMAC_INVALID`.

Em caso de falha geral (nenhuma mensagem chegando), checar nessa ordem: (1) "Recent Deliveries" do GitHub mostra response code; (2) n8n Executions mostra que a execução chegou ou não; (3) `WF-ERR Global` registra erros em Airtable.

Referência: TechSpec section "Testing Approach → Integration Tests" e Build Order passos 13, 14.

### Relevant Files
- `.compozy/tasks/discord-novo/_techspec.md` — Testing Approach; Build Order steps 13-14.
- `.compozy/tasks/discord-novo/_prd.md` — Phased Rollout Plan: Phase 1 acceptance criteria.

### Dependent Files
- `task_12.md` — só inicia após a Phase 1 ser aprovada visualmente nesta task.

### Related ADRs
- [ADR-005: HMAC-SHA256 Verification in Phase 1](adrs/adr-005.md) — secret deve casar em ambos os lados.

## Deliverables
- Webhook configurado e ativo em 1 repositório de teste.
- Histórico de "Recent Deliveries" mostrando ≥4 entregas com response 200/204.
- 4 capturas visuais de validação (uma por tipo de evento) em `#github-teste` (pode ser screenshot, link de mensagem ou export).
- Confirmação documentada de push notification disparada pelo `@dev-alerts` mention em failure.
- Lista de bugs Phase 1 (se houver), com plano de fix antes da task_12.
- Unit tests com 80%+ coverage **(REQUIRED)**.
- Integration tests **(REQUIRED)**.

## Tests
- Unit tests:
  - [ ] "Ping" inicial enviado pelo GitHub ao criar o webhook resulta em 200/204.
  - [ ] Próxima delivery após `git push` aparece em "Recent Deliveries" do GitHub com response 200/204.
  - [ ] n8n Executions mostra 1 execução do `WF-GH-Discord` por delivery.
- Integration tests (E2E):
  - [ ] Após push de 2 commits em branch sandbox: 2 mensagens em `#github-teste` com SHAs distintos.
  - [ ] Após abrir PR: 1 mensagem com status "Aberto".
  - [ ] Após merge do PR: 1 mensagem com status "Merged".
  - [ ] Após release publicada: 1 mensagem com tag e descrição.
  - [ ] Após workflow Action falhar: 1 mensagem vermelha com mention `<@&dev-alerts>` → conta com role recebe push notification.
  - [ ] Nenhum canal preexistente recebeu mensagem (verificar histórico de cada um).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Os 4 tipos de evento (push, PR, release, action failure) chegam em `#github-teste` com formato visualmente correto.
- Push notification confirmada para o mention de role em failure.
- Zero canal preexistente impactado.
- Phase 1 declarada concluída, autorizando a task_12.
