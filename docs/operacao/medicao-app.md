# Medição do aplicativo

O painel do planejador oferece uma escolha opcional de medição. Sem aceite, ou depois da recusa, o aplicativo não carrega a página de medição. A escolha pode ser alterada pelo controle "Medição de uso" no painel. A recusa registrada no site também impede o envio pelo aplicativo.

A ponte `https://aventuristur.com/medicao-app-interno` executa a tag `G-B667MEZGW0` em uma origem separada e isolada do conteúdo do aplicativo. O aplicativo envia apenas os nomes `planner_open` (abertura do painel após aceite e inicialização) e `trip_plan_requested` (pedido aceito pelo servidor, não confirmação de conclusão do roteiro). Não incluir parâmetros de viagem, informações pessoais, identificadores de viagem ou URLs privadas. A tag pode gerar eventos técnicos automáticos. As páginas de acesso e as rotas de viagem não carregam a ponte.

A medição depende de carregamento de scripts, do navegador e da escolha do usuário; bloqueios podem impedir a coleta. Não interprete o pedido como venda ou roteiro concluído, nem presuma que todas as visitas e todas as origens serão atribuídas. A verificação de produção exige confirmar a versão implantada e observar um evento autorizado no Google Analytics.
