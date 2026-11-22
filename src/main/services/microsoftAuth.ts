import { BrowserWindow } from 'electron';
import https from 'https';
import crypto from 'crypto';
import { Account } from '../../shared/types';

// Client ID público oficial de Minecraft Launcher para OAuth2 con Xbox Live
const MS_CLIENT_ID = '00000000402b5328';
const MS_REDIRECT_URI = 'https://login.live.com/oauth20_desktop.srf';
const MS_SCOPE = 'service::user.auth.xboxlive.com::MBI_SSL';

/**
 * Realiza una petición HTTPS POST enviando JSON o x-www-form-urlencoded y parsea la respuesta JSON.
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

/**
 * Realiza una petición HTTPS GET con headers y parsea la respuesta JSON.
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
 * Abre una ventana emergente de Electron para que el usuario inicie sesión en Microsoft.
 * Captura el código de autorización una vez completado el login.
 */
function acquireAuthorizationCode(parentWindow?: BrowserWindow | null): Promise<string> {
  return new Promise((resolve, reject) => {
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

    const authUrl = `https://login.live.com/oauth20_authorize.srf?client_id=${MS_CLIENT_ID}&response_type=code&scope=${encodeURIComponent(
      MS_SCOPE
    )}&redirect_uri=${encodeURIComponent(MS_REDIRECT_URI)}&prompt=select_account`;

    let settled = false;

    const checkRedirect = (url: string) => {
      if (url.startsWith(MS_REDIRECT_URI)) {
        try {
          const parsedUrl = new URL(url);
          const code = parsedUrl.searchParams.get('code');
          const error = parsedUrl.searchParams.get('error');
          const errorDescription = parsedUrl.searchParams.get('error_description');

          settled = true;
          authWindow.destroy();

          if (code) {
            resolve(code);
          } else {
            reject(new Error(errorDescription || error || 'Autorización cancelada o fallida'));
          }
        } catch (err) {
          settled = true;
          authWindow.destroy();
          reject(err);
        }
      }
    };

    authWindow.webContents.on('will-redirect', (_event, url) => {
      checkRedirect(url);
    });

    authWindow.webContents.on('will-navigate', (_event, url) => {
      checkRedirect(url);
    });

    authWindow.once('ready-to-show', () => {
      authWindow.show();
    });

    authWindow.on('closed', () => {
      if (!settled) {
        settled = true;
        reject(new Error('Inicio de sesión cancelado por el usuario.'));
      }
    });

    authWindow.loadURL(authUrl);
  });
}

/**
 * Flujo completo de autenticación de Minecraft con Microsoft (OAuth2 -> Xbox Live -> XSTS -> Minecraft Services).
 */
export async function authenticateMicrosoftAccount(
  parentWindow?: BrowserWindow | null,
  onLog?: (msg: string) => void
): Promise<Account> {
  const log = (m: string) => {
    if (onLog) onLog(m);
  };

  log('Paso 1/5: Abriendo ventana de inicio de sesión de Microsoft...');
  const code = await acquireAuthorizationCode(parentWindow);

  log('Paso 2/5: Canjeando código por token de Microsoft...');
  const msTokenResponse = await httpsPostJson(
    'login.live.com',
    '/oauth20_token.srf',
    {
      client_id: MS_CLIENT_ID,
      code,
      grant_type: 'authorization_code',
      redirect_uri: MS_REDIRECT_URI
    },
    true
  );

  const msAccessToken = msTokenResponse.access_token;
  const msRefreshToken = msTokenResponse.refresh_token;

  log('Paso 3/5: Autenticando con Xbox Live (XBL)...');
  const xblResponse = await httpsPostJson('user.auth.xboxlive.com', '/user/authenticate', {
    Properties: {
      AuthMethod: 'RPS',
      SiteName: 'user.auth.xboxlive.com',
      RpsTicket: `d=${msAccessToken}`
    },
    RelyingParty: 'http://auth.xboxlive.com',
    TokenType: 'JWT'
  });

  const xblToken = xblResponse.Token;
  const uhs = xblResponse.DisplayClaims?.xui?.[0]?.uhs;
  if (!xblToken || !uhs) {
    throw new Error('Fallo al obtener token o UHS de Xbox Live.');
  }

  log('Paso 4/5: Obteniendo token de seguridad XSTS para Minecraft...');
  let xstsResponse: any;
  try {
    xstsResponse = await httpsPostJson('xsts.auth.xboxlive.com', '/xsts/authorize', {
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
        'La cuenta de Microsoft es menor de edad y debe ser agregada a una Familia de Microsoft por un adulto.'
      );
    } else if (msg.includes('2148916233')) {
      throw new Error('La cuenta no tiene un perfil de Xbox creado. Entra a xbox.com para crearlo.');
    }
    throw err;
  }

  const xstsToken = xstsResponse.Token;
  if (!xstsToken) {
    throw new Error('Fallo al obtener token XSTS.');
  }

  log('Paso 5/5: Autenticando con los servicios de Minecraft...');
  const mcLoginResponse = await httpsPostJson('api.minecraftservices.com', '/authentication/login_with_xbox', {
    identityToken: `XBL3.0 x=${uhs};${xstsToken}`
  });

  const mcAccessToken = mcLoginResponse.access_token;
  if (!mcAccessToken) {
    throw new Error('No se recibió el token de acceso de Minecraft.');
  }

  log('Consultando perfil de Minecraft (nombre, UUID y skin)...');
  let profile: any;
  try {
    profile = await httpsGetJson('api.minecraftservices.com', '/minecraft/profile', {
      Authorization: `Bearer ${mcAccessToken}`
    });
  } catch (err: any) {
    if (err.message?.includes('404') || err.message?.includes('NOT_FOUND')) {
      throw new Error(
        'Esta cuenta de Microsoft no posee una copia comprada de Minecraft Java Edition.'
      );
    }
    throw err;
  }

  // Dar formato canónico al UUID con guiones: 8-4-4-4-12
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
    accessToken: mcAccessToken,
    refreshToken: msRefreshToken,
    avatarUrl: `https://mc-heads.net/avatar/${profile.name}/100`,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    addedAt: Date.now()
  };

  log(`¡Cuenta de Microsoft autenticada exitosamente! Bienvenido, ${profile.name} [UUID: ${formattedUuid}].`);
  return account;
}
