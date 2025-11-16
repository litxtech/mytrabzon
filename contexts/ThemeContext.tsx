import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

export type ThemeColors = {
  background: string;
  card: string;
  surface: string;
  text: string;
  textLight: string;
  primary: string;
  secondary: string;
  error: string;
  warning: string;
  success: string;
  border: string;
};

export type AppTheme = {
  mode: Exclude<ThemeMode, 'system'>;
  colors: ThemeColors;
};

const LightColors: ThemeColors = {
  background: '#F8F9FA',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  text: '#1C2340',
  textLight: '#8A94A6',
  primary: '#FF3B30', // MyTrabzon ana rengi
  secondary: '#0F172A',
  error: '#E53935',
  warning: '#F59E0B',
  success: '#22C55E',
  border: '#E1E8ED',
};

const DarkColors: ThemeColors = {
  background: '#0B0F14',
  card: '#111827',
  surface: '#0F172A',
  text: '#F3F4F6',
  textLight: '#A1A1AA',
  primary: '#FF453A',
  secondary: '#93C5FD',
  error: '#F87171',
  warning: '#FBBF24',
  success: '#10B981',
  border: '#1F2937',
};

type ThemeContextValue = {
  theme: AppTheme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = '@mytrabzon.theme_mode';

function resolveSystemMode(): 'light' | 'dark' {
  const scheme = Appearance.getColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('system');

  // load saved mode
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
      }
    });
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(() => {
      if (mode === 'system') {
        // force rerender
        setModeState('system');
      }
    });
    return () => sub.remove();
  }, [mode]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  }, []);

  const effective: 'light' | 'dark' = useMemo(() => {
    return mode === 'system' ? resolveSystemMode() : mode;
  }, [mode]);

  const theme = useMemo<AppTheme>(() => {
    return {
      mode: effective,
      colors: effective === 'dark' ? DarkColors : LightColors,
    };
  }, [effective]);

  const toggle = useCallback(() => {
    const next = theme.mode === 'dark' ? 'light' : 'dark';
    setMode(next);
  }, [theme.mode, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, mode, setMode, toggle }),
    [theme, mode, setMode, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};


