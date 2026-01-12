// src/config/constants.ts

export const SOURCES = {
  SPANISH_BLOGSPOT: 'https://animeshoy12.blogspot.com/p/el-regreso-de-la-secta-del-monte-hua_2.html',
  ENGLISH_MAEHWASUP: 'https://maehwasup.com/',
  ENGLISH_SKYDEMON: 'https://skydemonorder.com/projects/3801994495-return-of-the-mount-hua-sect'
} as const;

export const CACHE_TTL = 3600000; // 1 hora en milisegundos

export const PUPPETEER_CONFIG = {
  headless: 'new' as const,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu'
  ]
};

export const SERVER_PORT = process.env.PORT || 3000;

export const CORS_OPTIONS = {
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
};