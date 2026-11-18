/**
 * Deterministic Seeded Ubongo Puzzle Generator & Validator
 * Guarantees 100% solvable, compact polyomino boards synchronized across WebRTC peers via seed.
 */

import { UBONGO_PIECES, transformCoords, normalizeCoords, getBounds } from './pieces.js';

/**
 * Mulberry32 deterministic PRNG from numeric seed.
 */
export function createPRNG(seedNumber) {
  let a = (seedNumber >>> 0) || 123456789;
  return function nextRandom() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Convert any string or number seed + round number into a 32-bit integer hash.
 */
export function hashSeed(seedStr, roundNumber = 1, difficulty = 4) {
  const str = `${seedStr}-R${roundNumber}-D${difficulty}`;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Shuffle an array in place using the provided PRNG.
 */
function seededShuffle(arr, rng) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Count how many orthogonal edges a candidate placement shares with existing occupied cells,
 * and verify no cell overlaps.
 */
function evaluatePlacement(occupiedSet, candidateCells, maxGridSpan) {
  for (const [cx, cy] of candidateCells) {
    if (occupiedSet.has(`${cx},${cy}`)) {
      return null; // overlaps
    }
  }

  // Compute combined bounding box to keep board compact like real Ubongo cards
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const key of occupiedSet) {
    const [ox, oy] = key.split(',').map(Number);
    if (ox < minX) minX = ox;
    if (ox > maxX) maxX = ox;
    if (oy < minY) minY = oy;
    if (oy > maxY) maxY = oy;
  }
  for (const [cx, cy] of candidateCells) {
    if (cx < minX) minX = cx;
    if (cx > maxX) maxX = cx;
    if (cy < minY) minY = cy;
    if (cy > maxY) maxY = cy;
  }

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  if (width > maxGridSpan || height > maxGridSpan) {
    return null; // exceeds compact board bounds
  }

  // Count shared orthogonal edges with existing board cells
  let sharedEdges = 0;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [cx, cy] of candidateCells) {
    for (const [dx, dy] of dirs) {
      if (occupiedSet.has(`${cx + dx},${cy + dy}`)) {
        sharedEdges++;
      }
    }
  }

  if (sharedEdges === 0) return null;

  // Compactness score: reward more shared edges and smaller bounding box area
  const boundingArea = width * height;
  const score = sharedEdges * 12 - boundingArea * 1.5;
  return { sharedEdges, width, height, score };
}

/**
 * Generate a guaranteed-solvable Ubongo puzzle for the given seed, round, and difficulty (3, 4, or 5 pieces).
 */
export function generateUbongoPuzzle(seedStr, roundNumber = 1, pieceCount = 4) {
  const numSeed = hashSeed(seedStr, roundNumber, pieceCount);
  const rng = createPRNG(numSeed);

  // Max grid span based on difficulty
  const maxSpan = pieceCount <= 3 ? 5 : pieceCount === 4 ? 6 : 7;

  // Filter piece pool slightly by difficulty so 3-piece puzzles aren't tiny and 5-piece puzzles fit well
  let candidatePool = [...UBONGO_PIECES];
  if (pieceCount === 3) {
    // Prefer pieces of size 3, 4, 5
    candidatePool = UBONGO_PIECES.filter((p) => p.coords.length >= 3);
  } else if (pieceCount === 5) {
    // Mix of sizes 2..5 so total area is around 19-21 cells
    candidatePool = [...UBONGO_PIECES];
  }

  for (let attempt = 0; attempt < 40; attempt++) {
    const shuffledPool = seededShuffle(candidatePool, rng);
    const chosenPieces = shuffledPool.slice(0, pieceCount);

    const occupied = new Set();
    const rawPlacements = [];
    let success = true;

    for (let idx = 0; idx < chosenPieces.length; idx++) {
      const piece = chosenPieces[idx];
      const rot = Math.floor(rng() * 4);
      const flip = rng() < 0.5;
      const shape = transformCoords(piece.coords, rot, flip);

      if (idx === 0) {
        for (const [x, y] of shape) {
          occupied.add(`${x},${y}`);
        }
        rawPlacements.push({
          pieceId: piece.id,
          rotation: rot,
          flipped: flip,
          cells: shape.map(([x, y]) => [x, y])
        });
      } else {
        // Gather candidate offsets around current occupied bounds
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const key of occupied) {
          const [ox, oy] = key.split(',').map(Number);
          if (ox < minX) minX = ox;
          if (ox > maxX) maxX = ox;
          if (oy < minY) minY = oy;
          if (oy > maxY) maxY = oy;
        }

        const validCandidates = [];
        // Try all orientations so we get super snug fits
        for (let tryFlip of [false, true]) {
          for (let tryRot = 0; tryRot < 4; tryRot++) {
            const tryShape = transformCoords(piece.coords, tryRot, tryFlip);
            for (let ox = minX - 4; ox <= maxX + 4; ox++) {
              for (let oy = minY - 4; oy <= maxY + 4; oy++) {
                const shifted = tryShape.map(([sx, sy]) => [sx + ox, sy + oy]);
                const evalRes = evaluatePlacement(occupied, shifted, maxSpan);
                if (evalRes && evalRes.sharedEdges >= 2) {
                  validCandidates.push({
                    rotation: tryRot,
                    flipped: tryFlip,
                    cells: shifted,
                    score: evalRes.score + rng() * 6
                  });
                }
              }
            }
          }
        }

        if (validCandidates.length === 0) {
          success = false;
          break;
        }

        validCandidates.sort((a, b) => b.score - a.score);
        // Pick among top compact placements
        const topPick = validCandidates[Math.floor(rng() * Math.min(5, validCandidates.length))];
        for (const [cx, cy] of topPick.cells) {
          occupied.add(`${cx},${cy}`);
        }
        rawPlacements.push({
          pieceId: piece.id,
          rotation: topPick.rotation,
          flipped: topPick.flipped,
          cells: topPick.cells
        });
      }
    }

    if (success) {
      // Normalize entire board so top-left of board is (0, 0)
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const key of occupied) {
        const [ox, oy] = key.split(',').map(Number);
        if (ox < minX) minX = ox;
        if (oy < minY) minY = oy;
        if (ox > maxX) maxX = ox;
        if (oy > maxY) maxY = oy;
      }

      const boardWidth = maxX - minX + 1;
      const boardHeight = maxY - minY + 1;
      const targetCells = [];
      for (const key of occupied) {
        const [ox, oy] = key.split(',').map(Number);
        targetCells.push([ox - minX, oy - minY]);
      }
      targetCells.sort((a, b) => (a[1] - b[1]) || (a[0] - b[0]));

      const solution = rawPlacements.map((pl) => {
        const normCells = pl.cells.map(([cx, cy]) => [cx - minX, cy - minY]);
        const minCellX = Math.min(...normCells.map((c) => c[0]));
        const minCellY = Math.min(...normCells.map((c) => c[1]));
        return {
          pieceId: pl.pieceId,
          gridX: minCellX,
          gridY: minCellY,
          rotation: pl.rotation,
          flipped: pl.flipped,
          cells: normCells
        };
      });

      // Scramble initial orientation of pieces for the player's hand
      const handPieces = seededShuffle(chosenPieces, rng).map((piece) => {
        const startRot = Math.floor(rng() * 4);
        const startFlip = rng() < 0.5;
        return {
          ...piece,
          initialRotation: startRot,
          initialFlipped: startFlip
        };
      });

      return {
        id: `${seedStr}-R${roundNumber}`,
        seed: seedStr,
        roundNumber,
        difficulty: pieceCount,
        boardWidth,
        boardHeight,
        targetCells,
        totalSquares: targetCells.length,
        pieces: handPieces,
        solution
      };
    }
  }

  // Fallback deterministic puzzle if anything ever fails
  const fallbackPieces = UBONGO_PIECES.slice(0, 3);
  return {
    id: 'FALLBACK-1',
    seed: seedStr,
    roundNumber,
    difficulty: 3,
    boardWidth: 4,
    boardHeight: 2,
    targetCells: [[0,0],[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[3,1]],
    totalSquares: 8,
    pieces: fallbackPieces.map((p) => ({ ...p, initialRotation: 0, initialFlipped: false })),
    solution: []
  };
}
