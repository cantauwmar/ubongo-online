/**
 * Original 12 KOSMOS Ubongo Polyomino Shapes & Transformations
 * Exact tile set from the classic board game by Grzegorz Rejchtman:
 * - 1 Domino (2 squares): I2
 * - 2 Trominoes (3 squares): I3, V3
 * - 4 Tetrominoes (4 squares): O4, L4, T4, Z4
 * - 5 Pentominoes (5 squares): L5, Y5, P5, U5, W5
 */

export const UBONGO_PIECES = [
  {
    id: 'I2',
    code: '01',
    name: '2er-Domino',
    squares: 2,
    color: '#65a30d',       // Classic Ubongo Lime Green
    border: '#bef264',
    bevelDark: '#3f6212',
    coords: [[0, 0], [1, 0]]
  },
  {
    id: 'I3',
    code: '02',
    name: '3er-Stab',
    squares: 3,
    color: '#eab308',       // Classic Ubongo Ochre Yellow
    border: '#fef08a',
    bevelDark: '#854d0e',
    coords: [[0, 0], [1, 0], [2, 0]]
  },
  {
    id: 'V3',
    code: '03',
    name: '3er-Winkel',
    squares: 3,
    color: '#7c3aed',       // Classic Ubongo Royal Violet
    border: '#ddd6fe',
    bevelDark: '#4c1d95',
    coords: [[0, 0], [0, 1], [1, 1]]
  },
  {
    id: 'O4',
    code: '04',
    name: '4er-Block',
    squares: 4,
    color: '#dc2626',       // Classic Ubongo Crimson Red
    border: '#fecaca',
    bevelDark: '#7f1d1d',
    coords: [[0, 0], [1, 0], [0, 1], [1, 1]]
  },
  {
    id: 'L4',
    code: '05',
    name: '4er-Haken (L)',
    squares: 4,
    color: '#ea580c',       // Classic Ubongo Terracotta Orange
    border: '#fed7aa',
    bevelDark: '#7c2d12',
    coords: [[0, 0], [0, 1], [0, 2], [1, 2]]
  },
  {
    id: 'T4',
    code: '06',
    name: '4er-Totem (T)',
    squares: 4,
    color: '#15803d',       // Classic Ubongo Forest Green
    border: '#bbf7d0',
    bevelDark: '#14532d',
    coords: [[0, 0], [1, 0], [2, 0], [1, 1]]
  },
  {
    id: 'Z4',
    code: '07',
    name: '4er-Stufe (Z)',
    squares: 4,
    color: '#0284c7',       // Classic Ubongo Sky Blue
    border: '#bae6fd',
    bevelDark: '#0c4a6e',
    coords: [[0, 0], [1, 0], [1, 1], [2, 1]]
  },
  {
    id: 'P5',
    code: '08',
    name: '5er-Schild (P)',
    squares: 5,
    color: '#9f1239',       // Classic Ubongo Burgundy
    border: '#fecdd3',
    bevelDark: '#4c0519',
    coords: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]]
  },
  {
    id: 'U5',
    code: '09',
    name: '5er-Brücke (U)',
    squares: 5,
    color: '#d97706',       // Classic Ubongo Amber Gold
    border: '#fde68a',
    bevelDark: '#78350f',
    coords: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]]
  },
  {
    id: 'W5',
    code: '10',
    name: '5er-Treppe (W)',
    squares: 5,
    color: '#db2777',       // Classic Ubongo Magenta
    border: '#fbcfe8',
    bevelDark: '#831843',
    coords: [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]]
  },
  {
    id: 'L5',
    code: '11',
    name: '5er-Langhaken (L)',
    squares: 5,
    color: '#1d4ed8',       // Classic Ubongo Cobalt Blue
    border: '#bfdbfe',
    bevelDark: '#1e3a8a',
    coords: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]]
  },
  {
    id: 'Y5',
    code: '12',
    name: '5er-Ast (Y)',
    squares: 5,
    color: '#0d9488',       // Classic Ubongo Jade Teal
    border: '#99f6e4',
    bevelDark: '#134e4a',
    coords: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 1]]
  }
];

export function normalizeCoords(coords) {
  if (!coords || coords.length === 0) return [];
  let minX = Infinity;
  let minY = Infinity;
  for (const [x, y] of coords) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
  }
  return coords
    .map(([x, y]) => [x - minX, y - minY])
    .sort((a, b) => (a[1] - b[1]) || (a[0] - b[0]));
}

export function rotateCoordsCW(coords) {
  return normalizeCoords(coords.map(([x, y]) => [-y, x]));
}

export function flipCoordsH(coords) {
  return normalizeCoords(coords.map(([x, y]) => [-x, y]));
}

export function getBounds(coords) {
  let maxX = 0;
  let maxY = 0;
  for (const [x, y] of coords) {
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { width: maxX + 1, height: maxY + 1 };
}

export function transformCoords(baseCoords, rotation = 0, flipped = false) {
  let result = normalizeCoords(baseCoords);
  if (flipped) {
    result = flipCoordsH(result);
  }
  const steps = ((rotation % 4) + 4) % 4;
  for (let i = 0; i < steps; i++) {
    result = rotateCoordsCW(result);
  }
  return result;
}
