import { BrowserWindow, safeStorage } from 'electron';
import https from 'https';
import crypto from 'crypto';
import { Account } from '../../shared/types';
import { APP_CONFIG } from '../../shared/config';

// Client ID público oficial de Minecraft Launcher para Xbox Live OAuth2
const OFFICIAL_MC_CLIENT_ID = '00000000402b5328';
const MS_REDIRECT_URI = 'https://login.live.com/oauth20_desktop.srf';
const MS_SCOPE = 'service::user.auth.xboxlive.com::MBI_SSL';

function getActiveClientId(): string {
  const configured = APP_CONFIG.AUTH.AZURE_CLIENT_ID;
  if (!configured || configured === '00000000-0000-0000-0000-000000000000') {
    return OFFICIAL_MC_CLIENT_ID;
  }
  return configured;
}

/**
 * Cifra un texto sensible con safeStorage de Electron si está disponible.
 */
export function encryptSensitiveToken(plainText: string): string {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(plainText);
      return `enc:${encrypted.toString('base64')}`;
    }
  } catch (err) {
    console.warn('safeStorage no disponible para cifrar token:', err);
  }
  return plainText;
}

/**
 * Descifra un token protegido con safeStorage.
 */
export function decryptSensitiveToken(storedText: string): string {
  if (!storedText) return '';
  if (storedText.startsWith('enc:')) {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const buffer = Buffer.from(storedText.substring(4), 'base64');
        return safeStorage.decryptString(buffer);
      }
    } catch (err) {
      console.warn('safeStorage no pudo descifrar token:', err);
    }
  }
  return storedText;
}

function httpsPostJson<T = any>(
  hostname: string,
  path: string,
  data: any,
  isFormUrlEncoded = false,
  extraHeaders: Record<string, string> = {}
): Promise<T> {
  return new Promise((resolve, reject) => {
    const postBody = isFormUrlEncoded ? new URLSearchParams(data).toString() : JSON.stringify(data);

    const headers: Record<string, string> = {
      'Content-Type': isFormUrlEncoded ? 'application/x-www-form-urlencoded' : 'application/json',
      'Content-Length': Buffer.byteLength(postBody).toString(),
      Accept: 'application/json',
      'User-Agent': `${APP_CONFIG.APP_NAME}/${APP_CONFIG.APP_VERSION}`,
      ...extraHeaders
    };

    const req = https.request(
      {
        hostname,
        port: 443,
        path,
        method: 'POST',
        headers
      },
      (res) => {
        let body = '';
        res.setEncoding('utf-8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
              let errorDetail = `HTTP ${res.statusCode}`;
              try {
                const parsed = JSON.parse(body);
                errorDetail = parsed.errorMessage || parsed.error || parsed.error_description || body;
              } catch {}
              return reject(new Error(errorDetail));
            }
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (err: any) {
            reject(new Error(`Fallo procesando respuesta de ${hostname}: ${err.message}`));
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.write(postBody);
    req.end();
  });
}

function httpsGetJson<T = any>(hostname: string, path: string, headers: Record<string, string> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname,
        port: 443,
        path,
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': `${APP_CONFIG.APP_NAME}/${APP_CONFIG.APP_VERSION}`,
          ...headers
        }
      },
      (res) => {
        let body = '';
        res.setEncoding('utf-8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
              let errorDetail = `HTTP ${res.statusCode}`;
              try {
                const parsed = JSON.parse(body);
                errorDetail = parsed.errorMessage || parsed.error || body;
              } catch {}
              return reject(new Error(errorDetail));
            }
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (err: any) {
            reject(new Error(`Fallo en GET ${hostname}: ${err.message}`));
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.end();
  });
}

/**
 * Abre ventana modal de Electron para capturar el código OAuth2 de Microsoft.
 */
function acquireAuthorizationCode(parentWindow?: BrowserWindow | null): Promise<string> {
  return new Promise((resolve, reject) => {
    const clientId = getActiveClientId();
    const authWindow = new BrowserWindow({
      width: 520,
      height: 680,
      parent: parentWindow || undefined,
      modal: !!parentWindow,
      show: false,
      title: 'Iniciar Sesión en Microsoft (Minecraft)',
      backgroundColor: '#0b0f19',
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const authUrl = `https://login.live.com/oauth20_authorize.srf?client_id=${clientId}&response_type=code&scope=${encodeURIComponent(
      MS_SCOPE
    )}&redirect_uri=${encodeURIComponent(MS_REDIRECT_URI)}&prompt=select_account`;

    let finished = false;

    const checkRedirect = (url: string) => {
      if (url.startsWith(MS_REDIRECT_URI)) {
        try {
          const parsed = new URL(url);
          const code = parsed.searchParams.get('code');
          const error = parsed.searchParams.get('error');
          const desc = parsed.searchParams.get('error_description');

          finished = true;
          authWindow.destroy();

          if (code) {
            resolve(code);
          } else {
            reject(new Error(desc || error || 'Autorización cancelada o fallida'));
          }
        } catch (err) {
          finished = true;
          authWindow.destroy();
          reject(err);
        }
      }
    };

    authWindow.webContents.on('will-redirect', (_e, url) => checkRedirect(url));
    authWindow.webContents.on('will-navigate', (_e, url) => checkRedirect(url));
    authWindow.once('ready-to-show', () => authWindow.show());
    authWindow.on('closed', () => {
      if (!finished) {
        finished = true;
        reject(new Error('Inicio de sesión de Microsoft cancelado por el usuario.'));
      }
    });

    authWindow.loadURL(authUrl);
  });
}

/**
 * Autentica o renueva el token contra Xbox Live, XSTS y Minecraft Services.
 */
async function authenticateXboxAndMinecraft(
  msAccessToken: string,
  log: (m: string) => void
): Promise<{ minecraftToken: string; expiresAt: number }> {
  log('Autenticando con Xbox Live (XBL)...');
  const xbl = await httpsPostJson('user.auth.xboxlive.com', '/user/authenticate', {
    Properties: {
      AuthMethod: 'RPS',
      SiteName: 'user.auth.xboxlive.com',
      RpsTicket: `d=${msAccessToken}`
    },
    RelyingParty: 'http://auth.xboxlive.com',
    TokenType: 'JWT'
  });

  const xblToken = xbl.Token;
  const uhs = xbl.DisplayClaims?.xui?.[0]?.uhs;
  if (!xblToken || !uhs) {
    throw new Error('No se recibió Token o UHS válido de Xbox Live.');
  }

  log('Solicitando token de autorización XSTS para Minecraft...');
  let xsts: any;
  try {
    xsts = await httpsPostJson('xsts.auth.xboxlive.com', '/xsts/authorize', {
      Properties: {
        SandboxId: 'RETAIL',
        UserTokens: [xblToken]
      },
      RelyingParty: 'rp://api.minecraftservices.com/',
      TokenType: 'JWT'
    });
  } catch (err: any) {
    const msg = err.message || '';
    if (msg.includes('2148916238')) {
      throw new Error(
        'La cuenta de Microsoft es menor de edad y debe ser agregada a una Familia de Microsoft por un adulto para poder jugar en línea.'
      );
    } else if (msg.includes('2148916233')) {
      throw new Error('La cuenta no tiene un perfil de Xbox creado. Entra a xbox.com para activarlo.');
    }
    throw err;
  }

  const xstsToken = xsts.Token;
  if (!xstsToken) {
    throw new Error('No se recibió Token XSTS válido.');
  }

  log('Iniciando sesión en los servicios de Minecraft...');
  const mcLogin = await httpsPostJson('api.minecraftservices.com', '/authentication/login_with_xbox', {
    identityToken: `XBL3.0 x=${uhs};${xstsToken}`
  });

  const minecraftToken = mcLogin.access_token;
  const expiresIn = mcLogin.expires_in || 86400;

  if (!minecraftToken) {
    throw new Error('No se recibió el token de acceso de Minecraft Services.');
  }

  return {
    minecraftToken,
    expiresAt: Date.now() + expiresIn * 1000
  };
}

/**
 * Valida la posesión de la licencia de Minecraft Java Edition.
 */
async function verifyMinecraftEntitlements(mcAccessToken: string, log: (m: string) => void): Promise<boolean> {
  log('Verificando licencia de Minecraft Java Edition...');
  try {
    const entitlements = await httpsGetJson('api.minecraftservices.com', '/entitlements/mcstore', {
      Authorization: `Bearer ${mcAccessToken}`
    });

    const items = entitlements.items || [];
    const ownsJava = items.some(
      (item: any) =>
        item.name === 'product_minecraft' ||
        item.name === 'game_minecraft' ||
        item.name === 'game_minecraft_bedrock'
    );
    return ownsJava;
  } catch (err) {
    console.warn('Aviso al verificar entitlements en mcstore:', err);
    // Continuamos a verificar profile que es la fuente definitiva de existencia de personaje
    return true;
  }
}

/**
 * Inicia el flujo real de autenticación Microsoft para Minecraft.
 */
export async function loginMicrosoftAccount(
  parentWindow?: BrowserWindow | null,
  onLog?: (msg: string) => void
): Promise<Account> {
  const log = (m: string) => {
    if (onLog) onLog(m);
  };

  const clientId = getActiveClientId();
  log(`Iniciando flujo Microsoft OAuth2 (Client ID: ${clientId.substring(0, 8)}...)...`);

  const code = await acquireAuthorizationCode(parentWindow);

  log('Canjeando código por tokens OAuth2 en login.live.com...');
  const tokenData = await httpsPostJson(
    'login.live.com',
    '/oauth20_token.srf',
    {
      client_id: clientId,
      code,
      grant_type: 'authorization_code',
      redirect_uri: MS_REDIRECT_URI
    },
    true
  );

  const msAccessToken = tokenData.access_token;
  const msRefreshToken = tokenData.refresh_token;

  // Intercambio Xbox Live -> XSTS -> Minecraft
  const { minecraftToken, expiresAt } = await authenticateXboxAndMinecraft(msAccessToken, log);

  // Validación de Licencia
  await verifyMinecraftEntitlements(minecraftToken, log);

  // Consulta de perfil oficial
  log('Obteniendo perfil de Minecraft oficial (nombre y UUID)...');
  let profile: any;
  try {
    profile = await httpsGetJson('api.minecraftservices.com', '/minecraft/profile', {
      Authorization: `Bearer ${minecraftToken}`
    });
  } catch (err: any) {
    if (err.message?.includes('404') || err.message?.includes('NOT_FOUND')) {
      throw new Error(
        'Esta cuenta de Microsoft no posee una copia comprada de Minecraft Java Edition ni un gamertag registrado.'
      );
    }
    throw err;
  }

  const rawId = profile.id.replace(/-/g, '');
  const formattedUuid = `${rawId.substring(0, 8)}-${rawId.substring(8, 12)}-${rawId.substring(
    12,
    16
  )}-${rawId.substring(16, 20)}-${rawId.substring(20)}`;

  const account: Account = {
    id: crypto.randomUUID(),
    username: profile.name,
    type: 'microsoft',
    uuid: formattedUuid,
    accessToken: encryptSensitiveToken(minecraftToken),
    refreshToken: msRefreshToken ? encryptSensitiveToken(msRefreshToken) : undefined,
    avatarUrl: `https://mc-heads.net/avatar/${profile.name}/100`,
    expiresAt,
    addedAt: Date.now()
  };

  log(`¡Cuenta Microsoft validada con éxito! Jugador: ${profile.name} [UUID: ${formattedUuid}]`);
  return account;
}

/**
 * Renueva el token de una cuenta Microsoft si está expirado o próximo a expirar.
 */
export async function refreshMicrosoftAccountIfNeeded(
  account: Account,
  onLog?: (msg: string) => void
): Promise<Account> {
  if (account.type !== 'microsoft' || !account.refreshToken) {
    return account;
  }

  // Renovar si faltan menos de 10 minutos para expirar
  const needsRefresh = !account.expiresAt || account.expiresAt - Date.now() < 10 * 60 * 1000;
  if (!needsRefresh) {
    return account;
  }

  const log = (m: string) => {
    if (onLog) onLog(m);
  };

  log(`Renovando sesión Microsoft para el usuario ${account.username}...`);
  const rawRefreshToken = decryptSensitiveToken(account.refreshToken);
  const clientId = getActiveClientId();

  try {
    const tokenData = await httpsPostJson(
      'login.live.com',
      '/oauth20_token.srf',
      {
        client_id: clientId,
        refresh_token: rawRefreshToken,
        grant_type: 'refresh_token',
        redirect_uri: MS_REDIRECT_URI
      },
      true
    );

    const newMsAccess = tokenData.access_token;
    const newMsRefresh = tokenData.refresh_token || rawRefreshToken;

    const { minecraftToken, expiresAt } = await authenticateXboxAndMinecraft(newMsAccess, log);

    const updatedAccount: Account = {
      ...account,
      accessToken: encryptSensitiveToken(minecraftToken),
      refreshToken: encryptSensitiveToken(newMsRefresh),
      expiresAt
    };

    log(`Sesión de ${account.username} renovada exitosamente.`);
    return updatedAccount;
  } catch (err: any) {
    log(`Aviso: No se pudo renovar token de Microsoft (${err.message}). Se usará credencial existente si aún es válida.`);
    return account;
  }
}

/**
 * Crea una cuenta Offline determinística con UUID v3 estándar de Minecraft.
 */
export function createOfflineAccount(username: string): Account {
  const cleanName = username.trim();
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(cleanName)) {
    throw new Error('El nombre de usuario debe tener entre 3 y 16 caracteres alfanuméricos (letras, números y _).');
  }

  // Generación determinística de UUID v3: MD5("OfflinePlayer:" + username)
  const hash = crypto.createHash('md5').update(`OfflinePlayer:${cleanName}`).digest();
  // Set version bits to 3
  hash[6] = (hash[6] & 0x0f) | 0x30;
  // Set variant bits to IETF variant
  hash[8] = (hash[8] & 0x3f) | 0x80;

  const hex = hash.toString('hex');
  const uuid = `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;

  return {
    id: crypto.randomUUID(),
    username: cleanName,
    type: 'offline',
    uuid,
    avatarUrl: `https://mc-heads.net/avatar/${cleanName}/100`,
    addedAt: Date.now()
  };
}
