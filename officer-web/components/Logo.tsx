import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../constants/colors';

interface LogoProps {
  width?: number;
  height?: number;
  color?: string;
  variant?: 'solid' | 'outline';
}

export function Logo({ width = 46, height = 64, color = Colors.primary, variant = 'solid' }: LogoProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 62 90">
      <Path
        d="M31 0L62 11V37C62 60 50 79 31 90C12 79 0 60 0 37V11L31 0Z"
        fill={variant === 'solid' ? color : 'none'}
        stroke={variant === 'outline' ? color : 'none'}
        strokeWidth={variant === 'outline' ? 5.5 : 0}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
