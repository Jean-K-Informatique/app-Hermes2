import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  notificationsEnabled: boolean;
  theme: 'dark' | 'light';

  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setTheme: (theme: 'dark' | 'light') => Promise<void>;
  loadSettings: () => Promise<void>;
}

const SETTINGS_KEY = 'hermes_settings';

export const useSettingsStore = create<SettingsState>((set) => ({
  notificationsEnabled: true,
  theme: 'dark',

  setNotificationsEnabled: async (enabled) => {
    set({ notificationsEnabled: enabled });
    await persistSettings({ notificationsEnabled: enabled });
  },

  setTheme: async (theme) => {
    set({ theme });
    await persistSettings({ theme });
  },

  loadSettings: async () => {
    try {
      const json = await AsyncStorage.getItem(SETTINGS_KEY);
      if (json) {
        const settings = JSON.parse(json);
        set({
          notificationsEnabled: settings.notificationsEnabled ?? true,
          theme: settings.theme ?? 'dark',
        });
      }
    } catch {
      // Use defaults
    }
  },
}));

async function persistSettings(partial: Record<string, unknown>): Promise<void> {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    const current = json ? JSON.parse(json) : {};
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...partial }));
  } catch {
    // Silently fail
  }
}
