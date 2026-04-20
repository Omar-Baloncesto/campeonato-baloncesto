import type { MetadataRoute } from 'next';
import { SITE_URL } from './lib/constants';

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
  { path: '/',                       changeFrequency: 'daily',  priority: 1.0 },
  { path: '/posiciones',             changeFrequency: 'daily',  priority: 0.9 },
  { path: '/fixture',                changeFrequency: 'daily',  priority: 0.9 },
  { path: '/jugadores',              changeFrequency: 'weekly', priority: 0.8 },
  { path: '/estadisticas',           changeFrequency: 'daily',  priority: 0.8 },
  { path: '/estadisticas-equipos',   changeFrequency: 'daily',  priority: 0.7 },
  { path: '/estadistica-jugadores',  changeFrequency: 'daily',  priority: 0.7 },
  { path: '/asistencias',            changeFrequency: 'weekly', priority: 0.7 },
  { path: '/lista-equipos',          changeFrequency: 'weekly', priority: 0.6 },
  { path: '/predicciones',           changeFrequency: 'weekly', priority: 0.6 },
  { path: '/bracket',                changeFrequency: 'weekly', priority: 0.7 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return STATIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
