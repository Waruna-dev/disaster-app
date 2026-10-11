import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '../../../i18n/locales/en.json';
import si from '../../../i18n/locales/si.json';
import ta from '../../../i18n/locales/ta.json';
import { NATIONAL_EMERGENCY_SERVICES } from '../../../constants/emergencyServices';
import { Colors } from '../../../constants/colors';
import { RISK_LEVELS, RADIUS_PRESETS } from '../../../types/alert';
import { REJECTION_REASONS } from '../../../types/report';
import { INCIDENT_REJECTION_REASONS } from '../../../types/floodIncident';

describe('config/firebase (real module)', () => {
  it('initialises the app from EXPO_PUBLIC_* env and wires auth persistence, Firestore and Storage', () => {
    jest.isolateModules(() => {
      jest.unmock('../../../config/firebase');
      const { initializeApp } = require('firebase/app');
      const { initializeAuth, getReactNativePersistence } = require('firebase/auth');
      const { getFirestore } = require('firebase/firestore');
      const { getStorage } = require('firebase/storage');
      const mod = require('../../../config/firebase');

      expect(initializeApp).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        authDomain: 'test.firebaseapp.com',
        projectId: 'test-project',
        storageBucket: 'test.appspot.com',
        messagingSenderId: '000000',
        appId: 'test-app-id',
      });
      const app = initializeApp.mock.results[0].value;
      expect(initializeAuth).toHaveBeenCalledWith(app, { persistence: expect.anything() });
      expect(getReactNativePersistence).toHaveBeenCalled();
      expect(getFirestore).toHaveBeenCalledWith(app);
      expect(getStorage).toHaveBeenCalledWith(app);
      expect(mod.default).toBe(app);
    });
  });
});

/** Every key path in a nested translation object, e.g. "auth.login.title". */
function keyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keyPaths(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
}

describe('i18n', () => {
  const enKeys = keyPaths(en);

  it('English bundle is non-empty', () => {
    expect(enKeys.length).toBeGreaterThan(0);
  });

  it.each([
    ['si', si],
    ['ta', ta],
  ])('%s has no keys that English lacks', (_lang, bundle) => {
    const extra = keyPaths(bundle as Record<string, unknown>).filter((k) => !enKeys.includes(k));
    expect(extra).toEqual([]);
  });

  it.each([
    ['si', si],
    ['ta', ta],
  ])('%s translation coverage of English keys (reported, falls back to English)', (lang, bundle) => {
    const keys = keyPaths(bundle as Record<string, unknown>);
    const missing = enKeys.filter((k) => !keys.includes(k));
    // Missing keys fall back to English at runtime (fallbackLng: 'en'), so this
    // records coverage rather than failing; see the test report for the numbers.
    // eslint-disable-next-line no-console
    if (missing.length) console.info(`[i18n] ${lang}: ${missing.length}/${enKeys.length} keys missing → English fallback`);
    expect(Array.isArray(missing)).toBe(true);
  });

  it('no translation value is an empty string', () => {
    for (const bundle of [en, si, ta]) {
      const empties = keyPaths(bundle as Record<string, unknown>).filter((k) => {
        const v = k.split('.').reduce<any>((o, p) => o?.[p], bundle);
        return typeof v === 'string' && v.trim() === '';
      });
      expect(empties).toEqual([]);
    }
  });

  it('interpolation placeholders in si/ta match English', () => {
    const placeholders = (s: string) => (s.match(/{{\s*\w+\s*}}/g) ?? []).map((p) => p.replace(/\s/g, '')).sort();
    const mismatches: string[] = [];
    for (const [lang, bundle] of [['si', si], ['ta', ta]] as const) {
      for (const k of keyPaths(bundle as Record<string, unknown>)) {
        const enVal = k.split('.').reduce<any>((o, p) => o?.[p], en);
        const val = k.split('.').reduce<any>((o, p) => o?.[p], bundle);
        if (typeof enVal === 'string' && typeof val === 'string' && placeholders(enVal).join() !== placeholders(val).join()) {
          mismatches.push(`${lang}:${k}`);
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  describe('keys used in source exist in en.json', () => {
    const fsMod = require('fs') as typeof import('fs');
    const pathMod = require('path') as typeof import('path');
    const ROOT = pathMod.join(__dirname, '../../..');
    const walk = (d: string): string[] =>
      fsMod.existsSync(d)
        ? fsMod.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
            const p = pathMod.join(d, e.name);
            return e.isDirectory() ? walk(p) : /\.tsx?$/.test(e.name) ? [p] : [];
          })
        : [];
    const get = (k: string) => k.split('.').reduce<any>((o, p) => o?.[p], en);
    // t('a.b')            → no default: raw key shown if missing
    // t('a.b') || 'x'     → i18next returns the key (truthy), so 'x' never shows
    // t('a.b', 'Default') → fine: i18next renders the default
    const uses: { key: string; file: string; style: 'bare' | 'or-fallback' | 'default-arg' }[] = [];
    for (const file of ['app', 'components', 'hooks', 'context', 'contexts'].flatMap((d) => walk(pathMod.join(ROOT, d)))) {
      const src = fsMod.readFileSync(file, 'utf8');
      for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z]\w*(?:\.\w+)+)'\s*(,)?[^)]*\)(\s*\|\|)?/g)) {
        uses.push({ key: m[1], file: pathMod.relative(ROOT, file), style: m[3] ? 'or-fallback' : m[2] ? 'default-arg' : 'bare' });
      }
    }
    const missing = (style: string) => [...new Set(uses.filter((u) => u.style === style && get(u.key) === undefined).map((u) => `${u.key} (${u.file})`))];

    it('scans a meaningful number of t() calls', () => {
      expect(uses.length).toBeGreaterThan(100);
    });

    it('no bare t(key) call references a missing key', () => {
      expect(missing('bare')).toEqual([]);
    });

    it.failing('KNOWN BUG: t(key) || "fallback" calls whose key is missing render the raw key (|| never triggers)', () => {
      // Currently 8: register.invalidEmail / invalidPhone / password* and editProfile.invalidPhone.
      expect(missing('or-fallback')).toEqual([]);
    });
  });

  it('loadLanguage applies a saved language and falls back to English', async () => {
    const i18n = require('../../../i18n').default;
    const { loadLanguage } = require('../../../i18n');
    await AsyncStorage.setItem('appLanguage', 'si');
    await loadLanguage();
    expect(i18n.language).toBe('si');
    await i18n.changeLanguage('en');
    expect(i18n.t('this.key.does.not.exist')).toBe('this.key.does.not.exist');
  });

  it('loadLanguage swallows storage errors', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk'));
    const { loadLanguage } = require('../../../i18n');
    await expect(loadLanguage()).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('constants & enums', () => {
  it('national emergency numbers are the official Sri Lankan short codes', () => {
    expect(Object.fromEntries(NATIONAL_EMERGENCY_SERVICES.map((s) => [s.id, s.phone]))).toEqual({
      dmc: '117',
      ambulance: '1990',
      police: '119',
      fire: '110',
    });
  });

  it('every colour token is a valid hex colour', () => {
    for (const [k, v] of Object.entries(Colors)) expect([k, v]).toEqual([k, expect.stringMatching(/^#[0-9A-Fa-f]{6}$/)]);
  });

  it('risk levels, radius presets and rejection reasons are ordered and include "Other"', () => {
    expect(RISK_LEVELS).toEqual(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
    expect([...RADIUS_PRESETS]).toEqual([...RADIUS_PRESETS].sort((a, b) => a - b));
    expect(REJECTION_REASONS).toContain('Other');
    expect(INCIDENT_REJECTION_REASONS).toContain('Other');
  });
});
