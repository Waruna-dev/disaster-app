import React, { useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path, Circle, Rect, Text as SvgText } from 'react-native-svg';

export interface FloodChartPoint {
  timestamp: number;
  waterLevel: number;
  rainFall: number | null;
}

interface FloodLevelChartProps {
  title: string;
  points: FloodChartPoint[];
  alertLevel?: number | null;
  minorFloodLevel?: number | null;
  majorFloodLevel?: number | null;
  height?: number;
}

const BG = '#1E1F22';
const GRID_COLOR = '#3A3B3E';
const AXIS_TEXT = '#B7BCC2';
const TITLE_TEXT = '#F2F3F4';
const WATER_COLOR = '#5C7CFA';
const ALERT_COLOR = '#F5F5F5';
const MINOR_COLOR = '#FFD43B';
const MAJOR_COLOR = '#FF6B6B';
const RAIN_COLOR = '#4A6FA5';

const PAD_LEFT = 52;
const PAD_RIGHT = 54;
const PAD_TOP = 14;
const PAD_BOTTOM = 26;
const ROWS = 5; // 5 intervals -> 6 gridlines

function niceStep(range: number) {
  if (range <= 0) return 1;
  const rough = range / ROWS;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return step * mag;
}

function formatAxisValue(v: number) {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

// Dual-axis flood gauge chart, styled after the Irrigation Department's dashboard:
// water level line + rainfall bars sharing one plot, threshold lines for the three
// flood-warning levels, and sparse day/noon x-axis ticks instead of one per reading.
export function FloodLevelChart({ title, points, alertLevel, minorFloodLevel, majorFloodLevel, height = 260 }: FloodLevelChartProps) {
  const [width, setWidth] = useState(0);
  const handleLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  if (points.length === 0) {
    return (
      <View style={[styles.card, styles.emptyState, { height }]}>
        <Text style={styles.emptyText}>No readings yet for this station</Text>
      </View>
    );
  }

  const waterValues = points.map((p) => p.waterLevel);
  const rainValues = points.map((p) => p.rainFall ?? 0);

  const leftDataMin = Math.min(...waterValues);
  const leftDataMax = Math.max(...waterValues, majorFloodLevel ?? 0, minorFloodLevel ?? 0, alertLevel ?? 0);
  const leftStep = niceStep(leftDataMax - leftDataMin || 1);
  const leftMin = Math.max(0, Math.floor(leftDataMin / leftStep) * leftStep - leftStep);
  const leftMax = Math.ceil(leftDataMax / leftStep) * leftStep + leftStep;

  const rightDataMax = Math.max(...rainValues, 1);
  const rightStep = niceStep(rightDataMax);
  const rightMax = Math.max(rightStep, Math.ceil(rightDataMax / rightStep) * rightStep);
  const rightMin = 0;

  const plotWidth = Math.max(0, width - PAD_LEFT - PAD_RIGHT);
  const plotHeight = height - PAD_TOP - PAD_BOTTOM;
  const colWidth = points.length > 1 ? plotWidth / (points.length - 1) : plotWidth;

  const xAt = (i: number) => (points.length > 1 ? PAD_LEFT + colWidth * i : PAD_LEFT + plotWidth / 2);
  const yLeft = (v: number) => PAD_TOP + plotHeight - ((v - leftMin) / (leftMax - leftMin)) * plotHeight;
  const yRight = (v: number) => PAD_TOP + plotHeight - ((v - rightMin) / (rightMax - rightMin)) * plotHeight;

  const rowFracs = Array.from({ length: ROWS + 1 }, (_, i) => i / ROWS);

  // Label the first reading of each new day, plus one midday tick per day — mirrors
  // "Sep 18 / 12:00 / Sep 19 / 12:00 ..." rather than a label per (irregular) reading.
  const rawXTicks: { index: number; label: string }[] = [];
  let lastDateKey: string | null = null;
  let noonAddedForDay = false;
  points.forEach((p, i) => {
    const d = new Date(p.timestamp);
    const dateKey = d.toDateString();
    if (dateKey !== lastDateKey) {
      rawXTicks.push({ index: i, label: d.toLocaleDateString([], { month: 'short', day: 'numeric' }) });
      lastDateKey = dateKey;
      noonAddedForDay = false;
    } else if (!noonAddedForDay && d.getHours() >= 12) {
      rawXTicks.push({ index: i, label: '12:00' });
      noonAddedForDay = true;
    }
  });

  // Narrow screens can't fit a label every ~30px, so drop any tick that would land
  // too close to the last kept one instead of letting the text overlap and blur together.
  const MIN_LABEL_GAP = 44;
  const xTicks: { index: number; label: string }[] = [];
  let lastKeptX = -Infinity;
  rawXTicks.forEach((t) => {
    const x = xAt(t.index);
    if (x - lastKeptX >= MIN_LABEL_GAP) {
      xTicks.push(t);
      lastKeptX = x;
    }
  });

  const barWidth = Math.max(1.5, Math.min(6, colWidth * 0.6));
  const lastIndex = points.length - 1;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>

      <View onLayout={handleLayout} style={{ height, marginTop: 10 }}>
        {width > 0 && (
          <Svg width={width} height={height}>
            {rowFracs.map((frac) => {
              const y = PAD_TOP + plotHeight * (1 - frac);
              const leftVal = leftMin + frac * (leftMax - leftMin);
              const rightVal = rightMin + frac * (rightMax - rightMin);
              return (
                <React.Fragment key={frac}>
                  <Line x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={y} y2={y} stroke={GRID_COLOR} strokeWidth={1} />
                  <SvgText x={PAD_LEFT - 8} y={y + 3} fontSize={10} fill={AXIS_TEXT} textAnchor="end">
                    {formatAxisValue(leftVal)}
                  </SvgText>
                  <SvgText x={width - PAD_RIGHT + 8} y={y + 3} fontSize={10} fill={AXIS_TEXT} textAnchor="start">
                    {formatAxisValue(rightVal)}
                  </SvgText>
                </React.Fragment>
              );
            })}

            {xTicks.map((t) => (
              <Line
                key={`vline-${t.index}`}
                x1={xAt(t.index)}
                x2={xAt(t.index)}
                y1={PAD_TOP}
                y2={PAD_TOP + plotHeight}
                stroke={GRID_COLOR}
                strokeWidth={1}
              />
            ))}

            <SvgText
              x={12}
              y={PAD_TOP + plotHeight / 2}
              fontSize={10}
              fill={AXIS_TEXT}
              textAnchor="middle"
              transform={`rotate(-90, 12, ${PAD_TOP + plotHeight / 2})`}
            >
              River Water Level
            </SvgText>
            <SvgText
              x={width - 12}
              y={PAD_TOP + plotHeight / 2}
              fontSize={10}
              fill={AXIS_TEXT}
              textAnchor="middle"
              transform={`rotate(90, ${width - 12}, ${PAD_TOP + plotHeight / 2})`}
            >
              Rainfall (mm)
            </SvgText>

            {rainValues.map((v, i) =>
              v > 0 ? (
                <Rect
                  key={i}
                  x={xAt(i) - barWidth / 2}
                  y={yRight(v)}
                  width={barWidth}
                  height={PAD_TOP + plotHeight - yRight(v)}
                  fill={RAIN_COLOR}
                  opacity={0.85}
                />
              ) : null
            )}

            {majorFloodLevel != null && (
              <Line x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={yLeft(majorFloodLevel)} y2={yLeft(majorFloodLevel)} stroke={MAJOR_COLOR} strokeWidth={1.5} />
            )}
            {minorFloodLevel != null && (
              <Line x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={yLeft(minorFloodLevel)} y2={yLeft(minorFloodLevel)} stroke={MINOR_COLOR} strokeWidth={1.5} />
            )}
            {alertLevel != null && (
              <Line x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={yLeft(alertLevel)} y2={yLeft(alertLevel)} stroke={ALERT_COLOR} strokeWidth={1.5} />
            )}

            <Path
              d={waterValues.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)} ${yLeft(v)}`).join(' ')}
              stroke={WATER_COLOR}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="none"
            />
            <Circle cx={xAt(lastIndex)} cy={yLeft(waterValues[lastIndex])} r={4} fill={WATER_COLOR} stroke={BG} strokeWidth={1.5} />

            {xTicks.map((t) => (
              <SvgText key={t.index} x={xAt(t.index)} y={height - 6} fontSize={10} fill={AXIS_TEXT} textAnchor="middle">
                {t.label}
              </SvgText>
            ))}
          </Svg>
        )}
      </View>

      <View style={styles.legendRow}>
        <LegendLine color={WATER_COLOR} label="Water Level" />
        <LegendLine color={ALERT_COLOR} label="Alert Level" />
        <LegendLine color={MINOR_COLOR} label="Minor Flood" />
        <LegendLine color={MAJOR_COLOR} label="Major Flood" />
        <LegendSwatch color={RAIN_COLOR} label="Rain Fall" />
      </View>
    </View>
  );
}

function LegendLine({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendLine, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BG,
    borderRadius: 16,
    padding: 16,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: TITLE_TEXT,
    textAlign: 'center',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: AXIS_TEXT,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLine: {
    width: 14,
    height: 2.5,
    borderRadius: 2,
  },
  legendSwatch: {
    width: 9,
    height: 9,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
    color: AXIS_TEXT,
  },
});
