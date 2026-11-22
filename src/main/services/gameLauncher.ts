import { ChildProcess } from 'child_process';
import path from 'path';
import { Version, launch, LaunchOption } from '@xmcl/core';
import { Account, LauncherSettings, LogEntry, ModpackManifest } from '../../shared/types';
import { APP_CONFIG } from '../../shared/config';

export interface LaunchGameParams {
  instanceDir: string;
  javaPath: string;
  versionId: string;
  account: Account;
  settings: LauncherSettings;
  manifest?: ModpackManifest | null;
  onLog: (entry: LogEntry) => void;
  onExit: (code: number) => void;
}

/**
 * Parsea una cadena de flags de JVM (ej. "-XX:+UseG1GC -Xms2G") a un array de strings.
 */
function parseJvmArgs(jvmArgsString: string): string[] {
  if (!jvmArgsString) return [];
  // Divide por espacios respetando posibles comillas
  const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
  const args: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(jvmArgsString)) !== null) {
    if (match[1]) {
      args.push(match[1]);
    } else if (match[2]) {
      args.push(match[2]);
    } else {
      args.push(match[0]);
    }
  }

  // Filtrar -Xms y -Xmx porque @xmcl los agrega automáticamente vía minMemory / maxMemory
  return args.filter((a) => !a.startsWith('-Xms') && !a.startsWith('-Xmx'));
}

/**
 * Resuelve la versión de Minecraft / NeoForge y lanza el proceso del juego con @xmcl/core.
 */
export async function launchMinecraft(params: LaunchGameParams): Promise<ChildProcess> {
  const { instanceDir, javaPath, versionId, account, settings, manifest, onLog, onExit } = params;

  const log = (level: LogEntry['level'], source: LogEntry['source'], message: string) => {
    onLog({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      level,
      source,
      message
    });
  };

  log('INFO', 'launcher', `Cargando definición de versión para "${versionId}" en ${instanceDir}...`);

  // 1. Parsear la versión instalada (resuelve herencias y librerías de NeoForge + Vanilla)
  const resolvedVersion = await Version.parse(instanceDir, versionId);
  log(
    'INFO',
    'launcher',
    `Versión resuelta: ${resolvedVersion.id} (Minecraft ${resolvedVersion.minecraftVersion}, Clase principal: ${resolvedVersion.mainClass})`
  );

  // 2. Extraer flags JVM configurados por el usuario
  const extraJvmArgs = parseJvmArgs(settings.jvmArgs);

  // 3. Preparar opciones del servidor de destino
  let serverHost = manifest?.server?.host || APP_CONFIG.SERVER.HOST;
  if (serverHost.includes('PON_AQUI') || serverHost.includes('placeholder')) {
    serverHost = '150.136.126.253';
  }
  const serverPort = manifest?.server?.port || APP_CONFIG.SERVER.PORT;

  // 4. Configurar opciones de lanzamiento
  const launchOptions: LaunchOption = {
    gamePath: instanceDir,
    resourcePath: instanceDir,
    javaPath,
    version: resolvedVersion,
    minMemory: settings.ramMinMb,
    maxMemory: settings.ramMaxMb,
    extraJVMArgs: extraJvmArgs,
    gameProfile: {
      name: account.username,
      id: account.uuid.replace(/-/g, '')
    },
    accessToken: account.accessToken || account.uuid,
    userType: account.type === 'microsoft' ? 'mojang' : 'legacy',
    resolution: {
      width: settings.windowWidth || 1280,
      height: settings.windowHeight || 760
    },
    // Conexión rápida al servidor de Cobblemon Realms
    server: {
      ip: serverHost,
      port: serverPort
    }
  };

  log(
    'INFO',
    'launcher',
    `Lanzando JVM [${javaPath}] con ${settings.ramMaxMb} MB RAM (-Xmx${settings.ramMaxMb}M)...`
  );

  // 5. Iniciar el proceso de Minecraft
  const process = await launch(launchOptions);

  log('INFO', 'launcher', `Proceso de Minecraft iniciado (PID: ${process.pid}).`);

  // 6. Capturar logs de salida estándar y error en tiempo real
  let bufferOut = '';
  process.stdout?.on('data', (data: Buffer) => {
    bufferOut += data.toString();
    const lines = bufferOut.split('\n');
    bufferOut = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let level: LogEntry['level'] = 'MINECRAFT';
      if (trimmed.includes('WARN')) level = 'WARN';
      else if (trimmed.includes('ERROR') || trimmed.includes('FATAL') || trimmed.includes('Exception')) level = 'ERROR';
      else if (trimmed.includes('DEBUG')) level = 'DEBUG';

      log(level, 'game', trimmed);
    }
  });

  let bufferErr = '';
  process.stderr?.on('data', (data: Buffer) => {
    bufferErr += data.toString();
    const lines = bufferErr.split('\n');
    bufferErr = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      log('WARN', 'game', trimmed);
    }
  });

  // 7. Monitorear terminación del proceso
  process.on('close', (code) => {
    const exitCode = code ?? 0;
    log(
      exitCode === 0 ? 'INFO' : 'ERROR',
      'launcher',
      `Minecraft finalizado con código de salida: ${exitCode}`
    );
    onExit(exitCode);
  });

  process.on('error', (err) => {
    log('ERROR', 'launcher', `Error en el proceso de Minecraft: ${err.message}`);
  });

  return process;
}
