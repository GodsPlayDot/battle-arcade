import { cp, mkdir, rm } from 'node:fs/promises';

const games = ['grid-combat', 'spin-arena', 'slime-arcade', 'ascension-chess'];
await rm('dist', { recursive: true, force: true });
await mkdir('dist/games', { recursive: true });
await cp('index.html', 'dist/index.html');
await cp('src', 'dist/src', { recursive: true });
await cp('public', 'dist', { recursive: true });
for (const game of games) await cp(`games/${game}/dist`, `dist/games/${game}`, { recursive: true });
