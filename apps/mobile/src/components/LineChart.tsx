import { useState } from 'react';
import { I18nManager, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { colors, space } from '../theme';
import { AppText } from './AppText';

export interface ChartPoint {
  x: number;
  y: number;
}

interface Props {
  points: ChartPoint[];
  height?: number;
  formatY?: (y: number) => string;
  formatX?: (x: number) => string;
}

/** Minimal line chart: progress over time, newest on the trailing side. */
export function LineChart({ points, height = 160, formatY = String, formatX }: Props) {
  const [width, setWidth] = useState(0);
  if (points.length === 0) return null;

  const pad = 12;
  const ys = points.map((p) => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanY = maxY - minY || 1;
  const minX = points[0]!.x;
  const spanX = points[points.length - 1]!.x - minX || 1;
  const toX = (x: number) => {
    const pos = pad + ((x - minX) / spanX) * (width - pad * 2);
    return I18nManager.isRTL ? width - pos : pos;
  };
  const toY = (y: number) => pad + (1 - (y - minY) / spanY) * (height - pad * 2);
  const coords = points.length === 1 ? [{ x: width / 2, y: height / 2 }] : points.map((p) => ({ x: toX(p.x), y: toY(p.y) }));
  const last = coords[coords.length - 1]!;

  return (
    <View>
      <View style={styles.axis}>
        <AppText variant="caption" color={colors.muted}>{formatY(maxY)}</AppText>
      </View>
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Line x1={0} x2={width} y1={height - 1} y2={height - 1} stroke={colors.border} strokeWidth={1} />
            {coords.length > 1 ? (
              <Polyline
                points={coords.map((c) => `${c.x},${c.y}`).join(' ')}
                fill="none"
                stroke={colors.primary}
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}
            {coords.map((c, i) => (
              <Circle key={i} cx={c.x} cy={c.y} r={i === coords.length - 1 ? 6 : 3.5} fill={colors.primary} />
            ))}
            <Circle cx={last.x} cy={last.y} r={10} fill={colors.primary} opacity={0.15} />
          </Svg>
        ) : null}
      </View>
      <View style={styles.footer}>
        <AppText variant="caption" color={colors.muted}>{formatY(minY)}</AppText>
        {formatX ? (
          <AppText variant="caption" color={colors.muted}>
            {formatX(points[0]!.x)} – {formatX(points[points.length - 1]!.x)}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  axis: { marginBottom: space.xs },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xs },
});
