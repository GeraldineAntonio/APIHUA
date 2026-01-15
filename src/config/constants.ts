export const SOURCES = {
  SPANISH_BLOGSPOT: 'https://animeshoy12.blogspot.com/p/el-regreso-de-la-secta-del-monte-hua_2.html',
  ENGLISH_MAEHWASUP: 'https://maehwasup.com/',
  ENGLISH_SKYDEMON: 'https://skydemonorder.com/projects/3801994495-return-of-the-mount-hua-sect'
} as const;

export const CACHE_TTL = 3600000; // 1 hora

export const SERVER_PORT = process.env.PORT || 3000;

export const CORS_OPTIONS = {
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
};

export const FLARESOLVERR_URL = process.env.FLARESOLVERR_URL || 'http://localhost:8191/v1';