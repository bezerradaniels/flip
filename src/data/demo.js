import flipLogo from '../flip-logo.png'
import canecaMockup from '../assets/mockups/caneca-personalizada.jpg'
import coposMockup from '../assets/mockups/copos-tacas-personalizados.jpg'
import displayMdfMockup from '../assets/mockups/display-mdf.jpg'
import etiquetasMockup from '../assets/mockups/etiquetas-adesivos.jpg'
import kitCorporativoMockup from '../assets/mockups/kit-corporativo.jpg'
import lembrancinhasMockup from '../assets/mockups/lembrancinhas-convites.jpg'
import materiaisGraficosMockup from '../assets/mockups/materiais-graficos.jpg'
import topoBoloMockup from '../assets/mockups/topo-bolo.jpg'

const image = (id, url, altText, position = 0) => ({ id, url, alt_text: altText, position })
const variant = (id, name, priceOverride = null, stock = null) => ({
  id,
  name,
  price_override: priceOverride,
  stock,
  is_active: true,
})

export const demoStore = {
  id: 1,
  name: 'Flip',
  slogan: 'Seu desejo vira arte.',
  logo_url: flipLogo,
  hero_image_url: '/hero-flip-personalizados.jpg',
  primary_color: '#176b46',
  whatsapp: '557798634542',
  phone: '(77) 98634-542',
  email: 'ola@flip.com.br',
  address: 'Bom Jesus da Lapa, Bahia',
  instagram_url: 'https://www.instagram.com/flipsolucoesemdesign/',
  about: 'A Flip transforma ideias em produtos personalizados. Criamos brindes, impressos, peças em MDF e lembranças para pessoas, festas e empresas, sempre com atendimento próximo e produção sob medida.',
  payment_methods: ['Pix', 'Cartão de crédito e débito', 'Dinheiro'],
  delivery_methods: ['Entrega em domicílio', 'PAC', 'SEDEX', 'Motoboy', 'Retirada', 'Entrega digital'],
}

export const demoProducts = [
  {
    id: 'demo-caneca-personalizada', slug: 'caneca-personalizada', name: 'Caneca personalizada', price: 34.9,
    category: { id: 'personalizados', name: 'Personalizados', slug: 'personalizados' }, brand: 'Flip', unit: 'Unidade', is_featured: true, is_active: true,
    images: [image('caneca-1', canecaMockup, 'Mockup ilustrativo de caneca personalizada')],
    variants: [variant('caneca-ceramica', 'Cerâmica 325 ml', 34.9), variant('caneca-magica', 'Caneca mágica', 49.9)],
    description: 'Caneca produzida sob encomenda com arte, nome, foto ou tema escolhido pelo cliente. Mockup e valores meramente ilustrativos.',
  },
  {
    id: 'demo-copos-tacas', slug: 'copos-e-tacas-personalizados', name: 'Copos e taças personalizados', price: 24.9,
    category: { id: 'personalizados', name: 'Personalizados', slug: 'personalizados' }, brand: 'Flip', unit: 'Unidade', is_featured: true, is_active: true,
    images: [image('copos-1', coposMockup, 'Mockup ilustrativo de copo e taça personalizados')],
    variants: [variant('copo-tampa', 'Copo com tampa', 24.9), variant('taca-haste', 'Taça personalizada', 29.9)],
    description: 'Copos e taças para festas, presentes e ações de marca, personalizados conforme tema e quantidade. Mockup e valores meramente ilustrativos.',
  },
  {
    id: 'demo-kit-corporativo', slug: 'kit-brinde-corporativo', name: 'Kit de brindes corporativos', price: 149.9,
    category: { id: 'corporativo', name: 'Brindes corporativos', slug: 'brindes-corporativos' }, brand: 'Flip', unit: 'Kit', is_featured: true, is_active: true,
    images: [image('kit-1', kitCorporativoMockup, 'Mockup ilustrativo de kit de brindes corporativos')],
    variants: [variant('kit-essencial', 'Kit essencial', 149.9), variant('kit-executivo', 'Kit executivo', 219.9)],
    description: 'Composição personalizada para equipes, clientes e eventos empresariais. Itens, acabamento e quantidade são definidos no orçamento. Mockup e valores ilustrativos.',
  },
  {
    id: 'demo-display-mdf', slug: 'display-personalizado-em-mdf', name: 'Display personalizado em MDF', price: 59.9,
    category: { id: 'mdf', name: 'MDF e sinalização', slug: 'mdf-e-sinalizacao' }, brand: 'Flip', unit: 'Unidade', is_featured: true, is_active: true,
    images: [image('display-1', displayMdfMockup, 'Mockup ilustrativo de display personalizado em MDF')],
    variants: [variant('display-balcao', 'Display de balcão', 59.9), variant('placa-mdf', 'Placa personalizada', 79.9)],
    description: 'Displays e placas cortados em MDF para balcões, eventos, organização e comunicação visual. Mockup e valores meramente ilustrativos.',
  },
  {
    id: 'demo-topo-bolo', slug: 'topo-de-bolo-personalizado', name: 'Topo de bolo personalizado', price: 34.9,
    category: { id: 'festas', name: 'Festas e lembranças', slug: 'festas-e-lembrancas' }, brand: 'Flip', unit: 'Unidade', is_featured: false, is_active: true,
    images: [image('topo-1', topoBoloMockup, 'Mockup ilustrativo de topo de bolo personalizado')],
    variants: [variant('topo-mdf', 'MDF', 34.9), variant('topo-acrilico', 'Acrílico', 49.9)],
    description: 'Topo criado para combinar com o tema da comemoração, com nome, idade e elementos personalizados. Mockup e valores ilustrativos.',
  },
  {
    id: 'demo-etiquetas', slug: 'etiquetas-e-adesivos-personalizados', name: 'Etiquetas e adesivos personalizados', price: 19.9,
    category: { id: 'adesivos', name: 'Adesivos e etiquetas', slug: 'adesivos-e-etiquetas' }, brand: 'Flip', unit: 'Kit', is_featured: false, is_active: true,
    images: [image('etiquetas-1', etiquetasMockup, 'Mockup ilustrativo de etiquetas e adesivos personalizados')],
    variants: [variant('etiquetas-escolares', 'Etiquetas escolares', 19.9), variant('adesivos-marca', 'Adesivos para marca', 29.9)],
    description: 'Etiquetas para material escolar, organização, embalagens e pequenos negócios. Formatos e quantidades são definidos no pedido. Mockup e valores ilustrativos.',
  },
  {
    id: 'demo-lembrancinhas', slug: 'lembrancinhas-e-convites', name: 'Lembrancinhas e convites', price: 49.9,
    category: { id: 'festas', name: 'Festas e lembranças', slug: 'festas-e-lembrancas' }, brand: 'Flip', unit: 'Kit', is_featured: false, is_active: true,
    images: [image('lembrancinhas-1', lembrancinhasMockup, 'Mockup ilustrativo de lembrancinhas e convites personalizados')],
    variants: [variant('kit-convite', 'Convite e tags', 49.9), variant('kit-festa', 'Kit festa', 89.9)],
    description: 'Convites, tags, embalagens e lembranças coordenados para tornar a comemoração única. Mockup e valores meramente ilustrativos.',
  },
  {
    id: 'demo-materiais-graficos', slug: 'materiais-graficos-personalizados', name: 'Materiais gráficos personalizados', price: 44.9,
    category: { id: 'grafica', name: 'Gráfica personalizada', slug: 'grafica-personalizada' }, brand: 'Flip', unit: 'Kit', is_featured: false, is_active: true,
    images: [image('graficos-1', materiaisGraficosMockup, 'Mockup ilustrativo de materiais gráficos personalizados')],
    variants: [variant('cardapio', 'Cardápio', 44.9), variant('kit-impresso', 'Kit de impressos', 99.9)],
    description: 'Cardápios, cartões, tags, adesivos e sacolas para apresentar marcas e produtos com consistência. Mockup e valores meramente ilustrativos.',
  },
]

export const demoCategories = [...new Map(demoProducts.map((product) => [product.category.id, product.category])).values()]
