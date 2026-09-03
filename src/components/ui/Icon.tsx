/** Ein kleiner Icon-Satz als Inline-SVG - strichbasiert, erbt currentColor. */
import type { SVGProps } from 'react';

export type IconName =
  | 'home'
  | 'bottle'
  | 'breast'
  | 'pump'
  | 'scale'
  | 'diaper'
  | 'thermometer'
  | 'heart'
  | 'chart'
  | 'settings'
  | 'plus'
  | 'minus'
  | 'check'
  | 'warning'
  | 'info'
  | 'alert'
  | 'clock'
  | 'play'
  | 'pause'
  | 'stop'
  | 'close'
  | 'trash'
  | 'edit'
  | 'download'
  | 'upload'
  | 'print'
  | 'chevron-right'
  | 'moon'
  | 'baby'
  | 'pill'
  | 'note';

const PATHS: Record<IconName, string> = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5M9.5 20v-5.5h5V20',
  bottle: 'M9 2h6M9.5 5h5M8 8.5h8v11a2.5 2.5 0 0 1-2.5 2.5h-3A2.5 2.5 0 0 1 8 19.5zM8 5.5h8M11 12v4',
  breast: 'M4 15a8 8 0 0 1 16 0M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12 12h.01M4 15v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
  pump: 'M7 3h10M9 6.5h6M8.5 9.5h7v6a3.5 3.5 0 0 1-7 0zM12 19v3M8 22h8',
  scale: 'M4 7h16l1.5 13.5H2.5zM8.5 11.5a3.5 3.5 0 0 0 7 0M12 7V4M9 4h6',
  diaper: 'M4 5h16v5a10 10 0 0 1-8 9.8A10 10 0 0 1 4 10zM4 9h16M12 15v5',
  thermometer: 'M12 3.5a2.5 2.5 0 0 1 2.5 2.5v7.6a4.5 4.5 0 1 1-5 0V6A2.5 2.5 0 0 1 12 3.5ZM12 8v7',
  heart: 'M12 20.5s-7.5-4.6-7.5-9.7A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 7.5 2.8c0 5.1-7.5 9.7-7.5 9.7Z',
  chart: 'M4 20V4M4 20h16M8 17V11M12.5 17V7M17 17v-4',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 14.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-3-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1.2Z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'M4.5 12.5 9.5 17.5 19.5 6.5',
  warning: 'M12 3.5 22 20H2zM12 9.5v5M12 17.2h.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 7.8h.01',
  alert: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.5v5.5M12 16.4h.01',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5.2l3.4 2',
  play: 'M7 4.8 19 12 7 19.2z',
  pause: 'M9 5v14M15 5v14',
  stop: 'M6.5 6.5h11v11h-11z',
  close: 'M6 6l12 12M18 6 6 18',
  trash: 'M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6',
  edit: 'M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17zM14.5 6.5l3 3',
  download: 'M12 3.5v12M7.5 11 12 15.5 16.5 11M4.5 20h15',
  upload: 'M12 20V8M7.5 12.5 12 8l4.5 4.5M4.5 4h15',
  print: 'M7 9V3.5h10V9M7 18H4.5v-7h15v7H17M7 14h10v6.5H7z',
  'chevron-right': 'M9.5 5.5 16 12l-6.5 6.5',
  moon: 'M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5a8.5 8.5 0 1 0 10.8 10.8Z',
  baby: 'M12 20a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM9.5 11h.01M14.5 11h.01M9.5 15c.7.8 1.6 1.2 2.5 1.2s1.8-.4 2.5-1.2M12 6V3.5',
  pill: 'M8.5 4.5h7A4.5 4.5 0 0 1 20 9v6a4.5 4.5 0 0 1-4.5 4.5h-7A4.5 4.5 0 0 1 4 15V9a4.5 4.5 0 0 1 4.5-4.5ZM4 12h16',
  note: 'M6 3.5h9L19 8v12.5H6zM14.5 3.5V8H19M9 12h7M9 16h5',
};

/** Diese Symbole werden gefüllt statt gestrichen dargestellt. */
const FILLED = new Set<IconName>(['play', 'stop']);

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 24, ...rest }: IconProps) {
  const filled = FILLED.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} {...(filled ? { fill: 'currentColor', stroke: 'none' } : {})} />
    </svg>
  );
}
