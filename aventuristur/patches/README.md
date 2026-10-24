# Patches da Aventuristur sobre o TREK

Modificações de código que não são troca de marca. Cada uma é pequena, tem teste,
entra no `CHANGES-AVENTURISTUR.md` e deve ser proposta ao projeto original, para
deixarmos de mantê-la.

## open-meteo-api-key

- **Por quê:** a API gratuita do Open-Meteo é só para uso não comercial. A assinatura
  comercial dá uma chave e hosts próprios, e o TREK v4.3.4 não tem variável para isso.
- **O que faz:** com `OPEN_METEO_API_KEY` definida, toda chamada de clima vai para
  `customer-api.open-meteo.com` (previsão) e `customer-archive-api.open-meteo.com`
  (histórico e clima), com `apikey=<chave>`. Sem a variável, nada muda.
- **Variáveis:** `OPEN_METEO_API_KEY` (segredo, só no Easypanel) e, se o Open-Meteo
  indicar outro host para o histórico, `OPEN_METEO_CUSTOMER_ARCHIVE_HOST`.
- **A verificar na assinatura (etapa 4):** o host do histórico não aparece na página
  de preços; confirmar na documentação da assinatura e testar na homologação com a
  chave real antes de abrir ao público.
- **Arquivos:** `server/src/nest/weather/weather.impl.ts` (`withOpenMeteoKey`) e
  `server/tests/unit/nest/weather/weather.impl.test.ts`. O arquivo `.patch` aqui é a
  mesma mudança, para reaplicar ou propor ao original.
- **Atualização do TREK:** depois de cada rebase, rodar
  `npx vitest run tests/unit/nest/weather` no `server/`; se o original passar a
  suportar a chave, remover este patch.
