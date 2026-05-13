// ═══════════════════════════════════════════════
// Demo data — 3 fictional clients with packages
// ═══════════════════════════════════════════════

let _id = 100;
export const uid = () => String(++_id);

const today = new Date();
const y = today.getFullYear();
const m = today.getMonth();

export const INITIAL_CLIENTS = [
  {
    id: '1',
    name: 'Marina Solaris',
    contact: '(11) 98765-4321',
    email: 'marina@solaris.com',
  },
  {
    id: '2',
    name: 'Lucas Ferreira',
    contact: '(21) 99876-5432',
    email: 'lucas@ferreirafilms.com',
  },
  {
    id: '3',
    name: 'Studio Ametista',
    contact: '(31) 91234-5678',
    email: 'contato@ametista.art',
  },
];

export const INITIAL_PACKAGES = [
  {
    id: 'p1',
    clientId: '1',
    name: 'Pacote Premium Mensal',
    totalVideos: 8,
    delivered: 5,
    posted: 4,
    status: 'Ativo',
    value: 4800,
    paid: 3200,
  },
  {
    id: 'p2',
    clientId: '2',
    name: 'Pacote Básico',
    totalVideos: 4,
    delivered: 3,
    posted: 3,
    status: 'Ativo',
    value: 2400,
    paid: 2400,
  },
  {
    id: 'p3',
    clientId: '3',
    name: 'Pacote Trimestral',
    totalVideos: 12,
    delivered: 10,
    posted: 9,
    status: 'Ativo',
    value: 9600,
    paid: 6400,
  },
];

export const INITIAL_SESSIONS = [
  {
    id: 's1',
    clientId: '1',
    date: `${y}-${String(m + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
    time: '09:00',
    service: 'Gravação de Reels',
    status: 'Confirmado',
  },
  {
    id: 's2',
    clientId: '2',
    date: `${y}-${String(m + 1).padStart(2, '0')}-${String(Math.min(today.getDate() + 1, 28)).padStart(2, '0')}`,
    time: '14:00',
    service: 'Gravação Institucional',
    status: 'Pendente',
  },
  {
    id: 's3',
    clientId: '3',
    date: `${y}-${String(m + 1).padStart(2, '0')}-${String(Math.min(today.getDate() + 3, 28)).padStart(2, '0')}`,
    time: '10:30',
    service: 'Ensaio Fotográfico',
    status: 'Confirmado',
  },
  {
    id: 's4',
    clientId: '1',
    date: `${y}-${String(m + 1).padStart(2, '0')}-${String(Math.min(today.getDate() + 5, 28)).padStart(2, '0')}`,
    time: '16:00',
    service: 'Gravação de Curso',
    status: 'Pendente',
  },
  {
    id: 's5',
    clientId: '3',
    date: `${y}-${String(m + 1).padStart(2, '0')}-${String(Math.max(today.getDate() - 2, 1)).padStart(2, '0')}`,
    time: '11:00',
    service: 'Making Of',
    status: 'Concluído',
  },
];

export const INITIAL_VIDEOS = [
  { id: 'v1', clientId: '1', packageId: 'p1', title: 'Reel Produto Luxo', recorded: true, edited: true, delivered: true, posted: true, plannedDate: `${y}-${String(m + 1).padStart(2, '0')}-05`, actualDate: `${y}-${String(m + 1).padStart(2, '0')}-05` },
  { id: 'v2', clientId: '1', packageId: 'p1', title: 'Story Behind the Brand', recorded: true, edited: true, delivered: true, posted: true, plannedDate: `${y}-${String(m + 1).padStart(2, '0')}-08`, actualDate: `${y}-${String(m + 1).padStart(2, '0')}-09` },
  { id: 'v3', clientId: '1', packageId: 'p1', title: 'Unboxing Premium', recorded: true, edited: true, delivered: true, posted: true, plannedDate: `${y}-${String(m + 1).padStart(2, '0')}-12`, actualDate: `${y}-${String(m + 1).padStart(2, '0')}-12` },
  { id: 'v4', clientId: '1', packageId: 'p1', title: 'Tutorial de Uso', recorded: true, edited: true, delivered: true, posted: true, plannedDate: `${y}-${String(m + 1).padStart(2, '0')}-15`, actualDate: `${y}-${String(m + 1).padStart(2, '0')}-15` },
  { id: 'v5', clientId: '1', packageId: 'p1', title: 'Depoimento Cliente', recorded: true, edited: false, delivered: false, posted: false, plannedDate: `${y}-${String(m + 1).padStart(2, '0')}-18`, actualDate: '' },
  { id: 'v6', clientId: '2', packageId: 'p2', title: 'Vídeo Institucional', recorded: true, edited: true, delivered: true, posted: true, plannedDate: `${y}-${String(m + 1).padStart(2, '0')}-03`, actualDate: `${y}-${String(m + 1).padStart(2, '0')}-03` },
  { id: 'v7', clientId: '2', packageId: 'p2', title: 'Campanha Verão', recorded: true, edited: true, delivered: true, posted: true, plannedDate: `${y}-${String(m + 1).padStart(2, '0')}-10`, actualDate: `${y}-${String(m + 1).padStart(2, '0')}-11` },
  { id: 'v8', clientId: '2', packageId: 'p2', title: 'Behind the Scenes', recorded: true, edited: true, delivered: true, posted: true, plannedDate: `${y}-${String(m + 1).padStart(2, '0')}-17`, actualDate: `${y}-${String(m + 1).padStart(2, '0')}-17` },
  { id: 'v9', clientId: '3', packageId: 'p3', title: 'Arte em Movimento', recorded: true, edited: true, delivered: true, posted: true, plannedDate: `${y}-${String(m + 1).padStart(2, '0')}-02`, actualDate: `${y}-${String(m + 1).padStart(2, '0')}-02` },
  { id: 'v10', clientId: '3', packageId: 'p3', title: 'Processo Criativo', recorded: true, edited: true, delivered: true, posted: true, plannedDate: `${y}-${String(m + 1).padStart(2, '0')}-06`, actualDate: `${y}-${String(m + 1).padStart(2, '0')}-07` },
  { id: 'v11', clientId: '3', packageId: 'p3', title: 'Exposição Virtual', recorded: true, edited: true, delivered: true, posted: true, plannedDate: `${y}-${String(m + 1).padStart(2, '0')}-09`, actualDate: `${y}-${String(m + 1).padStart(2, '0')}-09` },
  { id: 'v12', clientId: '3', packageId: 'p3', title: 'Galeria Interativa', recorded: true, edited: true, delivered: true, posted: false, plannedDate: `${y}-${String(m + 1).padStart(2, '0')}-14`, actualDate: '' },
  { id: 'v13', clientId: '3', packageId: 'p3', title: 'Bastidores do Ateliê', recorded: true, edited: false, delivered: false, posted: false, plannedDate: `${y}-${String(m + 1).padStart(2, '0')}-20`, actualDate: '' },
];

export const INITIAL_PAYMENTS = [
  { id: 'pay1', clientId: '1', packageId: 'p1', date: `${y}-${String(m + 1).padStart(2, '0')}-01`, amount: 1600, note: 'Entrada' },
  { id: 'pay2', clientId: '1', packageId: 'p1', date: `${y}-${String(m + 1).padStart(2, '0')}-10`, amount: 1600, note: '2ª parcela' },
  { id: 'pay3', clientId: '2', packageId: 'p2', date: `${y}-${String(m + 1).padStart(2, '0')}-01`, amount: 2400, note: 'Pagamento integral' },
  { id: 'pay4', clientId: '3', packageId: 'p3', date: `${y}-${String(m + 1).padStart(2, '0')}-01`, amount: 3200, note: 'Entrada' },
  { id: 'pay5', clientId: '3', packageId: 'p3', date: `${y}-${String(m + 1).padStart(2, '0')}-08`, amount: 3200, note: '2ª parcela' },
];

export const SERVICE_TYPES = [
  'Gravação de Reels',
  'Gravação Institucional',
  'Gravação de Curso',
  'Ensaio Fotográfico',
  'Making Of',
  'Gravação de Podcast',
  'Cobertura de Evento',
];
