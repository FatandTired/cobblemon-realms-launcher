# Cobblemon Realms Launcher ⚡

**Cobblemon Realms Launcher** es una aplicación de escritorio gratuita y de código abierto creada para gestionar y mantener actualizado el modpack de nuestra comunidad privada de amigos. Su propósito principal es brindar una experiencia fluida y sin fricción ("1-Click Play"), permitiendo que cualquier jugador ingrese al servidor sin tener que lidiar con instalaciones manuales de Java, configuraciones complejas de cargadores de mods o desajustes entre versiones de archivos.

El lanzador automatiza de extremo a extremo todo el proceso técnico: detecta y descarga de forma autónoma el runtime persistente de **Java 21 (Eclipse Temurin JRE)**, sincroniza diferencialmente más de 2,100 archivos (mods, configuraciones, datapacks y shaders) directamente desde nuestro servidor CDN en un VPS Oracle, instala silenciosamente **NeoForge 21.1.265** para **Minecraft 1.21.1** y permite jugar tanto a usuarios con cuentas Premium oficiales de Microsoft como No-Premium (Offline).

---

## 🚀 Características Principales

- **🎮 Sincronización Diferencial (Delta Sync):**
  - Conexión directa contra el servidor CDN privado mediante HTTP keep-alive y descargas multihilo concurrentes (8 workers).
  - Verificación exhaustiva de integridad por hash SHA-256.
  - Políticas granulares de sincronización:
    - `strict`: Mantiene carpetas críticas (`mods/`, `kubejs/`, `datapacks/`) exactamente iguales al servidor, eliminando mods obsoletos automáticamente.
    - `merge`: Actualiza configs y resource packs respetando personalizaciones del jugador.
    - `seed`: Descarga configuraciones iniciales (`servers.dat`, `options.txt`) únicamente si no existen en el cliente.
- **☕ Java 21 Persistente y Verificado:**
  - Descarga automática y descompresión nativa mediante `adm-zip` (sin dependencias de consola externas en Windows).
  - Almacenamiento persistente en el directorio de usuario (`app.getPath('userData')/runtime/java-21`).
  - Validación estricta con ejecución de `java.exe -version` y confirmación de salida antes del uso.
- **🔐 Autenticación Dual Completa:**
  - **Microsoft (Premium):** Flujo oficial OAuth2 de Microsoft y Xbox Live vía ventana modal integrada de Electron, con validación de licencia en `entitlements/mcstore`, consulta de gamertag en `minecraft/profile`, cifrado de tokens en reposo con `safeStorage` y renovación automática por `refresh_token`.
  - **No-Premium (Offline):** Generación determinística de UUID v3 conforme al estándar oficial de Minecraft (`MD5("OfflinePlayer:" + username)`).
- **🛠️ Ajustes y Optimización JVM:**
  - Slider intuitivo de memoria RAM con selector inteligente de asignación segura según la memoria total del sistema.
  - Flags preconfiguradas para el recolector G1GC optimizadas para modpacks pesados de Cobblemon.
- **📋 Consola y Monitoreo en Tiempo Real:**
  - Visor de logs en vivo conectado a `stdout` y `stderr` del proceso del juego.
  - Filtro por niveles (`INFO`, `WARN`, `ERROR`, `MINECRAFT`) y detección automática del último reporte de error (`crash-reports/`).

---

## 💻 Stack Tecnológico

- **Entorno de Ejecución:** Electron 33 (con `contextIsolation` y puente IPC fuertemente tipado).
- **Interfaz de Usuario:** React 18, TypeScript, Tailwind CSS, Lucide Icons.
- **Empaquetado y Bundling:** Vite 6, `vite-plugin-electron`, `electron-builder`.
- **Motor de Minecraft:** `@xmcl/core`, `@xmcl/installer`, `@xmcl/user`.

---

## 📦 Ejecución y Desarrollo

### Requisitos Previos
- [Node.js](https://nodejs.org/) v20 o superior.
- Git.

### Instalación de Dependencias
```bash
npm install
```

### Modo Desarrollo
Para probar la aplicación en tiempo real visualizando los logs del proceso principal en la consola:
```bash
npm run dev
```

### Compilar Proyecto
```bash
npm run build
```

### Generar Ejecutables para Windows (.exe)
```bash
# Genera instalador NSIS y ejecutable Portable en la carpeta /release
npm run build:electron

# O generar únicamente la versión Portable
npm run build:exe
```

---

## 📂 Directorios de la Aplicación

El launcher almacena de manera aislada los datos de la instancia y los runtimes en las rutas estándar del sistema operativo:
- **Instancia del Juego (mods, configs, saves):** `%APPDATA%\Cobblemon Realms\instance`
- **Java 21 Portátil:** `%APPDATA%\Cobblemon Realms\runtime\java-21`
- **Configuración y Cuentas:** `%APPDATA%\Cobblemon Realms\launcher-store.json`

---

## 📜 Licencia

Proyecto de uso libre y comunitario para los miembros de Cobblemon Realms. Desarrollado con ❤️ para jugar entre amigos.
