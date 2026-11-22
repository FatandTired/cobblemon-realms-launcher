import { LauncherSettings, ModpackManifest, ServerStatus, Account, LogEntry } from './types';

/**
 * Calcula la RAM sugerida segura (en MB) para el cliente de Minecraft en base a
 * la memoria total del equipo del usuario y la recomendada por el modpack (10240 MB).
 * 
 * Reglas de seguridad:
 * - Equipos con <= 8 GB (8192 MB): Asignar 5120 MB (5 GB) o máx 6144 MB (6 GB) para evitar congelar Windows.
 * - Equipos con 12 GB - 15 GB: Asignar 8192 MB (8 GB).
 * - Equipos con 16 GB (16384 MB): Asignar exactamente 10240 MB (10 GB) como pide el modpack.
 * - Equipos con > 16 GB (ej. 32 GB): Asignar 10240 MB o 12288 MB.
 */
export function calculateSafeRamSuggestion(totalMemoryMb: number, modpackRecommendedMb = 10240): number {
  if (totalMemoryMb <= 8500) {
    // Para PCs de 8 GB o menos, dejamos al menos 2.5 GB libres para el OS
    return 5120; // 5 GB
  }
  if (totalMemoryMb <= 12500) {
    return 8192; // 8 GB
  }
  if (totalMemoryMb <= 18000) {
    // Para PCs de 16 GB, aplicamos los 10240 MB (10 GB) recomendados por Cobblemon Realms
    return Math.min(modpackRecommendedMb, 10240);
  }
  // Para PCs con 24 GB, 32 GB o más
  return Math.min(modpackRecommendedMb, 12288);
}

/**
 * CONFIGURACIÓN CENTRALIZADA DEL LAUNCHER (PRODUCCIÓN VPS ORACLE)
 */
export const APP_CONFIG = {
  APP_NAME: 'Cobblemon Realms Launcher',
  APP_VERSION: '1.0.0',

  // Servidor de Archivos CDN (VPS Oracle en Producción)
  VPS: {
    BASE_URL: 'http://150.136.126.253:8080',
    MANIFEST_URL: 'http://150.136.126.253:8080/manifest.json',
    CONCURRENCY: 8, // 8 descargas concurrentes con keep-alive
    TIMEOUT_MS: 30000,
  },

  // Parámetros de Minecraft y Modpack
  MINECRAFT: {
    PACK_NAME: 'Cobblemon Realms',
    VERSION: '1.21.1',
    LOADER_TYPE: 'neoforge' as const,
    LOADER_VERSION: '21.1.265',
    JAVA_REQUIRED_VERSION: 21,
    RECOMMENDED_RAM_MB: 10240, // 10 GB recomendados por el modpack
  },

  // Configuración de Servidor de Juego Minecraft
  SERVER: {
    NAME: 'Cobblemon Realms Privado',
    HOST: '150.136.126.253', // IP del VPS (o dominio configurable)
    PORT: 25565,
  },

  // Autenticación Premium Microsoft OAuth2 (login.live.com)
  AUTH: {
    CLIENT_ID: '00000000402b5328',
    REDIRECT_URI: 'https://login.live.com/oauth20_desktop.srf',
    SCOPE: 'service::user.auth.xboxlive.com::MBI_SSL',
  },

  // Descarga oficial de Java 21 Temurin (Adoptium API)
  ADOPTIUM: {
    API_URL: 'https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse',
  },

  // Rutas en el sistema
  PATHS: {
    FOLDER_NAME: '.cobblemon-realms-launcher',
    INSTANCE_SUBDIR: 'instance',
    RUNTIME_SUBDIR: 'runtime/java-21',
  },

  // Valores predeterminados para la configuración
  DEFAULT_SETTINGS: {
    ramMinMb: 2048,
    ramMaxMb: 10240, // 10 GB por defecto (se auto-ajusta a nivel seguro si la PC tiene <= 8 GB)
    jvmArgs: '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1ReservePercent=20 -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4',
    customJavaPath: '',
    useAutomaticJava21: true,
    windowWidth: 1280,
    windowHeight: 760,
    closeLauncherOnLaunch: false,
    mockMode: false, // ¡CONECTADO A PRODUCCIÓN REAL EN EL VPS!
    downloadConcurrency: 8,
  } as LauncherSettings,

  // Datos de fallback en caso de pérdida momentánea de conexión
  MOCK_DATA: {
    serverStatus: {
      online: true,
      motd: '§6§lCobblemon Realms §7| §fServidor Privado\n§a✔ Servidor Activo §8[§b1.21.1 NeoForge 21.1.265§8]',
      playersOnline: 4,
      playersMax: 16,
      ping: 45,
      version: 'NeoForge 21.1.265',
    } as ServerStatus,

    manifest: {
      packName: 'Cobblemon Realms',
      packVersion: '1.0.0',
      minecraftVersion: '1.21.1',
      recommendedRamMb: 10240,
      javaVersion: 21,
      loader: {
        type: 'neoforge',
        version: '21.1.265',
      },
      server: {
        name: 'Cobblemon Realms Privado',
        host: '150.136.126.253',
        port: 25565,
      },
      totalFiles: 2122,
      totalSize: 1430835967,
      files: [],
    } as ModpackManifest,

    defaultAccounts: [
      {
        id: 'offline-trainer-1',
        username: 'Red_Trainer',
        type: 'offline',
        uuid: '00000000-0000-3000-8000-000000000001',
        avatarUrl: 'https://mc-heads.net/avatar/Red_Trainer/100',
        addedAt: Date.now() - 86400000,
      }
    ] as Account[],

    initialLogs: [
      {
        id: '1',
        timestamp: '00:00:01',
        level: 'INFO',
        source: 'launcher',
        message: 'Cobblemon Realms Launcher iniciado.',
      },
      {
        id: '2',
        timestamp: '00:00:02',
        level: 'INFO',
        source: 'launcher',
        message: 'Conectando con CDN VPS Oracle: http://150.136.126.253:8080',
      }
    ] as LogEntry[]
  }
};
