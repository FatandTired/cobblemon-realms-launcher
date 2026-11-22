import fs from 'fs';
import path from 'path';
import os from 'os';
import { app } from 'electron';
import { Account, LauncherSettings } from '../shared/types';
import { APP_CONFIG, calculateSafeRamSuggestion } from '../shared/config';

interface LauncherData {
  accounts: Account[];
  activeAccountId: string | null;
  settings: LauncherSettings;
}

export class LauncherStore {
  private dataFilePath: string;
  private data: LauncherData;

  constructor() {
    const dataDir = app.getPath('userData');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dataFilePath = path.join(dataDir, 'launcher-store.json');

    // Migración transparente si existía data en appData/.cobblemon-realms-launcher
    const legacyFile = path.join(app.getPath('appData'), APP_CONFIG.PATHS.FOLDER_NAME, 'launcher-store.json');
    if (!fs.existsSync(this.dataFilePath) && fs.existsSync(legacyFile)) {
      try {
        fs.copyFileSync(legacyFile, this.dataFilePath);
      } catch {}
    }

    this.data = this.loadData();
  }

  private loadData(): LauncherData {
    const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));
    const safeRamMaxMb = calculateSafeRamSuggestion(totalMemMb, APP_CONFIG.MINECRAFT.RECOMMENDED_RAM_MB);

    const defaultInitialSettings: LauncherSettings = {
      ...APP_CONFIG.DEFAULT_SETTINGS,
      ramMaxMb: safeRamMaxMb
    };

    try {
      if (fs.existsSync(this.dataFilePath)) {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          accounts: parsed.accounts || APP_CONFIG.MOCK_DATA.defaultAccounts,
          activeAccountId: parsed.activeAccountId || (parsed.accounts?.[0]?.id ?? 'offline-trainer-1'),
          settings: { ...defaultInitialSettings, ...(parsed.settings || {}) }
        };
      }
    } catch (err) {
      console.error('Error cargando launcher-store.json:', err);
    }

    return {
      accounts: APP_CONFIG.MOCK_DATA.defaultAccounts,
      activeAccountId: 'offline-trainer-1',
      settings: defaultInitialSettings
    };
  }

  private saveData(): void {
    try {
      fs.writeFileSync(this.dataFilePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error guardando launcher-store.json:', err);
    }
  }

  // Cuentas
  public getAccounts(): Account[] {
    return this.data.accounts;
  }

  public getActiveAccountId(): string | null {
    return this.data.activeAccountId;
  }

  public setActiveAccount(id: string): boolean {
    const exists = this.data.accounts.some((a) => a.id === id);
    if (exists) {
      this.data.activeAccountId = id;
      this.saveData();
      return true;
    }
    return false;
  }

  public saveAccount(account: Account): Account {
    const idx = this.data.accounts.findIndex((a) => a.id === account.id);
    if (idx >= 0) {
      this.data.accounts[idx] = account;
    } else {
      this.data.accounts.push(account);
    }
    if (!this.data.activeAccountId) {
      this.data.activeAccountId = account.id;
    }
    this.saveData();
    return account;
  }

  public deleteAccount(id: string): boolean {
    this.data.accounts = this.data.accounts.filter((a) => a.id !== id);
    if (this.data.activeAccountId === id) {
      this.data.activeAccountId = this.data.accounts.length > 0 ? this.data.accounts[0].id : null;
    }
    this.saveData();
    return true;
  }

  // Configuración
  public getSettings(): LauncherSettings {
    return this.data.settings;
  }

  public saveSettings(newSettings: Partial<LauncherSettings>): LauncherSettings {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.saveData();
    return this.data.settings;
  }
}
