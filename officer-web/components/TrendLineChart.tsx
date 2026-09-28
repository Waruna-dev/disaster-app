import React, { useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path, Circle, Text as SvgText } from 'react-native-svg';
import { Colors } from '../constants/colors';

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

interface TrendLineChartProps {
  labels: string[];
  series: TrendSeries[];
  height?: number;
}

const PAD_LEFT = 22;
const PAD_RIGHT = 6;
const PAD_TOP = 10;
const PAD_BOTTOM = 8;

// Small multi-line chart with a shared y-axis. Each x position is the centre of an equal
// column, so the label row underneath (same columns) lines up with the points.
export function TrendLineChart({ labels, series, height = 130 }: TrendLineChartProps) {
  const [width, setWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const peak = Math.max(0, ...series.flatMap((s) => s.values));
  // Even top value so the middle gridline is always a whole number.
  const maxY = Math.max(2, peak % 2 === 0 ? peak : peak + 1);

  const plotWidth = Math.max(0, width - PAD_LEFT - PAD_RIGHT);
  const plotHeight = height - PAD_TOP - PAD_BOTTOM;
  const colWidth = labels.length > 0 ? plotWidth / labels.length : 0;

  const xAt = (i: number) => PAD_LEFT + colWidth * (i + 0.5);
  const yAt = (v: number) => PAD_TOP + plotHeight - (v / maxY) * plotHeight;

  const gridValues = [0, maxY / 2, maxY];

  return (
    <View>
      <View onLayout={handleLayout} style={{ height }}>
        {width > 0 && (
          <Svg width={width} height={height}>
            {gridValues.map((v) => (
              <React.Fragment key={v}>
                <Line x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={yAt(v)} y2={yAt(v)} stroke="#E3F0EC" strokeWidth={1} />
                <SvgText x={PAD_LEFT - 6} y={yAt(v) + 3} fontSize={10} fill={Colors.textMuted} textAnchor="end">
                  {v}
                </SvgText>
              </React.Fragment>
            ))}

            {series.map((s) => (
              <React.Fragment key={s.key}>
                <Path
                  d={s.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)} ${yAt(v)}`).join(' ')}
                  stroke={s.color}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  fill="none"
                />
                {s.values.map((v, i) => (
                  <Circle key={i} cx={xAt(i)} cy={yAt(v)} r={3.5} fill={s.color} stroke={Colors.white} strokeWidth={1.5} />
                ))}
              </React.Fragment>
            ))}
          </Svg>
        )}
      </View>

      <View style={[styles.labelRow, { paddingLeft: PAD_LEFT, paddingRight: PAD_RIGHT }]}>
        {labels.map((label, i) => (
          <Text key={i} style={styles.label}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    color: Colors.textMuted,
  },
});
