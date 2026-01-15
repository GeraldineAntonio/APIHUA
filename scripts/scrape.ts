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

    // Procesar resultados con logging de errores
    const capitulosEs = blogspotResult.status === 'fulfilled' ? blogspotResult.value : [];
    const skydemon = skyResult.status === 'fulfilled' ? skyResult.value : [];
    const maehwasup = maehwaResult.status === 'fulfilled' ? maehwaResult.value : [];
    
    // Reportar errores pero continuar con los datos disponibles
    if (blogspotResult.status === 'rejected') {
      console.error('⚠️ Error en Blogspot:', blogspotResult.reason);
    }
    if (skyResult.status === 'rejected') {
      console.error('⚠️ Error en Skydemon:', skyResult.reason);
    }
    if (maehwaResult.status === 'rejected') {
      console.error('⚠️ Error en Maehwasup:', maehwaResult.reason);
    }

    // Validar que al menos tengamos algunos datos
    if (capitulosEs.length === 0 && skydemon.length === 0 && maehwasup.length === 0) {
      throw new Error('❌ No se pudo obtener ningún dato de ninguna fuente');
    }

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

    console.log('\n✅ Scraping completado exitosamente');
    console.log(`📊 Español: ${capitulosEs.length} capítulos`);
    console.log(`📊 Inglés: ${unificados.length} capítulos`);
    console.log(`   - Skydemon: ${skydemon.length}`);
    console.log(`   - Maehwasup: ${maehwasup.length}`);
    console.log(`💾 Guardado en: ${filePath}\n`);

    // Salir con código de éxito
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error fatal en scraping:');
    console.error(error);
    process.exit(1);
  }
}

// Manejar errores no capturados
process.on('unhandledRejection', (error) => {
  console.error('❌ Error no manejado:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Excepción no capturada:', error);
  process.exit(1);
});

scrapeAndSave();