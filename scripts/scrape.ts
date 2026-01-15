// scripts/scrape.ts
import { scraperService } from '../src/services/scraper.service.js';
import { promises as fs } from 'fs';
import path from 'path';

async function scrapeAndSave() {
  console.log('🚀 Iniciando scraping automático...\n');
  
  try {
    // Crear directorio data
    const dataDir = path.join(process.cwd(), 'data');
    await fs.mkdir(dataDir, { recursive: true });

    // Scrape todas las fuentes en paralelo
    console.log('📖 Scrapeando todas las fuentes...\n');
    
    const [blogspotResult, skyResult, maehwaResult] = await Promise.allSettled([
      scraperService.scrapeBlogspot(),
      scraperService.scrapeSkydemon(),
      scraperService.scrapeMaehwasup()
    ]);

    // Procesar resultados
    const capitulosEs = blogspotResult.status === 'fulfilled' ? blogspotResult.value : [];
    const skydemon = skyResult.status === 'fulfilled' ? skyResult.value : [];
    const maehwasup = maehwaResult.status === 'fulfilled' ? maehwaResult.value : [];
    
    const capitulosEn = [...skydemon, ...maehwasup];
    const unificados = scraperService.unificarCapitulosIngles(capitulosEn);

    // Crear estructura de datos
    const data = {
      version: '1.0.0',
      lastUpdate: new Date().toISOString(),
      stats: {
        totalEspanol: capitulosEs.length,
        totalIngles: unificados.length,
        skydemon: skydemon.length,
        maehwasup: maehwasup.length
      },
      espanol: capitulosEs,
      ingles: unificados,
      capitulosRaw: {
        skydemon,
        maehwasup
      }
    };

    // Guardar JSON
    const filePath = path.join(dataDir, 'capitulos.json');
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    console.log('\n✅ Scraping completado');
    console.log(`📊 Español: ${capitulosEs.length} | Inglés: ${unificados.length}`);
    console.log(`💾 Guardado en: ${filePath}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

scrapeAndSave();