import chalk from 'chalk';

export function aStar(terrain, start, goal) {
  const rows = terrain.length;
  const cols = terrain[0].length;
  console.log("A* called with start:", start, "goal:", goal);
  console.log("Terrain size:", rows, "rows x", cols, "cols");

  function heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  function neighbors(node) {
    //console.log("Checking neighbors for", node);

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
        const cell = terrain[ny][nx];
        //console.log(`  Checking neighbor cell (${nx},${ny}) - terrain: ${cell}`);
        if (cell !== 'Obs') {
          results.push({ x: nx, y: ny });
        }
      }
    }
    //console.log(`  Neighbors for ${node.x},${node.y}:`, results);
    return results;
  }

  const openSet = [start];
  const cameFrom = new Map();

  function nodeKey(n) {
    return `${n.x},${n.y}`;
  }

  // Initialize gScore and fScore maps *early* before loop
  const gScore = new Map();
  gScore.set(nodeKey(start), 0);
  //console.log(`gScore initialized for start node ${nodeKey(start)} with 0`);

  const fScore = new Map();
  fScore.set(nodeKey(start), heuristic(start, goal));

  while (openSet.length > 0) {
    openSet.sort(
      (a, b) =>
        (fScore.get(nodeKey(a)) ?? Infinity) - (fScore.get(nodeKey(b)) ?? Infinity)
    );
    const current = openSet.shift();
    //console.log("Current node:", current);

    if (current.x === goal.x && current.y === goal.y) {
      const path = [];
      let currKey = nodeKey(current);
      let node = current;
      while (cameFrom.has(currKey)) {
        path.unshift(node);
        node = cameFrom.get(currKey);
        currKey = nodeKey(node);
      }
      path.unshift(start);
      console.log(chalk.green("Goal reached! Path:"), path);
      return path;
    }

    for (const neighbor of neighbors(current)) {
      const currentKey = nodeKey(current);
      const neighborKey = nodeKey(neighbor);

      const currentG = gScore.get(currentKey);
      //console.log(`gScore for current node ${currentKey}:`, currentG);

      const tentative_gScore = (currentG !== undefined ? currentG : Infinity) + 1;
      //console.log(`tentative g score for neighbor ${neighborKey}:`, tentative_gScore);

      const neighborG = gScore.get(neighborKey);
      const neighborF = fScore.get(neighborKey);
      //console.log(`gScore for neighbor ${neighborKey}:`, neighborG);
      //console.log(`fScore for neighbor ${neighborKey}:`, neighborF);

      if (tentative_gScore < (neighborG ?? Infinity)) {
        //console.log(`Updating scores for neighbor ${neighborKey}`);
        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentative_gScore);
        fScore.set(neighborKey, tentative_gScore + heuristic(neighbor, goal));
        if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
          //console.log(`Adding neighbor ${neighborKey} to openSet`);
          openSet.push(neighbor);
        }
      }
    }
  }

  console.log(chalk.red("No path found."));
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
