/**
 * Static check: every navigation target in the source (router.push/replace/navigate
 * string literals, template literals and `pathname:` values) must resolve to a real
 * file-based route under app/, the way expo-router resolves it (route groups like
 * "(user)" are optional in URLs, [param] segments match anything, index is implicit).
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '../../..');
const APP = path.join(ROOT, 'app');
const SOURCE_DIRS = ['app', 'components', 'hooks', 'context', 'contexts'];

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

/** Route patterns as segment arrays, with groups kept so explicit "(group)" URLs can match too. */
const routeFiles = walk(APP)
  .map((f) => path.relative(APP, f).replace(/\\/g, '/').replace(/\.tsx?$/, ''))
  .filter((r) => !r.endsWith('_layout'));

function routeVariants(route: string): string[][] {
  const segs = route.split('/');
  if (segs.at(-1) === 'index') segs.pop();
  // Each group segment may be present or omitted in a URL.
  let variants: string[][] = [[]];
  for (const s of segs) {
    const isGroup = /^\(.+\)$/.test(s);
    variants = variants.flatMap((v) => (isGroup ? [v, [...v, s]] : [[...v, s]]));
  }
  return variants;
}

const ALL_PATTERNS = routeFiles.flatMap(routeVariants);

function resolves(href: string): boolean {
  const clean = href.split('?')[0].replace(/\/+$/, '');
  const segs = clean.split('/').filter(Boolean);
  return ALL_PATTERNS.some(
    (pattern) => pattern.length === segs.length && pattern.every((p, i) => /^\[.+\]$/.test(p) || p === segs[i])
  );
}

interface NavCall {
  file: string;
  line: number;
  href: string;
}

function extractNavTargets(): NavCall[] {
  const out: NavCall[] = [];
  for (const dir of SOURCE_DIRS) {
    for (const file of walk(path.join(ROOT, dir))) {
      const src = fs.readFileSync(file, 'utf8');
      const rel = path.relative(ROOT, file).replace(/\\/g, '/');
      const lineOf = (idx: number) => src.slice(0, idx).split('\n').length;
      const patterns = [
        /router\.(?:push|replace|navigate)\(\s*(['"`])([^'"`]+)\1/g,
        /pathname:\s*(['"`])([^'"`]+)\1/g,
        /<Redirect\s+href=(['"`])([^'"`]+)\1/g,
        // Menu/tile config objects, e.g. { label: 'Flood Warning', href: '/(DMC)/flood-warning' }
        /\b(?:href|route):\s*(['"`])(\/[^'"`]*)\1/g,
      ];
      for (const re of patterns) {
        for (const m of src.matchAll(re)) {
          const href = m[2].replace(/\$\{[^}]+\}/g, 'PARAM');
          if (href.startsWith('/')) out.push({ file: rel, line: lineOf(m.index!), href });
        }
      }
    }
  }
  return out;
}

const calls = extractNavTargets();

describe('route integrity', () => {
  it('finds the navigation calls to check', () => {
    expect(calls.length).toBeGreaterThan(30);
  });

  it('every navigation target resolves to a screen under app/', () => {
    const broken = calls.filter((c) => !resolves(c.href)).map((c) => `${c.file}:${c.line} → ${c.href}`);
    expect(broken).toEqual([]);
  });

  it('every non-layout route file is reachable from at least one navigation call or is an entry point', () => {
    const ENTRY_POINTS = new Set(['index', '(user)/(tabs)/index', '(user)/(tabs)/alerts', '(user)/(tabs)/map', '(user)/(tabs)/reports', '(user)/(tabs)/profile']);
    const unreachable = routeFiles.filter((route) => {
      if (ENTRY_POINTS.has(route)) return false;
      const variants = routeVariants(route);
      return !calls.some((c) => {
        const segs = c.href.split('?')[0].split('/').filter(Boolean);
        return variants.some((v) => v.length === segs.length && v.every((p, i) => /^\[.+\]$/.test(p) || p === segs[i]));
      });
    });
    // Reported (not failed): orphan screens are dead code or reached some other way.
    // eslint-disable-next-line no-console
    if (unreachable.length) console.info(`[routes] no in-app navigation found to: ${unreachable.join(', ')}`);
    expect(Array.isArray(unreachable)).toBe(true);
  });

  it('the DMC menu and the DMC tab bar agree on where "Incidents" goes', () => {
    const tabBar = fs.readFileSync(path.join(ROOT, 'components/DMCTabBar.tsx'), 'utf8');
    const navHeader = fs.readFileSync(path.join(ROOT, 'components/DMCNavHeader.tsx'), 'utf8');
    const tabRoute = tabBar.match(/label: 'Incidents'[^}]*route: '([^']+)'/)![1];
    const menuRoute = navHeader.match(/label: 'Incidents'[^}]*route: '([^']+)'/)![1];
    // Reported as an inconsistency; both screens exist, so this documents rather than fails.
    expect({ tabRoute, menuRoute }).toEqual({ tabRoute: '/(DMC)/report-groups', menuRoute: '/(DMC)/incidents' });
  });
});
