# Etapa 1 — contas e acessos

## Estado

Pronta para revisão, condicionada à aprovação da alteração de sequência da
especificação no [PR #17 do repositório do site](https://github.com/hubsellfy/aventuristur/pull/17).
Este documento registra apenas evidências técnicas da Etapa 1. Não contém
senhas, tokens, chaves de API, URLs de gatilho ou dados de clientes.

Fonte de decisão: [especificação v2 do planejador](https://github.com/hubsellfy/aventuristur/blob/claude/project-thread-qblw7q/docs/spec-planejador-viagens.md).

## Base do fork

| Item | Valor verificado |
| --- | --- |
| Repositório público | `https://github.com/hubsellfy/roteiros-aventuristur` |
| Código de origem | `https://github.com/liketrek/TREK` |
| Base selecionada | tag `v4.3.4` |
| Commit da tag | `d80577480c672799154ea9912918d906d16c0a75` |
| Remoto de atualização | `upstream` → `https://github.com/liketrek/TREK.git` |
| Remoto do fork | `origin` → `https://github.com/hubsellfy/roteiros-aventuristur.git` |

A branch `main` do fork começa exatamente nesse commit da tag. `LICENSE` e
`NOTICE.md` vieram intactos da base. A tag é anotada, mas não tem assinatura
criptográfica; a identificação acima é a referência verificável usada para a
rastreabilidade do fork.

## Acessos e infraestrutura comprovados

| Recurso | Situação | Observação |
| --- | --- | --- |
| GitHub `hubsellfy` | confirmado | Permissão administrativa no repositório da Aventuristur e acesso para criar o fork. |
| GitHub Container Registry (GHCR) | confirmado para publicação | A sessão OAuth da conta `hubsellfy` inclui o escopo `write:packages`; nenhum pacote foi criado nesta etapa. |
| VPS Hostinger | confirmado em leitura | KVM 2 em execução; capacidade a medir novamente com o app instalado. |
| DNS `aventuristur.com` | confirmado | O registro `A` `app` aponta para `187.127.25.215`, com TTL de 300 segundos. |
| Resolução pública | confirmado | `app.aventuristur.com` respondeu o IPv4 esperado nos resolvedores 1.1.1.1 e 8.8.8.8 na validação inicial. |
| Easypanel | confirmado em leitura | O dono definiu o projeto `supabase`. Ele contém os serviços existentes `aventuristur-site` e `storage`, que foram apenas consultados e não sofreram alteração. |
| SMTP transacional | confirmado | O domínio de envio `envia.aventuristur.com` foi validado pelo Resend. A chave de envio foi criada e guardada pelo dono fora do repositório; ela não foi lida nem retida pelo agente. |
| Chave de criptografia | confirmada | O dono gerou uma chave aleatória de 32 bytes em hexadecimal e a guardou fora da VPS. O valor não foi lido, enviado, registrado ou retido pelo agente; ele será cadastrado como segredo no Easypanel apenas na Etapa 4. |

O registro DNS prepara o endereço técnico. Nenhum serviço do Roteiros
Aventuristur, domínio no Easypanel, certificado, conta de usuário ou dado de
cliente foi publicado como parte desta etapa.

## Itens transferidos para a Etapa 4

| Item | Decisão de sequência | Regra de abertura |
| --- | --- | --- |
| Backup externo | Definir e criar, na Etapa 4, destino privado compatível com S3 fora da VPS principal, com credencial limitada ao bucket. Um storage separado na própria VPS não substitui a cópia externa. | Sem backup externo, retenção e restauração comprovada, o app não abre aos clientes. |
| Open-Meteo comercial | Durante desenvolvimento e homologação, usar somente a API gratuita, sem dados reais de clientes e sem acesso de clientes. Na Etapa 4, aprovar a assinatura comercial e gerar a chave da API. | Sem a assinatura comercial e sua validação na homologação, o app não abre aos clientes com o clima ligado. |

## Regras de segurança desta etapa

- Nenhum segredo deve ser enviado por chat, registrado em arquivo, commit,
  issue, PR, print ou log.
- Nenhum dado real de cliente entra no fork, nos testes ou na homologação.
- A API gratuita do Open-Meteo é uma permissão temporária de desenvolvimento e
  homologação; ela não autoriza abrir o produto ao uso operacional ou aos
  clientes da agência.
- A imagem, o serviço de homologação, o serviço de produção, o backup diário
  e o domínio configurado no Easypanel pertencem à Etapa 4.
- A abertura de `app.aventuristur.com` aos clientes exige autorização explícita
  do dono depois do checklist completo da especificação.

## Critério para encerrar a Etapa 1

Esta etapa está pronta para revisão quando os acessos da tabela de evidências
estiverem confirmados e seus segredos guardados nos cofres autorizados, sem
exposição no repositório. Backup externo e Open-Meteo comercial são requisitos
de pré-abertura da Etapa 4, não condições para encerrar a Etapa 1. A conclusão
terá um PR próprio, com descrição das verificações e sem capturas de tela que
revelem dados sensíveis.
