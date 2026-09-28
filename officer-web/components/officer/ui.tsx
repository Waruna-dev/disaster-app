import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator,
  Modal, Pressable, useWindowDimensions, TextInputProps, ViewStyle, StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { O, Tone, toneColors, toneFor } from './theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/* ───────────── responsive helper ───────────── */
export function useBreakpoint() {
  const { width } = useWindowDimensions();
  return { width, isMobile: width < 760, isTablet: width < 1100, isDesktop: width >= 1100 };
}

/* ───────────── toast + confirm (Alert.alert does not work on web) ───────────── */
type ToastKind = 'success' | 'error' | 'info';
interface ConfirmOpts { title: string; message?: string; confirmLabel?: string; danger?: boolean }
interface UICtx {
  toast: (message: string, kind?: ToastKind) => void;
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
}
const UIContext = createContext<UICtx>({ toast: () => {}, confirm: async () => false });
export const useUI = () => useContext(UIContext);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [toastState, setToast] = useState<{ message: string; kind: ToastKind } | null>(null);
  const [confirmState, setConfirm] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const timer = useRef<any>(null);

  const toast = useCallback((message: string, kind: ToastKind = 'success') => {
    setToast({ message, kind });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const confirm = useCallback(
    (opts: ConfirmOpts) => new Promise<boolean>((resolve) => setConfirm({ ...opts, resolve })),
    []
  );
  const close = (v: boolean) => { confirmState?.resolve(v); setConfirm(null); };
  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);
  const tone = toastState?.kind === 'error' ? O.danger : toastState?.kind === 'info' ? O.info : O.success;

  return (
    <UIContext.Provider value={value}>
      {children}
      {toastState && (
        <View style={[s.toast, { backgroundColor: tone }]} pointerEvents="none">
          <Ionicons name={toastState.kind === 'error' ? 'alert-circle' : 'checkmark-circle'} size={18} color="#fff" />
          <Text style={s.toastText}>{toastState.message}</Text>
        </View>
      )}
      <Modal visible={!!confirmState} transparent animationType="fade" onRequestClose={() => close(false)}>
        <Pressable style={s.overlayCenter} onPress={() => close(false)}>
          <Pressable style={s.dialog} onPress={() => {}}>
            <Text style={s.dialogTitle}>{confirmState?.title}</Text>
            {confirmState?.message ? <Text style={s.dialogMsg}>{confirmState.message}</Text> : null}
            <View style={s.dialogActions}>
              <Btn label="Cancel" variant="secondary" onPress={() => close(false)} />
              <Btn label={confirmState?.confirmLabel || 'Confirm'} variant={confirmState?.danger ? 'danger' : 'primary'} onPress={() => close(true)} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </UIContext.Provider>
  );
}

/* ───────────── layout primitives ───────────── */
export function Card({ title, subtitle, action, children, style, padded = true }: {
  title?: string; subtitle?: string; action?: React.ReactNode; children?: React.ReactNode;
  style?: StyleProp<ViewStyle>; padded?: boolean;
}) {
  return (
    <View style={[s.card, style]}>
      {(title || action) && (
        <View style={s.cardHead}>
          <View style={{ flex: 1 }}>
            {title ? <Text style={s.cardTitle}>{title}</Text> : null}
            {subtitle ? <Text style={s.cardSub}>{subtitle}</Text> : null}
          </View>
          {action}
        </View>
      )}
      <View style={padded ? s.cardBody : undefined}>{children}</View>
    </View>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  const { isMobile } = useBreakpoint();
  return (
    <View style={[s.pageHeader, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
      <View style={{ flex: 1 }}>
        <Text style={s.pageTitle}>{title}</Text>
        {subtitle ? <Text style={s.pageSub}>{subtitle}</Text> : null}
      </View>
      {actions ? <View style={s.pageActions}>{actions}</View> : null}
    </View>
  );
}

const StackCtx = createContext(false);
/** Responsive row: children sit side-by-side on desktop and stack on small screens. */
export function Row({ children, gap = 16, breakAt = 'tablet', style }: {
  children: React.ReactNode; gap?: number; breakAt?: 'mobile' | 'tablet'; style?: StyleProp<ViewStyle>;
}) {
  const { isMobile, isTablet } = useBreakpoint();
  const stack = breakAt === 'mobile' ? isMobile : isTablet;
  return (
    <StackCtx.Provider value={stack}>
      <View style={[{ flexDirection: stack ? 'column' : 'row', gap, alignItems: stack ? 'stretch' : 'flex-start' }, style]}>{children}</View>
    </StackCtx.Provider>
  );
}
export function Col({ flex = 1, children, style }: { flex?: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const stack = useContext(StackCtx);
  return <View style={[stack ? { width: '100%' } : { flex, minWidth: 0 }, style]}>{children}</View>;
}

/* ───────────── buttons / badges ───────────── */
export function Btn({ label, icon, onPress, variant = 'primary', disabled, loading, small, accessibilityLabel, style }: {
  label: string; icon?: IconName; onPress?: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  disabled?: boolean; loading?: boolean; small?: boolean; accessibilityLabel?: string; style?: StyleProp<ViewStyle>;
}) {
  const v = {
    primary: { bg: O.primary, fg: '#fff', bd: O.primary },
    success: { bg: O.success, fg: '#fff', bd: O.success },
    danger: { bg: O.dangerBg, fg: O.danger, bd: '#F3C7C7' },
    secondary: { bg: '#fff', fg: O.textMid, bd: O.border },
    ghost: { bg: 'transparent', fg: O.primary, bd: 'transparent' },
  }[variant];
  const off = disabled || loading;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={off}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel || label}
      style={[s.btn, small && s.btnSmall, !label && s.btnIconOnly, { backgroundColor: v.bg, borderColor: v.bd, opacity: off ? 0.55 : 1 }, style]}
    >
      {loading ? <ActivityIndicator size="small" color={v.fg} /> : icon ? <Ionicons name={icon} size={small ? 14 : 16} color={v.fg} /> : null}
      <Text style={[s.btnText, small && { fontSize: 12 }, { color: v.fg }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Badge({ text, tone }: { text: string; tone?: Tone }) {
  const c = toneColors[tone ?? toneFor(text)];
  return (
    <View style={[s.badge, { backgroundColor: c.bg }]}>
      <Text style={[s.badgeText, { color: c.fg }]}>{text}</Text>
    </View>
  );
}

export function StatCard({ icon, label, value, tone = 'primary', hint, onPress }: {
  icon: IconName; label: string; value: string | number; tone?: Tone; hint?: string; onPress?: () => void;
}) {
  const c = toneColors[tone];
  const Wrapper: any = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={s.stat} onPress={onPress} activeOpacity={0.8}>
      <View style={[s.statIcon, { backgroundColor: c.bg }]}>
        <Ionicons name={icon} size={24} color={c.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.statLabel}>{label}</Text>
        <Text style={s.statValue}>{value}</Text>
        {hint ? <Text style={s.statHint}>{hint}</Text> : null}
      </View>
    </Wrapper>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  const { isMobile, isTablet } = useBreakpoint();
  const cols = isMobile ? 1 : isTablet ? 2 : 4;
  const items = React.Children.toArray(children);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8, marginBottom: 8 }}>
      {items.map((c, i) => (
        <View key={i} style={{ width: `${100 / cols}%`, padding: 8 }}>{c}</View>
      ))}
    </View>
  );
}

/* ───────────── table ───────────── */
export interface Column<T> {
  key: string; title: string; flex?: number; width?: number;
  render?: (row: T) => React.ReactNode; align?: 'left' | 'center' | 'right';
}
export function Table<T extends { id?: string }>({ columns, rows, onRowPress, selectedId, empty = 'No records found', minWidth = 560 }: {
  columns: Column<T>[]; rows: T[]; onRowPress?: (row: T) => void; selectedId?: string | null; empty?: string; minWidth?: number;
}) {
  const cellStyle = (c: Column<T>): ViewStyle => (c.width ? { width: c.width } : { flex: c.flex ?? 1 });
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ minWidth: '100%' }}>
      <View style={{ minWidth, flex: 1 }}>
        <View style={s.thead}>
          {columns.map((c) => (
            <Text key={c.key} style={[s.th, cellStyle(c) as any, { textAlign: c.align ?? 'left' }]}>{c.title}</Text>
          ))}
        </View>
        {rows.length === 0 ? (
          <Text style={s.tableEmpty}>{empty}</Text>
        ) : (
          rows.map((row, i) => {
            const active = selectedId && row.id === selectedId;
            return (
              <TouchableOpacity
                key={row.id ?? i}
                activeOpacity={onRowPress ? 0.7 : 1}
                onPress={onRowPress ? () => onRowPress(row) : undefined}
                style={[s.tr, active && s.trActive]}
              >
                {columns.map((c) => (
                  <View key={c.key} style={[s.td, cellStyle(c), { alignItems: c.align === 'center' ? 'center' : c.align === 'right' ? 'flex-end' : 'flex-start' }]}>
                    {c.render ? c.render(row) : <Text style={s.tdText} numberOfLines={2}>{String((row as any)[c.key] ?? '—')}</Text>}
                  </View>
                ))}
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

/* ───────────── form controls ───────────── */
export function Field({ label, required, hint, children, style }: {
  label?: string; required?: boolean; hint?: string; children: React.ReactNode; style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ marginBottom: 16 }, style]}>
      {label ? (
        <Text style={s.label}>{label}{required ? <Text style={{ color: O.danger }}> *</Text> : null}</Text>
      ) : null}
      {children}
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Input(props: TextInputProps & { icon?: IconName }) {
  const { icon, style, ...rest } = props;
  return (
    <View style={s.inputWrap}>
      {icon ? <Ionicons name={icon} size={16} color={O.textMuted} /> : null}
      <TextInput placeholderTextColor={O.textMuted} {...rest} style={[s.input, { outlineStyle: 'none' } as any, style]} />
    </View>
  );
}

export function TextArea(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={O.textMuted}
      multiline
      numberOfLines={4}
      {...props}
      style={[s.inputWrap, s.textarea, { outlineStyle: 'none' } as any, props.style]}
    />
  );
}

/** Native HTML <select> — this app's officer side only ever runs on web. */
type SelectOption = string | { value: string; label: string };

export function Select({ value, options, onChange, placeholder = 'Select…', disabled }: {
  value: string | null | undefined; options: readonly SelectOption[]; onChange: (v: string) => void; placeholder?: string; disabled?: boolean;
}) {
  return (
    <View style={[s.inputWrap, { paddingHorizontal: 0 }]}>
      {React.createElement(
        'select',
        {
          value: value ?? '',
          disabled,
          onChange: (e: any) => onChange(e.target.value),
          style: {
            width: '100%', height: 44, border: 'none', background: 'transparent', padding: '0 12px',
            fontSize: 14, color: value ? O.text : O.textMuted, outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
          },
        },
        React.createElement('option', { value: '', disabled: true }, placeholder),
        ...options.map((option) => {
          const item = typeof option === 'string' ? { value: option, label: option } : option;
          return React.createElement('option', { key: item.value, value: item.value }, item.label);
        })
      )}
    </View>
  );
}

export function Checkbox({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity style={[s.check, checked && s.checkOn]} onPress={onToggle} activeOpacity={0.8}>
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={17} color={checked ? O.primary : O.textMuted} />
      <Text style={[s.checkText, checked && { color: O.primary, fontWeight: '700' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Tabs({ tabs, value, onChange }: { tabs: { key: string; label: string; count?: number }[]; value: string; onChange: (k: string) => void }) {
  return (
    <View style={s.tabs}>
      {tabs.map((t) => (
        <TouchableOpacity key={t.key} style={[s.tab, value === t.key && s.tabOn]} onPress={() => onChange(t.key)}>
          <Text style={[s.tabText, value === t.key && s.tabTextOn]}>{t.label}</Text>
          {t.count ? (
            <View style={[s.tabCount, value === t.key && { backgroundColor: O.primary }]}>
              <Text style={[s.tabCountText, value === t.key && { color: '#fff' }]}>{t.count}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.kv}>
      <Text style={s.kvLabel}>{label}</Text>
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        {typeof children === 'string' || typeof children === 'number' ? <Text style={s.kvValue}>{children}</Text> : children}
      </View>
    </View>
  );
}

export function EmptyState({ icon = 'file-tray-outline', text }: { icon?: IconName; text: string }) {
  return (
    <View style={{ alignItems: 'center', padding: 28, gap: 8 }}>
      <Ionicons name={icon} size={34} color={O.textMuted} />
      <Text style={{ color: O.textMuted, fontSize: 13 }}>{text}</Text>
    </View>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <View style={{ alignItems: 'center', padding: 40, gap: 10 }}>
      <ActivityIndicator size="large" color={O.primary} />
      {label ? <Text style={{ color: O.textMuted, fontSize: 13 }}>{label}</Text> : null}
    </View>
  );
}

/** Centered dialog with a form body (used for add/edit forms). */
export function FormModal({ visible, title, onClose, children, width = 560 }: {
  visible: boolean; title: string; onClose: () => void; children: React.ReactNode; width?: number;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlayCenter} onPress={onClose}>
        <Pressable style={[s.dialog, { maxWidth: width, width: '100%', maxHeight: '90%' }]} onPress={() => {}}>
          <View style={s.modalHead}>
            <Text style={s.dialogTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={O.textMuted} /></TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export const fmtDate = (ts?: any) => {
  const d: Date | undefined = ts?.toDate?.();
  return d ? d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
};
export const fmtDateTime = (ts?: any) => {
  const d: Date | undefined = ts?.toDate?.();
  return d ? `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '—';
};

const s = StyleSheet.create({
  card: { backgroundColor: O.card, borderRadius: O.radius, borderWidth: 1, borderColor: O.border, marginBottom: 16, overflow: 'hidden' },
  cardHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4, gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: O.text },
  cardSub: { fontSize: 12, color: O.textMuted, marginTop: 2 },
  cardBody: { padding: 20 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 22, gap: 16 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: O.text },
  pageSub: { fontSize: 14, color: O.textMuted, marginTop: 4 },
  pageActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18, height: 42, borderRadius: 10, borderWidth: 1 },
  btnSmall: { height: 32, paddingHorizontal: 12, borderRadius: 8 },
  btnIconOnly: { width: 40, height: 40, paddingHorizontal: 0, borderRadius: 10 },
  btnText: { fontSize: 13, fontWeight: '700' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '800' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: O.card, borderRadius: O.radius, borderWidth: 1, borderColor: O.border, padding: 18 },
  statIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 12, color: O.textMuted, fontWeight: '600' },
  statValue: { fontSize: 26, fontWeight: '800', color: O.text, marginTop: 2 },
  statHint: { fontSize: 11, color: O.textMuted, marginTop: 2 },
  thead: { flexDirection: 'row', backgroundColor: '#F5F9F8', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 8 },
  th: { fontSize: 11, fontWeight: '800', color: O.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, paddingHorizontal: 8 },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#EEF3F1' },
  trActive: { backgroundColor: '#EAF6F2' },
  td: { paddingHorizontal: 8 },
  tdText: { fontSize: 13, color: O.text },
  tableEmpty: { textAlign: 'center', color: O.textMuted, paddingVertical: 28, fontSize: 13 },
  label: { fontSize: 13, fontWeight: '700', color: O.textMid, marginBottom: 7 },
  hint: { fontSize: 11, color: O.textMuted, marginTop: 5 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#CFDDD9', borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 12, minHeight: 44 },
  input: { flex: 1, fontSize: 14, color: O.text, paddingVertical: 10 },
  textarea: { minHeight: 96, paddingTop: 12, textAlignVertical: 'top', fontSize: 14, color: O.text },
  check: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: '#CFDDD9', backgroundColor: '#fff' },
  checkOn: { borderColor: O.primary, backgroundColor: '#EAF6F2' },
  checkText: { fontSize: 13, color: O.textMid },
  tabs: { flexDirection: 'row', gap: 4, backgroundColor: '#E8EFED', padding: 4, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 20, flexWrap: 'wrap' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 9 },
  tabOn: { backgroundColor: '#fff' },
  tabText: { fontSize: 13, fontWeight: '600', color: O.textMuted },
  tabTextOn: { color: O.primary, fontWeight: '800' },
  tabCount: { backgroundColor: '#D5E0DD', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  tabCountText: { fontSize: 10, fontWeight: '800', color: O.textMid },
  kv: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F0F5F3', gap: 12 },
  kvLabel: { width: 110, fontSize: 12, color: O.textMuted, fontWeight: '600' },
  kvValue: { fontSize: 13, color: O.text, fontWeight: '600' },
  overlayCenter: { flex: 1, backgroundColor: 'rgba(11,40,36,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420 },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  dialogTitle: { fontSize: 18, fontWeight: '800', color: O.text },
  dialogMsg: { fontSize: 14, color: O.textMid, marginTop: 8, lineHeight: 20 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 22 },
  toast: { position: 'absolute', top: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, zIndex: 9999, maxWidth: 380, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  toastText: { color: '#fff', fontWeight: '700', fontSize: 13, flexShrink: 1 },
});
