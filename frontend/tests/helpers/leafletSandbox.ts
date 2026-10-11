import vm from 'vm';

/**
 * Executes the inline <script> of a generated Leaflet map page inside a Node VM
 * with a recording fake `L`, so tests can assert on what the page actually draws
 * and posts back — not just on substrings of the HTML.
 */

export interface FakeLayer {
  kind: string;
  args: any[];
  latlng: any;
  radius?: number;
  popup?: string;
  tooltip?: string;
  handlers: Record<string, Array<(e: any) => void>>;
  fire: (event: string, e?: any) => void;
  setLatLng: (ll: any) => FakeLayer;
}

export interface Sandbox {
  layers: FakeLayer[];
  removed: FakeLayer[];
  messages: any[];
  map: {
    handlers: Record<string, Array<(e: any) => void>>;
    view: { center: any; zoom: number } | null;
    fitted: any[] | null;
    click: (lat: number, lng: number) => void;
  };
  window: Record<string, any>;
  ofKind: (kind: string) => FakeLayer[];
}

function toLatLng(ll: any) {
  if (Array.isArray(ll)) return { lat: ll[0], lng: ll[1] };
  return ll;
}

export function inlineScripts(html: string): string[] {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

/** Runs the `onclick="..."` attribute of the first button in a popup, as the WebView would on tap. */
export function clickPopupButton(popupHtml: string): any[] {
  const m = popupHtml.match(/onclick="([^"]*)"/);
  if (!m) throw new Error('popup has no onclick button');
  const messages: any[] = [];
  const window = { ReactNativeWebView: { postMessage: (s: string) => messages.push(JSON.parse(s)) } };
  vm.runInNewContext(m[1], { window, JSON });
  return messages;
}

export function runMapHtml(html: string): Sandbox {
  const layers: FakeLayer[] = [];
  const removed: FakeLayer[] = [];
  const messages: any[] = [];

  const map: Sandbox['map'] & Record<string, any> = {
    handlers: {},
    view: null,
    fitted: null,
    click(lat, lng) {
      (map.handlers.click || []).forEach((fn) => fn({ latlng: { lat, lng } }));
    },
    on(ev: string, fn: (e: any) => void) {
      (map.handlers[ev] ||= []).push(fn);
      return map;
    },
    setView(center: any, zoom: number) {
      map.view = { center, zoom };
      return map;
    },
    fitBounds(bounds: any[]) {
      map.fitted = bounds;
      return map;
    },
    removeLayer(layer: FakeLayer) {
      const i = layers.indexOf(layer);
      if (i >= 0) layers.splice(i, 1);
      removed.push(layer);
      return map;
    },
    addLayer(layer: FakeLayer) {
      layers.push(layer);
      return map;
    },
    invalidateSize() {
      return map;
    },
    getZoom() {
      return map.view?.zoom ?? 8;
    },
  };

  function makeLayer(kind: string, args: any[]): FakeLayer {
    const layer: any = {
      kind,
      args,
      latlng: args[0],
      radius: args[1]?.radius,
      handlers: {},
      fire(event: string, e: any = {}) {
        (layer.handlers[event] || []).forEach((fn: any) => fn({ target: layer, ...e }));
      },
      addTo(target: any) {
        if (target === map) layers.push(layer);
        return layer;
      },
      on(ev: string, fn: any) {
        (layer.handlers[ev] ||= []).push(fn);
        return layer;
      },
      bindPopup(html: string) {
        layer.popup = html;
        return layer;
      },
      bindTooltip(html: string) {
        layer.tooltip = html;
        return layer;
      },
      getLatLng() {
        return toLatLng(layer.latlng);
      },
      setLatLng(ll: any) {
        layer.latlng = ll;
        return layer;
      },
      setRadius(r: number) {
        layer.radius = r;
        return layer;
      },
      setLatLngs(ll: any) {
        layer.latlng = ll;
        return layer;
      },
      setStyle() {
        return layer;
      },
      setIcon() {
        return layer;
      },
      openPopup() {
        return layer;
      },
      remove() {
        map.removeLayer(layer);
        return layer;
      },
    };
    return layer;
  }

  const factory = (kind: string) => (...args: any[]) => makeLayer(kind, args);
  const L: any = {
    map: () => map,
    tileLayer: factory('tileLayer'),
    marker: factory('marker'),
    circle: factory('circle'),
    circleMarker: factory('circleMarker'),
    polygon: factory('polygon'),
    polyline: factory('polyline'),
    divIcon: (opts: any) => ({ __icon: 'div', ...opts }),
    icon: (opts: any) => ({ __icon: 'img', ...opts }),
    latLng: (lat: number, lng: number) => ({ lat, lng }),
    latLngBounds: (pts: any) => ({ pts }),
    control: Object.assign(() => makeLayer('control', []), { zoom: factory('control.zoom'), scale: factory('control.scale') }),
  };

  const win: Record<string, any> = {
    ReactNativeWebView: { postMessage: (m: string) => messages.push(JSON.parse(m)) },
  };
  const context: Record<string, any> = {
    L,
    window: win,
    document: { getElementById: () => ({}), addEventListener: () => undefined },
    console: { log: () => undefined, warn: () => undefined, error: () => undefined },
    JSON,
    Math,
    Object,
    setTimeout: (fn: () => void) => fn(),
  };
  // Inline handlers reference `window.*`, page code also uses bare globals.
  vm.createContext(context);
  for (const script of inlineScripts(html)) {
    vm.runInContext(script, context);
  }

  return {
    layers,
    removed,
    messages,
    map,
    window: win,
    ofKind: (kind: string) => layers.filter((l) => l.kind === kind),
  };
}
