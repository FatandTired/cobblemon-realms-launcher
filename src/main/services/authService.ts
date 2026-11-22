import { BrowserWindow, safeStorage, session } from 'electron';
import https from 'https';
import crypto from 'crypto';
import { Account } from '../../shared/types';
import { APP_CONFIG } from '../../shared/config';

// Client ID público oficial del launcher de Minecraft para OAuth2 en login.live.com
export const MS_CLIENT_ID = '00000000402b5328';
export const MS_REDIRECT_URI = 'https://login.live.com/oauth20_desktop.srf';
export const MS_SCOPE = 'service::user.auth.xboxlive.com::MBI_SSL';

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

/**
 * Limpia los datos y cookies de la partición dedicada 'ms-auth' al cerrar sesión.
 */
export async function clearMicrosoftSession(): Promise<void> {
  try {
    const ses = session.fromPartition('ms-auth');
    await ses.clearStorageData();
  } catch (err) {
    console.warn('Error al limpiar datos de sesión ms-auth:', err);
  }
}

/**
 * Realiza una petición POST enviando datos JSON o FormUrlEncoded por HTTPS.
 */
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
              let xerrCode: number | string | null = null;
              try {
                const parsed = JSON.parse(body);
                if (parsed.XErr) {
                  xerrCode = parsed.XErr;
                  errorDetail = `XErr: ${parsed.XErr} - ${parsed.Message || ''}`;
                } else {
                  errorDetail = parsed.errorMessage || parsed.error_description || parsed.error || body;
                }
              } catch {
                if (body) errorDetail += `: ${body}`;
              }
              const err = new Error(errorDetail);
              (err as any).statusCode = res.statusCode;
              (err as any).xerr = xerrCode;
              (err as any).responseBody = body;
              return reject(err);
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

/**
 * Realiza una petición GET por HTTPS y parsea la respuesta JSON.
 */
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
              } catch {
                if (body) errorDetail += `: ${body}`;
              }
              const err = new Error(errorDetail);
              (err as any).statusCode = res.statusCode;
              (err as any).responseBody = body;
              return reject(err);
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
 * Abre ventana modal limpia de Electron en partición 'ms-auth' para capturar el código OAuth2 de login.live.com.
 */
function acquireAuthorizationCode(parentWindow?: BrowserWindow | null): Promise<string> {
  return new Promise((resolve, reject) => {
    const authWindow = new BrowserWindow({
      width: 500,
      height: 680,
      parent: parentWindow || undefined,
      modal: !!parentWindow,
      show: false,
      title: 'Iniciar Sesión con Microsoft',
      backgroundColor: '#0b0f19',
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        partition: 'ms-auth'
      }
    });

    const authUrl = `https://login.live.com/oauth20_authorize.srf?client_id=${MS_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
      MS_REDIRECT_URI
    )}&scope=${encodeURIComponent(MS_SCOPE)}&prompt=select_account`;

    let finished = false;

    const checkRedirect = (url: string) => {
      if (finished) return;
      if (url.startsWith(MS_REDIRECT_URI)) {
        finished = true;
        try {
          const parsed = new URL(url);
          const code = parsed.searchParams.get('code');
          const error = parsed.searchParams.get('error');
          const errorDesc = parsed.searchParams.get('error_description');

          authWindow.destroy();

          if (code) {
            resolve(code);
          } else {
            reject(new Error(errorDesc || error || 'Autorización cancelada o denegada por Microsoft.'));
          }
        } catch (err: any) {
          authWindow.destroy();
          reject(new Error(`Error analizando redirección de autenticación: ${err.message}`));
        }
      }
    };

    authWindow.webContents.on('will-redirect', (_e, url) => checkRedirect(url));
    authWindow.webContents.on('will-navigate', (_e, url) => checkRedirect(url));
    authWindow.webContents.on('did-navigate', (_e, url) => checkRedirect(url));

    authWindow.once('ready-to-show', () => {
      if (!authWindow.isDestroyed()) {
        authWindow.show();
      }
    });

    authWindow.on('closed', () => {
      if (!finished) {
        finished = true;
        reject(new Error('Inicio de sesión de Microsoft cancelado por el usuario.'));
      }
    });

    authWindow.loadURL(authUrl).catch((err) => {
      if (!finished) {
        finished = true;
        reject(new Error(`No se pudo cargar la ventana de autenticación de Microsoft: ${err.message}`));
      }
    });
  });
}

/**
 * Autentica o renueva el token contra Xbox Live, XSTS y Minecraft Services.
 */
async function authenticateXboxAndMinecraft(
  msAccessToken: string,
  log: (m: string) => void
): Promise<{ minecraftToken: string; expiresAt: number }> {
  log('Autenticando con Xbox Live (user.auth.xboxlive.com)...');

  // REGLA CRÍTICA DE LOGIN.LIVE.COM:
  // Con el scope MBI_SSL de login.live.com, RpsTicket se envía como el access_token DIRECTO SIN el prefijo "d=".
  const xbl = await httpsPostJson('user.auth.xboxlive.com', '/user/authenticate', {
    Properties: {
      AuthMethod: 'RPS',
      SiteName: 'user.auth.xboxlive.com',
      RpsTicket: msAccessToken
    },
    RelyingParty: 'http://auth.xboxlive.com',
    TokenType: 'JWT'
  });

  const xblToken = xbl.Token;
  const uhs = xbl.DisplayClaims?.xui?.[0]?.uhs;
  if (!xblToken || !uhs) {
    throw new Error('No se recibió Token o UHS válido de Xbox Live.');
  }

  log('Solicitando token de autorización XSTS para Minecraft Services...');
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
    const msg = String(err.message || err.responseBody || '');
    if (msg.includes('2148916238') || err.xerr === 2148916238) {
      throw new Error(
        'La cuenta de Microsoft pertenece a un menor de edad y debe ser agregada a una Familia de Microsoft por un adulto para autorizar el juego en línea.'
      );
    } else if (msg.includes('2148916233') || err.xerr === 2148916233) {
      throw new Error('La cuenta de Microsoft no tiene un perfil de Xbox creado. Ingresa a https://www.xbox.com para configurarlo.');
    } else if (msg.includes('2148916235') || err.xerr === 2148916235) {
      throw new Error('Xbox Live no se encuentra disponible en tu país o región actual.');
    }
    throw err;
  }

  const xstsToken = xsts.Token;
  if (!xstsToken) {
    throw new Error('No se recibió Token XSTS válido.');
  }

  log('Iniciando sesión en los servicios oficiales de Minecraft (login_with_xbox)...');
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
 * Inicia el flujo real de autenticación Microsoft usando el flujo heredado de login.live.com.
 */
export async function loginMicrosoftAccount(
  parentWindow?: BrowserWindow | null,
  onLog?: (msg: string) => void
): Promise<Account> {
  const log = (m: string) => {
    if (onLog) onLog(m);
  };

  log('Abriendo ventana modal de inicio de sesión de Microsoft (login.live.com)...');
  const code = await acquireAuthorizationCode(parentWindow);

  log('Intercambiando código por tokens en login.live.com/oauth20_token.srf...');
  const tokenData = await httpsPostJson(
    'login.live.com',
    '/oauth20_token.srf',
    {
      client_id: MS_CLIENT_ID,
      code,
      grant_type: 'authorization_code',
      redirect_uri: MS_REDIRECT_URI,
      scope: MS_SCOPE
    },
    true
  );

  const msAccessToken = tokenData.access_token;
  const msRefreshToken = tokenData.refresh_token;

  if (!msAccessToken) {
    throw new Error('No se recibió access_token de Microsoft.');
  }

  // Cadena Xbox Live -> XSTS -> Minecraft Services
  const { minecraftToken, expiresAt } = await authenticateXboxAndMinecraft(msAccessToken, log);

  // Consulta de perfil oficial y validación de licencia
  log('Validando perfil oficial y licencia de Minecraft Java Edition...');
  let profile: any;
  try {
    profile = await httpsGetJson('api.minecraftservices.com', '/minecraft/profile', {
      Authorization: `Bearer ${minecraftToken}`
    });
  } catch (err: any) {
    if (err.statusCode === 404 || err.message?.includes('404') || err.message?.includes('NOT_FOUND')) {
      throw new Error(
        'Esta cuenta de Microsoft no posee una licencia activa de Minecraft Java Edition (o aún no ha creado su perfil de jugador).'
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

  log(`¡Cuenta Microsoft autenticada exitosamente! Usuario: ${profile.name} [UUID: ${formattedUuid}]`);
  return account;
}

/**
 * Renueva el token de una cuenta Microsoft usando login.live.com si está expirado o próximo a expirar.
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

  try {
    const tokenData = await httpsPostJson(
      'login.live.com',
      '/oauth20_token.srf',
      {
        client_id: MS_CLIENT_ID,
        refresh_token: rawRefreshToken,
        grant_type: 'refresh_token',
        redirect_uri: MS_REDIRECT_URI,
        scope: MS_SCOPE
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
