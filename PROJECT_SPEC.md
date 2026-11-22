# PROJECT_SPEC.md — Custom Minecraft Launcher (Cobblemon Realms)

## 1. Visión General del Proyecto
Desarrollar una aplicación de escritorio multiplataforma (prioridad Windows 10/11, compatible con Linux/macOS) construida con **Electron + React + TypeScript** que funcione como launcher dedicado y autónomo para un servidor privado de Minecraft (~16 jugadores) basado en el modpack **Cobblemon Realms**.

El objetivo principal es ofrecer una experiencia **"1-Click Play"**: el jugador abre el launcher, elige su cuenta (Premium o No-Premium), pulsa Jugar, y el launcher gestiona automáticamente Java 21, la instalación de NeoForge, la sincronización diferencial de mods/configs desde un VPS propio y el lanzamiento del juego, sin depender de CurseForge, Overwolf ni TLauncher.

---

## 2. Parámetros del Modpack y Entorno
- **Modpack objetivo:** Cobblemon Realms (CurseForge)
- **Versión de Minecraft:** `1.21.1` (configurable remotamente vía manifiesto)
- **Modloader:** `NeoForge` (versión exacta definida remotamente en `manifest.json`)
- **Runtime requerido:** Java 21 (JRE/JDK 21 - Eclipse Temurin gestionado automáticamente por el launcher)
- **Servidor de archivos (Modpack CDN):** VPS propio (Oracle Cloud) sirviendo archivos estáticos vía HTTP/HTTPS + `manifest.json`.
- **Entorno de desarrollo local disponible:** Node.js y Python instalados.

---

## 3. Stack Tecnológico Recomendado
- **Core Desktop:** Electron (última versión estable) con `contextIsolation: true` y `preload.ts` seguro (IPC tipado).
- **Frontend UI:** React + TypeScript + Vite + Tailwind CSS + Lucide Icons (estética moderna oscura inspirada en Cobblemon/gaming, limpia y responsiva).
- **Motor de Minecraft (Backend/Main Process):**
  - Opción principal: `@xmcl/core`, `@xmcl/installer`, `@xmcl/user`, `@xmcl/client` (para instalar Minecraft 1.21.1, NeoForge, lanzar JVM y hacer ping al estado del servidor).
  - Opción alternativa a evaluar con el usuario: `eml-lib` v2.
- **Empaquetado y Distribución:** `electron-builder` (generando instalador `.exe` NSIS o portable para Windows) + soporte preparado para `electron-updater`.
- **Herramienta de Servidor (VPS):** Script en Python o Node.js (`generate_manifest.py` / `.mjs`) para generar `manifest.json` a partir de la carpeta del modpack en el VPS.

---

## 4. Requisitos Funcionales Detallados

### 4.1. Sistema de Autenticación Dual (CRUCIAL)
El launcher debe soportar cuentas guardadas y cambio rápido entre perfiles:
1. **Modo No-Premium (Offline):**
   - Ingreso solo con nombre de usuario (validado: 3-16 caracteres, alfanumérico y `_`).
   - Generación de UUID v3 estándar de Minecraft offline (`OfflinePlayer:<username>`).
   - Avatar renderizado en UI (fallback a cabeza de Steve/Alex o API pública de skins si existe).
2. **Modo Premium (Microsoft OAuth2):**
   - Flujo completo Microsoft OAuth2 → Xbox Live → XSTS → Minecraft Services.
   - Renovación automática de refresh tokens almacenados de forma segura (usando `safeStorage` de Electron).
   - El `AZURE_CLIENT_ID` debe ser configurable vía archivo de configuración/entorno para evitar hardcoding.

### 4.2. Gestión Automática de Java 21
- Al iniciar o antes de lanzar, verificar si existe un JRE 21 válido en la carpeta interna del launcher (`<appData>/runtime/java-21`).
- Si no existe, descargarlo automáticamente desde la API oficial de Adoptium (Eclipse Temurin JRE 21 para el OS y arquitectura del usuario), descomprimirlo y mostrar progreso en la UI.
- Permitir al usuario sobrescribir la ruta de `javaw.exe` manualmente en Ajustes si lo desea.

### 4.3. Instalación Automática de Minecraft + NeoForge
- Directorio de instancia aislado del `.minecraft` oficial (ej. `%APPDATA%/.cobblemon-realms-launcher/instance`) para no interferir con otras instalaciones del jugador.
- Descarga automática de binarios vanilla de Minecraft 1.21.1, librerías, assets y nativos.
- Descarga e instalación silenciosa del instalador de NeoForge correspondiente a la versión especificada en `manifest.json` (ejecutando los procesadores de NeoForge con el Java 21 portátil).
- Verificación de integridad antes de lanzar para evitar reinstalaciones innecesarias.

### 4.4. Sincronización Diferencial con VPS (Delta Sync)
El launcher consultará `<VPS_BASE_URL>/manifest.json` antes de cada lanzamiento.

**Políticas de carpetas:**
- **`strict` (sincronización exacta — borra archivos locales que no estén en el manifiesto):** `mods/`, `kubejs/`, `defaultconfigs/`.
- **`merge` (descarga/actualiza si cambia el hash, pero NO borra archivos extra del jugador):** `config/`, `resourcepacks/`, `shaderpacks/`.
- **`seed` (solo descarga si el archivo NO existe localmente; respeta cambios del usuario):** `options.txt`, `servers.dat`.

**Esquema propuesto de `manifest.json`:**
```json
{
  "packVersion": "1.0.0",
  "minecraftVersion": "1.21.1",
  "loader": {
    "type": "neoforge",
    "version": "21.1.x"
  },
  "server": {
    "name": "Cobblemon Realms Privado",
    "host": "play.tudominio.com",
    "port": 25565
  },
  "files": [
    {
      "path": "mods/cobblemon-1.x.x.jar",
      "url": "https://tu-vps/pack/mods/cobblemon-1.x.x.jar",
      "sha256": "...",
      "size": 12345678,
      "policy": "strict"
    }
  ]
}
```
