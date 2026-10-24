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

Esta branch ainda está em implementação, sem PR de etapa 2. Faltam a revisão
dos textos visíveis restantes, a ajuda em `/help`, a conferência completa de
e-mails/PDF/link público, os testes atualizados e os prints no computador e
celular. O link de código para o commit exato da imagem no ar será concluído
na etapa 5, conforme a especificação. Nenhuma publicação foi feita.
