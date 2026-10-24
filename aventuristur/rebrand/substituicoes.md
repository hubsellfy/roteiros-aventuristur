# Substituições de marca — etapa 2

Base: TREK v4.3.4. Executar a partir da raiz do fork:

```bash
npm ci
node aventuristur/rebrand/apply.mjs
```

O script é repetível: uma segunda execução não muda os arquivos. O pré-build
do cliente também o executa antes de gerar os ícones.

| Superfície | Origem | Resultado nesta branch |
| --- | --- | --- |
| Título e idioma inicial do HTML | `client/index.html` | Roteiros Aventuristur; `pt-BR` |
| Manifesto PWA | `client/vite.config.js` | nome, descrição e cores da Aventuristur |
| Logos e ícones | `aventuristur/brand/` → `client/public/` | logo no login, barra, favicon, iPhone e ícone maskable |
| Paleta padrão | `client/src/index.css` | azul principal do site no tema claro; contraste no escuro |
| Idiomas selecionáveis | `shared/src/i18n/languages.ts`, cliente | somente português do Brasil, inglês e espanhol |
| Textos traduzidos | `shared/src/i18n/{br,en,es}/` | nome do produto substituído; URLs e identificadores técnicos mantidos |
| Tela Sobre | templates em `aventuristur/rebrand/templates/` | origem, licença, ausência de garantia e código do fork; sem doações do original |
| Avisos antigos | `server/src/systemNotices/registry.ts` | anúncios pessoais e pedidos de doação do original não são exibidos |
| E-mail | `server/src/nest/notifications/mailer/` | título, cores, remetente visual e logo da marca |
| PDF e link público | cliente | logos, nome e link do código substituídos nos pontos já mapeados |

## Verificação automática

```bash
node aventuristur/rebrand/check.mjs --committed
```

Roda o script duas vezes, falha se a segunda execução mudar algo ou se o
resultado não estiver commitado, e falha se aparecer "TREK" em texto visível
(cliente, textos de idioma, e-mails) fora da lista permitida do próprio arquivo.
O workflow `.github/workflows/aventuristur-marca.yml` roda isso em todo PR.

## O que continua mencionando o TREK de propósito

- Tela "Sobre": "baseado no TREK (AGPL-3.0)".
- Nome do serviço de busca de lugares ("TREK Places API", "índice do TREK") e dos
  intervalos de versão de plugins, porque são coisas do projeto original.
- Telas que ficam desligadas na v1: modo demonstração, aba de releases do original
  (removida do menu), painel de plugins (`TREK_PLUGINS_ENABLED=false`) e o estúdio
  do Journey (o logotipo "TREK Studio" precisa ser trocado antes de ligar o Journey).
- Código, variáveis `TREK_*`, links e nomes de arquivo.

## Pendências conhecidas da etapa 2

- A ajuda em `/help` vem da pasta `wiki/` do original, em inglês, e inclui páginas
  para quem instala o servidor. O texto agora usa o nome do produto, mas as imagens
  da wiki ainda mostram a interface original. O manual curto em português dos
  consultores (etapa 6) deve substituir essas páginas para o cliente.
- O mascote do TREK (telas vazias e carregamento) segue em uso: decisão do dono
  sobre manter ou trocar, porque o `TRADEMARKS.md` protege logos e identidade visual.
- Os textos em português (`br`) e espanhol (`es`) das frases sobre o índice e os
  plugins do TREK não têm a mesma proteção que o inglês e passam a usar o nome
  do produto; ficam fora da vista do cliente (administração).
- Os workflows herdados (imagens Docker, wiki, SonarCloud) ainda apontam para o
  projeto original e entram na etapa 4.
- Prints de computador e celular para a aprovação do dono.
