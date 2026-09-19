// Políticas da loja. Os textos usam os dados cadastrados no painel (contato,
// pagamento, entrega) para ficarem sempre coerentes com o restante do site.
// Revisados por último em 19/09/2026.

export const POLICIES_UPDATED_AT = '19 de setembro de 2026'

const list = (items) => items.filter(Boolean)
const contactLine = (settings) => list([
  settings.whatsapp && `WhatsApp ${settings.phone || settings.whatsapp}`,
  settings.email && `e-mail ${settings.email}`,
]).join(' ou ')

export const policies = [
  {
    slug: 'trocas-e-devolucoes',
    title: 'Trocas e devoluções',
    summary: 'Devolução em até 7 dias após o recebimento, troca de produtos com defeito em até 90 dias e regras para itens personalizados.',
    sections: (settings) => [
      {
        heading: 'Direito de arrependimento',
        paragraphs: [
          'Compras feitas pelo site ou pelo WhatsApp podem ser canceladas em até 7 dias corridos após o recebimento, conforme o artigo 49 do Código de Defesa do Consumidor.',
          'O produto deve ser devolvido sem sinais de uso, com a embalagem original e acompanhado de todos os itens recebidos. Após recebermos e conferirmos o produto, devolvemos o valor pago, incluindo o frete, pela mesma forma de pagamento ou por Pix, em até 10 dias úteis.',
        ],
      },
      {
        heading: 'Produtos com defeito',
        paragraphs: [
          'Se o produto chegar com defeito, avariado ou diferente do pedido, avise em até 90 dias após o recebimento. Enviaremos um novo item igual ou, se não houver estoque, devolvemos o valor pago. Os custos de envio da troca são por nossa conta.',
          'Para agilizar, envie fotos do produto e da embalagem assim que perceber o problema.',
        ],
      },
      {
        heading: 'Itens personalizados',
        paragraphs: [
          'Produtos personalizados com nome, data, foto ou mensagem são feitos sob encomenda e aprovados por você antes da produção. Por isso, não são aceitos para devolução por arrependimento depois que a produção começa.',
          'Se houver defeito ou erro nosso na personalização (diferente do que foi aprovado), refazemos o item sem custo ou devolvemos o valor pago.',
        ],
      },
      {
        heading: 'Como solicitar',
        items: list([
          `Entre em contato pelo ${contactLine(settings) || 'nosso WhatsApp'} informando o número do pedido.`,
          'Descreva o motivo e, em caso de defeito, envie fotos.',
          'Informaremos o endereço ou o código de postagem para o envio, sem custo para você nos casos de arrependimento e defeito.',
        ]),
      },
    ],
  },
  {
    slug: 'frete-e-entrega',
    title: 'Frete e entrega',
    summary: 'Envio para todo o Brasil, prazos de postagem, formas de entrega disponíveis e acompanhamento do pedido.',
    sections: (settings) => [
      {
        heading: 'Formas de entrega',
        items: (settings.delivery_methods || []).length ? settings.delivery_methods : ['Envio pelos Correios para todo o Brasil.'],
        paragraphs: [`O valor do frete é calculado de acordo com o endereço e o peso do pedido e informado antes da confirmação do pagamento.`],
      },
      {
        heading: 'Prazos',
        paragraphs: [
          'Itens a pronta entrega são postados em até 2 dias úteis após a confirmação do pagamento.',
          'Itens personalizados têm prazo de produção informado no atendimento, antes de você confirmar o pedido. A contagem começa após a aprovação da arte e a confirmação do pagamento.',
          'O prazo de transporte depende da modalidade escolhida e do destino, conforme a transportadora.',
        ],
      },
      {
        heading: settings.address ? `Entrega em ${settings.address.split(',')[0]}` : 'Entrega local',
        paragraphs: ['Na nossa cidade, também é possível combinar entrega por motoboy ou retirada, quando essas opções estiverem disponíveis.'],
      },
      {
        heading: 'Acompanhamento',
        paragraphs: ['Enviamos o código de rastreio pelo WhatsApp assim que o pedido é postado. Se o endereço informado estiver incorreto ou ninguém puder receber, o reenvio pode ter custo adicional.'],
      },
    ],
  },
  {
    slug: 'privacidade',
    title: 'Política de privacidade',
    summary: 'Quais dados pessoais coletamos, para que usamos, com quem compartilhamos e como exercer seus direitos pela LGPD.',
    sections: (settings) => [
      {
        heading: 'Dados que coletamos',
        items: [
          'Nome, WhatsApp e, se você informar, e-mail, para registrar e atender o seu pedido.',
          'Endereço de entrega, quando necessário para o envio.',
          'Itens do pedido, forma de entrega, forma de pagamento e observações.',
          'No seu navegador, guardamos a sacolinha, o cupom aplicado e, se você autorizar, seus dados de contato para os próximos pedidos. Essas informações ficam só no seu aparelho.',
        ],
      },
      {
        heading: 'Para que usamos',
        paragraphs: ['Usamos os dados apenas para atender, produzir, entregar e dar suporte aos pedidos, e para cumprir obrigações legais e fiscais. Não vendemos nem alugamos dados pessoais.'],
      },
      {
        heading: 'Compartilhamento',
        paragraphs: ['Compartilhamos somente o necessário com prestadores que tornam o pedido possível: hospedagem e banco de dados do site, envio de e-mails, meios de pagamento e transportadoras.'],
      },
      {
        heading: 'Seus direitos',
        paragraphs: [
          `Pela Lei Geral de Proteção de Dados (Lei 13.709/2018), você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento pelo ${contactLine(settings) || 'nosso WhatsApp'}. Guardamos os dados de pedidos pelo tempo exigido pela legislação fiscal.`,
        ],
      },
    ],
  },
  {
    slug: 'termos-de-uso',
    title: 'Termos de uso',
    summary: 'Como funcionam os pedidos, preços, pagamentos e personalizações feitos pelo site.',
    sections: (settings) => [
      {
        heading: 'Pedidos',
        paragraphs: [
          'Ao enviar um pedido pelo site, você solicita a reserva dos itens escolhidos. O pedido é confirmado depois que combinamos entrega e pagamento pelo WhatsApp e o pagamento é aprovado.',
          'Se um item ficar indisponível antes da confirmação, avisamos e você pode escolher outro produto ou cancelar sem custo.',
        ],
      },
      {
        heading: 'Preços e pagamento',
        paragraphs: [
          'Os preços estão em reais e podem mudar sem aviso, mas o valor do pedido enviado é mantido na confirmação. Cupons têm regras e validade próprias e não são cumulativos.',
          (settings.payment_methods || []).length ? `Formas de pagamento aceitas: ${settings.payment_methods.join(', ')}.` : null,
        ].filter(Boolean),
      },
      {
        heading: 'Imagens e personalização',
        paragraphs: [
          'As fotos são ilustrativas. Cores podem variar conforme a tela e, em peças artesanais, pequenas diferenças de acabamento são naturais.',
          'Na personalização, você é responsável pelos textos e imagens enviados e por ter o direito de usá-los. A produção só começa depois da sua aprovação.',
        ],
      },
      {
        heading: 'Contato',
        paragraphs: [`${settings.name}${settings.address ? `, ${settings.address}` : ''}. Atendimento pelo ${contactLine(settings) || 'WhatsApp'}.`],
      },
    ],
  },
]

export const findPolicy = (slug) => policies.find((policy) => policy.slug === slug)
