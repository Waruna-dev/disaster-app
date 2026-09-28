import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Rect, Text as SvgText, G } from 'react-native-svg';
import { Colors } from '../constants/colors';

export interface ChartDatum {
  label: string;
  value: number;
  color?: string;
}

export const CHART_PALETTE = ['#0B7A66', '#1D6FC4', '#F9A825', '#D32F2F', '#7B3FA0', '#5D8A82', '#E67E22'];
const colorFor = (d: ChartDatum, i: number) => d.color || CHART_PALETTE[i % CHART_PALETTE.length];

export function PieChart({ data, size = 150 }: { data: ChartDatum[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = size / 2 - 4;
  const c = size / 2;

  let angle = -Math.PI / 2;
  const slices = total === 0 ? [] : data.filter((d) => d.value > 0).map((d, i) => {
    const frac = d.value / total;
    const start = angle;
    const end = angle + frac * Math.PI * 2;
    angle = end;
    const large = frac > 0.5 ? 1 : 0;
    const x1 = c + r * Math.cos(start), y1 = c + r * Math.sin(start);
    const x2 = c + r * Math.cos(end), y2 = c + r * Math.sin(end);
    const path = frac >= 0.999
      ? null
      : `M ${c} ${c} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return { d, path, full: frac >= 0.999, i };
  });

  return (
    <View style={styles.pieRow}>
      <Svg width={size} height={size}>
        {total === 0 ? (
          <Circle cx={c} cy={c} r={r} fill="#EEF3F1" />
        ) : (
          slices.map((s) =>
            s.full ? (
              <Circle key={s.d.label} cx={c} cy={c} r={r} fill={colorFor(s.d, s.i)} />
            ) : (
              <Path key={s.d.label} d={s.path as string} fill={colorFor(s.d, s.i)} />
            )
          )
        )}
        <Circle cx={c} cy={c} r={r * 0.55} fill={Colors.white} />
        <SvgText x={c} y={c + 5} fontSize="16" fontWeight="bold" fill={Colors.textDark} textAnchor="middle">
          {total}
        </SvgText>
      </Svg>
      <View style={styles.legend}>
        {data.map((d, i) => (
          <View key={d.label} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: colorFor(d, i) }]} />
            <Text style={styles.legendText}>{d.label}</Text>
            <Text style={styles.legendValue}>{d.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ColumnChart({ data, height = 150, width = 300 }: { data: ChartDatum[]; height?: number; width?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const padBottom = 28, padTop = 16;
  const chartH = height - padBottom - padTop;
  const slot = width / Math.max(1, data.length);
  const barW = Math.min(34, slot * 0.6);

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={0} y={padTop + chartH} width={width} height={1} fill="#DDE6E3" />
      {data.map((d, i) => {
        const h = (d.value / max) * chartH;
        const x = i * slot + (slot - barW) / 2;
        const y = padTop + chartH - h;
        return (
          <G key={d.label}>
            <Rect x={x} y={y} width={barW} height={h} rx={4} fill={colorFor(d, i)} />
            <SvgText x={x + barW / 2} y={y - 4} fontSize="10" fontWeight="bold" fill={Colors.textDark} textAnchor="middle">{d.value}</SvgText>
            <SvgText x={x + barW / 2} y={height - 10} fontSize="9" fill={Colors.textMuted} textAnchor="middle">
              {d.label.length > 9 ? d.label.slice(0, 8) + '…' : d.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

export function HBarChart({ data }: { data: ChartDatum[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View>
      {data.map((d, i) => (
        <View key={d.label} style={styles.hRow}>
          <Text style={styles.hLabel} numberOfLines={1}>{d.label}</Text>
          <View style={styles.hTrack}>
            <View style={[styles.hFill, { width: `${(d.value / max) * 100}%`, backgroundColor: colorFor(d, i) }]} />
          </View>
          <Text style={styles.hValue}>{d.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pieRow: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  legend: { flex: 1, minWidth: 120 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { flex: 1, fontSize: 12, color: Colors.textMedium },
  legendValue: { fontSize: 12, fontWeight: '700', color: Colors.textDark },
  hRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  hLabel: { width: 90, fontSize: 11, color: Colors.textMedium },
  hTrack: { flex: 1, height: 10, backgroundColor: '#EEF3F1', borderRadius: 5, overflow: 'hidden' },
  hFill: { height: 10, borderRadius: 5 },
  hValue: { width: 34, fontSize: 11, fontWeight: '700', color: Colors.textDark, textAlign: 'right' },
});
