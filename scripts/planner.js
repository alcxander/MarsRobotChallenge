export function aStar(terrain, start, goal) {
  function heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  const rows = terrain.length;
  const cols = terrain[0].length;

  function neighbors(node) {
    const results = [];
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    for (const d of dirs) {
      const nx = node.x + d.x;
      const ny = node.y + d.y;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
        if (terrain[ny][nx] !== 'X') {
          results.push({ x: nx, y: ny });
        }
      }
    }
    return results;
  }

  const openSet = [start];
  const cameFrom = new Map();

  function nodeKey(n) {
    return `${n.x},${n.y}`;
  }

  const gScore = new Map();
  gScore.set(nodeKey(start), 0);

  const fScore = new Map();
  fScore.set(nodeKey(start), heuristic(start, goal));

  while (openSet.length > 0) {
    openSet.sort((a, b) => (fScore.get(nodeKey(a)) || Infinity) - (fScore.get(nodeKey(b)) || Infinity));
    const current = openSet.shift();

    if (current.x === goal.x && current.y === goal.y) {
      const path = [];
      let curr = current;
      while (curr) {
        path.unshift(curr);
        curr = cameFrom.get(nodeKey(curr));
      }
      return path;
    }

    for (const neighbor of neighbors(current)) {
      const tentative_gScore = (gScore.get(nodeKey(current)) || Infinity) + 1;

      if (tentative_gScore < (gScore.get(nodeKey(neighbor)) || Infinity)) {
        cameFrom.set(nodeKey(neighbor), current);
        gScore.set(nodeKey(neighbor), tentative_gScore);
        fScore.set(nodeKey(neighbor), tentative_gScore + heuristic(neighbor, goal));
        if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
          openSet.push(neighbor);
        }
      }
    }
  }

  return null;
}

export function pathToCommands(path, startFacing = 'North') {
  if (!path || path.length < 2) return [];

  const facings = ['North', 'East', 'South', 'West'];
  let currentFacing = startFacing;

  if (!facings.includes(currentFacing)) {
    currentFacing = 'North';
  }

  const commands = [];

  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const next = path[i];

    const dx = next.x - prev.x;
    const dy = next.y - prev.y;

    let neededFacing;
    if (dx === 1 && dy === 0) neededFacing = 'East';
    else if (dx === -1 && dy === 0) neededFacing = 'West';
    else if (dx === 0 && dy === -1) neededFacing = 'North';
    else if (dx === 0 && dy === 1) neededFacing = 'South';
    else throw new Error(`Invalid move from (${prev.x},${prev.y}) to (${next.x},${next.y})`);

    while (currentFacing !== neededFacing) {
      const currentIndex = facings.indexOf(currentFacing);
      const neededIndex = facings.indexOf(neededFacing);
      const diff = (neededIndex - currentIndex + 4) % 4;

      if (diff === 1) {
        commands.push('R');
        currentFacing = facings[(currentIndex + 1) % 4];
      } else if (diff === 3) {
        commands.push('L');
        currentFacing = facings[(currentIndex + 3) % 4];
      } else if (diff === 2) {
        commands.push('R');
        commands.push('R');
        currentFacing = facings[(currentIndex + 2) % 4];
      }
    }

    commands.push('F');
  }

  return commands;
}
