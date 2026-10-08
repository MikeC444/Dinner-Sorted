import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

const PATHS = {
  tonight: 'M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5a6.5 6.5 0 0 0 10 10z',
  kitchen: 'M6 2h12a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z M5 10h14 M9 5v2 M9 13v3',
  browse: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M20 20l-4-4',
  goals: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  account: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M4 21a8 8 0 0 1 16 0',
  lock: 'M6 11h12v10H6z M8 11V7a4 4 0 0 1 8 0v4',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3 2',
  flame: 'M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3-1-6 1-9z',
  check: 'M5 12l5 5 9-10',
  back: 'M15 5l-7 7 7 7',
  close: 'M6 6l12 12 M18 6L6 18',
  plus: 'M12 5v14 M5 12h14',
  minus: 'M5 12h14',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  chevron: 'M9 5l7 7-7 7',
  flag: 'M5 21V4 M5 4h11l-2 4 2 4H5',
  camera: 'M4 7h3l2-3h6l2 3h3v12H4z M12 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  chat: 'M4 5h16v11H9l-5 4z M8 9h8 M8 12h5',
  leaf: 'M5 19c0-8 6-14 14-14 0 8-6 14-14 14z M5 19l7-7',
  warning: 'M12 3l9.5 17h-19z M12 10v4 M12 17.5v.5',
  list: 'M9 6h11 M9 12h11 M9 18h11 M4 6h.01 M4 12h.01 M4 18h.01',
  sliders: 'M4 7h9 M17 7h3 M15 5v4 M4 17h3 M11 17h9 M9 15v4 M4 12h16',
  bookmark: 'M7 4h10v17l-5-4-5 4z',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  pencil: 'M4 20l1-4L16 5l3 3L8 19z M14 7l3 3',
  external: 'M14 4h6v6 M20 4l-9 9 M18 14v5H5V6h5',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, color = colors.ink, strokeWidth = 2, fill = 'none' }: {
  name: IconName; size?: number; color?: string; strokeWidth?: number; fill?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden importantForAccessibility="no">
      <Path d={PATHS[name]} />
    </Svg>
  );
}
