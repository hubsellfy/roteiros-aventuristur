# Alterações da Aventuristur sobre o TREK

Este arquivo cumpre o §5(a) da AGPL-3.0 (aviso de que o trabalho foi modificado, com data).

**Roteiros Aventuristur** é um fork do [TREK](https://github.com/liketrek/TREK) (AGPL-3.0), partindo da versão **v4.3.4** (commit `d80577480c672799154ea9912918d906d16c0a75`). As alterações abaixo foram feitas por Aventuristur a partir de **24/10/2026**. Todo o código do fork continua sob a AGPL-3.0, e o código-fonte da versão que está no ar é ofertado em **Configurações > Sobre**, com link para o commit exato.

Este arquivo lista o que muda em relação ao original. O resto do código é do TREK e dos seus colaboradores, com os avisos de copyright mantidos (`LICENSE`, `NOTICE.md`).

## 1. Marca

- A marca é aplicada por um script repetível: `aventuristur/rebrand/apply.mjs`. Ele é rodado de novo a cada atualização do TREK, e `aventuristur/rebrand/check.mjs` (workflow `aventuristur-marca.yml`) falha o PR se restar a marca antiga em texto visível.
- Nome do produto, textos da interface, e-mails, PDF, página de ajuda, nome e ícones do app instalável (PWA) e tela de abertura passam a mostrar "Roteiros Aventuristur". Os arquivos de marca ficam em `aventuristur/brand/`.
- O nome "TREK" e o texto "baseado no TREK (AGPL-3.0)" aparecem apenas para indicar a origem (Sobre, `LICENSE`, `NOTICE.md` e este arquivo). A logo e o mascote do TREK não são usados (veja `TRADEMARKS.md`).
- Removidos da interface: avisos de versão e de apoio do projeto original, aba GitHub do painel de administração (doações e comunidade do projeto original).

## 2. Idiomas

- A interface oferece **Português (Brasil)**, **English** e **Español**. Os demais idiomas do original foram retirados da lista (`shared/src/i18n/languages.ts`). Os arquivos de tradução do original continuam no repositório.

## 3. Tela Sobre e código-fonte (AGPL §13)

- Tela Sobre com nome do produto, origem, ausência de garantia, link da licença e link do **código-fonte no commit exato** em execução (hash gravado na imagem durante a construção; `client/src/brand/aboutContent.ts`).

## 4. Previsão do tempo com plano comercial do Open-Meteo

- `server/src/nest/weather/weather.impl.ts`: quando a variável `OPEN_METEO_API_KEY` existe, as chamadas usam os endereços do plano comercial com a chave. Sem a variável, o comportamento original continua. Detalhes em `aventuristur/patches/README.md`.

## 5. Integração contínua e imagem

- `.github/workflows/aventuristur-imagem.yml`: constrói e publica a imagem no GitHub Container Registry com o hash do commit.
- `.github/workflows/test.yml`: os trabalhos que dependem de segredos do projeto original (licença do MinIO e token do SonarCloud) passam a ser pulados, com aviso, quando o segredo não existe no fork.
- Testes ajustados à marca e aos três idiomas.

## 6. Privacidade, termos e retenção

- Política de privacidade e termos de uso do app (páginas públicas), e rotina de retenção de viagens após 12 meses do retorno. Veja `aventuristur/docs/`.

## 7. Atualização para o TREK 5.0.1

- A base incorpora as correções do TREK 5.0.1, preservando o gerador de roteiros, as páginas, a identidade visual e a medição condicionada ao consentimento do Aventuristur.
- A confirmação individual de plugins fora da faixa de versões foi adaptada ao painel de plugins existente, sem trocar a organização dos filtros e das informações de segurança.
- O assistente e o gerador próprios também reconhecem `br`, código que o app usa para português brasileiro, além de `pt` e `pt-BR`.
- A migração de plugins e o cache offline de rotas devem ser testados sobre dados existentes antes de qualquer publicação. A migração foi exercitada em banco temporário com as migrações específicas do Aventuristur já registradas.

## 8. Acesso pelo site Aventuristur

- Os endereços `/login` e `/register` do app encaminham para as páginas públicas do site Aventuristur, que exibem o menu e o rodapé institucionais. O endereço de retorno ao app e o token de convite são preservados; o app continua recebendo callbacks OIDC diretamente.
- Em desenvolvimento local, o destino usa `http://127.0.0.1:3100`. Em produção, usa `https://aventuristur.com`; `VITE_PUBLIC_SITE_ORIGIN` permite definir outra origem no build.

## Como as alterações são mantidas

A cada versão nova do TREK: atualizar a base, rodar `node aventuristur/rebrand/apply.mjs`, reaplicar os patches de `aventuristur/patches/`, rodar os testes e conferir `check.mjs`.
