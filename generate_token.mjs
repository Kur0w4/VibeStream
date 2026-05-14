import { Innertube, UniversalCache } from 'youtubei.js';
import fs from 'fs';

async function generate() {
  console.log("Iniciando cliente de YouTube...");
  
  // Asegurar que el directorio exista antes de inicializar la caché
  if (!fs.existsSync('./.ytcache')) {
      fs.mkdirSync('./.ytcache');
  }
  
  // El primer parámetro debe ser TRUE para que guarde en disco
  const yt = await Innertube.create({ cache: new UniversalCache(true, './.ytcache') });

  yt.session.on('auth-pending', (data) => {
    console.log("\n==========================================================");
    console.log("ACCION REQUERIDA:");
    console.log(`1. Ve a esta URL en tu navegador: ${data.verification_url}`);
    console.log(`2. Ingresa este código: ${data.user_code}`);
    console.log("==========================================================\n");
    console.log("Esperando a que inicies sesión en el navegador... (Esto puede tardar unos segundos extra después de que apruebes en Google)");
  });

  try {
    // Esto se pausa hasta que inicies sesión en el navegador
    await yt.session.signIn();
    
    console.log("\n[Exito] ¡Autenticación detectada!");
    console.log("Extrayendo credenciales guardadas...");
    
    // Esperar un segundo extra para que UniversalCache termine de escribir el archivo
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const files = fs.readdirSync('./.ytcache');
    let found = false;
    
    for (const file of files) {
        const content = fs.readFileSync('./.ytcache/' + file, 'utf-8');
        console.log(`\n==========================================================`);
        console.log(`✅ COPIA EL SIGUIENTE TEXTO Y PONLO EN RENDER`);
        console.log(`==========================================================`);
        console.log(`Nombre de la variable de entorno: YOUTUBE_OAUTH_CACHE`);
        console.log(`Valor (Copia TODO desde la llave { hasta la llave } ):\n`);
        console.log(content);
        console.log(`\n==========================================================\n`);
        found = true;
        break; 
    }
    
    if(!found) {
        console.log("❌ No se encontró el archivo de caché. Inténtalo de nuevo.");
    }
  } catch (err) {
    console.error("❌ Error de autenticación:", err);
  }
  
  process.exit(0);
}

generate();
