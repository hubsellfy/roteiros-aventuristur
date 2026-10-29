export type LegalKind = 'privacidade' | 'termos';

interface LegalSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
}

export interface LegalDocument {
  kind: LegalKind;
  title: string;
  intro: string;
  sections: LegalSection[];
}

export const LEGAL_VERSION = 'outubro de 2026';
/** Flip to true only after the lawyer of Aventuristur has approved both texts. */
export const LEGAL_REVIEW_APPROVED = false;
export const LEGAL_CONTACT_EMAIL = 'comercial@aventuristur.com';
const LEGAL_COMPANY = '36.016.458 JEFFERSON JOSE GONCALVES DA SILVA (Aventuristur), CNPJ 36.016.458/0001-86';

const PRIVACY: LegalDocument = {
  kind: 'privacidade',
  title: 'Política de Privacidade do Roteiros Aventuristur',
  intro:
    'O Roteiros Aventuristur é o aplicativo em que a Aventuristur monta e compartilha o roteiro da sua viagem com você. Esta política explica quais dados pessoais ele trata, para quê, com quem são compartilhados e por quanto tempo ficam guardados, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, LGPD).',
  sections: [
    {
      title: 'Quem é o controlador dos dados',
      paragraphs: [
        `${LEGAL_COMPANY}, é a controladora dos dados pessoais tratados no aplicativo.`,
        `Canal para falar sobre seus dados: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
    {
      title: 'Quais dados tratamos',
      items: [
        'Conta: nome, e-mail e senha (a senha é guardada de forma criptografada e nunca em texto aberto). Se você ativar a verificação em duas etapas, o segredo dela também é guardado, criptografado.',
        'Viagem: destinos, datas, lugares, roteiro por dia, reservas (como códigos de reserva e nomes dos viajantes), lista de mala, despesas e notas que você ou a equipe da Aventuristur incluírem.',
        'Documentos e arquivos que você ou a equipe anexarem à viagem, como vouchers e bilhetes. Não anexe documentos de identidade, como passaporte, sem necessidade.',
        'Conversas e anotações compartilhadas na viagem (mensagens, notas e enquetes).',
        'Dados técnicos de funcionamento e segurança: registros de acesso, endereço IP e dispositivo, usados para proteger a conta e corrigir falhas.',
        'Se você aceitar a medição opcional, eventos de cadastro concluído, abertura do planejador e solicitação de roteiro, eventos automáticos de sessão e interação na página de medição, identificadores de medição e informações técnicas do navegador.',
      ],
    },
    {
      title: 'Para que usamos os dados',
      items: [
        'Montar, mostrar e atualizar o seu roteiro e permitir que as pessoas convidadas por você ou pela Aventuristur o acompanhem.',
        'Criar e proteger sua conta, enviar convite, redefinição de senha e avisos da viagem por e-mail.',
        'Atender seu pedido de cotação ou serviço contratado com a Aventuristur e dar suporte.',
        'Manter a segurança do aplicativo e cumprir obrigações legais.',
        'Com sua escolha, entender o uso do planejador e melhorar o aplicativo.',
      ],
    },
    {
      title: 'Base legal',
      paragraphs: [
        'Tratamos os dados para executar o serviço que você pediu à Aventuristur e os procedimentos preliminares a ele (LGPD, art. 7º, V), para cumprir obrigações legais (art. 7º, II) e, no caso dos dados técnicos de segurança, com base no legítimo interesse de proteger o aplicativo e as contas (art. 7º, IX). A medição opcional de uso depende do seu consentimento, que pode ser revogado nas preferências do aplicativo.',
      ],
    },
    {
      title: 'Com quem os dados são compartilhados',
      paragraphs: [
        'Não vendemos seus dados. Eles são compartilhados apenas com as pessoas que você ou a Aventuristur convidarem para a viagem e com os prestadores abaixo, que atuam para fazer o aplicativo funcionar:',
      ],
      items: [
        'Hospedagem do aplicativo: servidor da Hostinger, onde o aplicativo e o banco de dados ficam.',
        'Envio de e-mails (convites, redefinição de senha e avisos): Resend.',
        'Cópias de segurança criptografadas, guardadas em armazenamento externo ao servidor do aplicativo.',
        'Busca de lugares: os textos que você digita na busca de lugares são enviados à API de lugares do projeto TREK (places.liketrek.com), de onde o aplicativo foi derivado, e a serviços do OpenStreetMap (Nominatim e Overpass).',
        'Previsão do tempo: a localização do lugar e as datas consultadas são enviadas ao Open-Meteo.',
        'Rotas, mapa, câmbio, feriados e transporte público: OSRM (FOSSGIS), OpenFreeMap, Frankfurter, date.nager.at e Transitous. Esses serviços recebem apenas as coordenadas, moedas ou datas necessárias à consulta, sem identificar você.',
        'Google Analytics: somente se você aceitar a medição, recebe eventos de uso e informações técnicas por uma página isolada do site da Aventuristur. Não enviamos destino, datas, orçamento, nomes, documentos ou o conteúdo dos roteiros nesses eventos.',
      ],
    },
    {
      title: 'Transferência para fora do Brasil',
      paragraphs: [
        'Alguns dos prestadores acima mantêm servidores fora do Brasil. Quando isso ocorre, o compartilhamento se limita ao necessário para o serviço funcionar e é feito com as garantias previstas na LGPD (arts. 33 a 36).',
      ],
    },
    {
      title: 'Por quanto tempo guardamos',
      paragraphs: [
        'Guardamos a viagem por até 12 meses depois da data de retorno. Depois desse prazo, a viagem, seus arquivos e as despesas e conversas ligadas a ela são apagados, salvo se alguma lei exigir a guarda por mais tempo ou se você pedir a exclusão antes.',
        'As cópias de segurança são mantidas em rotação e os dados apagados deixam de existir também nelas quando as cópias antigas são substituídas.',
      ],
    },
    {
      title: 'Seus direitos',
      paragraphs: [
        `Você pode pedir, a qualquer momento, pelo e-mail ${LEGAL_CONTACT_EMAIL}: confirmação de que tratamos seus dados, acesso, correção, anonimização, bloqueio ou eliminação de dados desnecessários, portabilidade, informação sobre com quem compartilhamos, informação sobre a possibilidade de não consentir e revogação de consentimento, quando for o caso (LGPD, art. 18).`,
        'Você também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).',
      ],
    },
    {
      title: 'Segurança',
      paragraphs: [
        'Usamos conexão segura (HTTPS), senhas criptografadas, segredos de integração criptografados, controle de acesso por convite e cópias de segurança criptografadas. Nenhum sistema é totalmente livre de riscos; em caso de incidente que possa causar dano relevante, avisaremos você e a ANPD, conforme a lei.',
      ],
    },
    {
      title: 'Cookies e armazenamento no aparelho',
      paragraphs: [
        'O aplicativo usa cookies e armazenamento no aparelho para manter você conectado, lembrar suas preferências e permitir abrir o roteiro sem internet. A medição de uso é opcional e só começa depois que você aceitar; você pode alterar essa escolha no painel do planejador. Se você tiver recusado a medição no site da Aventuristur, a recusa também é respeitada pela ponte de medição. Não usamos cookies de publicidade neste aplicativo.',
      ],
    },
    {
      title: 'Mudanças nesta política',
      paragraphs: [
        `Esta é a versão de ${LEGAL_VERSION}. Quando houver mudanças relevantes, avisaremos no aplicativo ou por e-mail.`,
      ],
    },
  ],
};

const TERMS: LegalDocument = {
  kind: 'termos',
  title: 'Termos de Uso do Roteiros Aventuristur',
  intro:
    'Estes termos valem para o uso do aplicativo Roteiros Aventuristur, oferecido pela Aventuristur aos clientes que ela convida. Ao entrar no aplicativo, você declara que leu e concorda com eles.',
  sections: [
    {
      title: 'O que é o aplicativo',
      paragraphs: [
        'É uma ferramenta para organizar o roteiro da viagem: dias e lugares, reservas, documentos, lista de mala, despesas e conversas entre os participantes. O aplicativo não vende passagens, hospedagens nem outros serviços.',
      ],
    },
    {
      title: 'Conta e acesso',
      items: [
        'O acesso é feito por convite da Aventuristur ou de outro participante da viagem. Não há cadastro aberto.',
        'Você é responsável por manter a senha em sigilo e por tudo o que for feito na sua conta. Avise a Aventuristur se suspeitar de uso indevido.',
        'Podemos suspender uma conta em caso de uso contrário a estes termos ou à lei.',
      ],
    },
    {
      title: 'Informações da viagem',
      paragraphs: [
        'Preços, tarifas, disponibilidade, horários e regras de cancelamento vêm dos fornecedores dos serviços e podem mudar. O que está no roteiro é uma organização das informações recebidas; vale o que estiver na confirmação da reserva e nas condições do fornecedor, que a Aventuristur identifica na proposta.',
        'Previsão do tempo, rotas, câmbio e horários de transporte são estimativas de serviços de terceiros. Confira antes de decidir.',
      ],
    },
    {
      title: 'Seus conteúdos e dados',
      items: [
        'Você é responsável pelas informações e arquivos que incluir, e deve ter o direito de usá-los e de compartilhá-los com os participantes da viagem.',
        'Evite anexar documentos de identidade, de saúde ou de pagamento sem necessidade. Eles são dados sensíveis.',
        'O tratamento dos dados segue a Política de Privacidade do aplicativo.',
        'Quem recebe um link público do roteiro pode vê-lo; compartilhe esse link com cuidado e desative-o quando não precisar mais.',
      ],
    },
    {
      title: 'Uso permitido',
      paragraphs: ['É proibido usar o aplicativo para:'],
      items: [
        'violar a lei ou direitos de outras pessoas;',
        'enviar conteúdo ilícito, ofensivo ou que contenha vírus;',
        'tentar acessar contas, dados ou sistemas sem autorização, ou prejudicar o funcionamento do aplicativo;',
        'copiar dados de outros usuários.',
      ],
    },
    {
      title: 'Disponibilidade',
      paragraphs: [
        'Trabalhamos para manter o aplicativo funcionando, mas ele é oferecido no estado em que está, sem garantia de funcionamento ininterrupto. Pode haver paradas para manutenção, atualização ou por falhas de serviços de terceiros.',
      ],
    },
    {
      title: 'Guarda e exclusão das viagens',
      paragraphs: [
        'As viagens são apagadas 12 meses depois da data de retorno. Antes disso, baixe o que quiser guardar, como o PDF do roteiro.',
      ],
    },
    {
      title: 'Responsabilidade',
      paragraphs: [
        'A Aventuristur responde pelos serviços que você contratou com ela, nos termos da proposta e da lei. O aplicativo é uma ferramenta de apoio e, dentro do que a lei permite, não nos responsabilizamos por decisões tomadas apenas com base em estimativas de terceiros ou por danos decorrentes de falhas de serviços externos.',
      ],
    },
    {
      title: 'Código aberto',
      paragraphs: [
        'O código do aplicativo é aberto, licenciado sob a AGPL-3.0, e o código da versão em uso está disponível na tela Sobre. Estes termos tratam do serviço oferecido pela Aventuristur e não restringem os direitos que a licença dá sobre o código.',
      ],
    },
    {
      title: 'Mudanças e contato',
      paragraphs: [
        `Podemos atualizar estes termos; a versão vigente é a de ${LEGAL_VERSION}. Aplica-se a lei brasileira. Dúvidas: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS: Record<LegalKind, LegalDocument> = {
  privacidade: PRIVACY,
  termos: TERMS,
};

export function legalDocument(kind: LegalKind): LegalDocument {
  return LEGAL_DOCUMENTS[kind];
}
