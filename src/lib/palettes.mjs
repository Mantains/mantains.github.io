export const paletteStorageKey = 'li-yunfei-reading-palette';
export const defaultPalette = 'paper';

export const palettes = [
  {
    id: 'paper',
    name: { en: 'Paper & olive', zh: '纸白橄榄' },
    colors: { paper: '#f7f7f0', ink: '#243e31', body: '#424b40', muted: '#646d5e', line: '#d9ded0', wash: '#edf0e5', tint: '#dde5d2', accent: '#8a5033' }
  },
  {
    id: 'forest',
    name: { en: 'Light forest', zh: '浅森林绿' },
    colors: { paper: '#eff5ee', ink: '#243e2c', body: '#3f5041', muted: '#5a6b5a', line: '#c9d6c5', wash: '#e3ece0', tint: '#cedfca', accent: '#416b4a' }
  },
  {
    id: 'sage',
    name: { en: 'Soft sage', zh: '柔和鼠尾草' },
    colors: { paper: '#f2f4ef', ink: '#344239', body: '#48534b', muted: '#5e6a61', line: '#d1d9cf', wash: '#e6ebe2', tint: '#d6dfd1', accent: '#5b6846' }
  },
  {
    id: 'mist',
    name: { en: 'Misty blue', zh: '雾蓝' },
    colors: { paper: '#f0f4f7', ink: '#2a3d4b', body: '#42535e', muted: '#596975', line: '#cfd9e0', wash: '#e2eaf0', tint: '#d3e0e8', accent: '#4c6a80' }
  },
  {
    id: 'sand',
    name: { en: 'Warm sand', zh: '暖沙' },
    colors: { paper: '#f8f3e9', ink: '#483d31', body: '#5a5043', muted: '#746650', line: '#dfd5c4', wash: '#efe7d9', tint: '#e3d6bf', accent: '#805d3f' }
  }
];

export const paletteCss = palettes.map(palette =>
  `:root[data-palette="${palette.id}"]{${Object.entries(palette.colors).map(([name, color]) => `--${name}:${color}`).join(';')}}`
).join('\n');
