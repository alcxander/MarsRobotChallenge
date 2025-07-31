#!/usr/bin/env node
import fs from "fs/promises";
import chalk from "chalk";
import inquirer from "inquirer";
import { simulateRobot } from "../dist/robot-simulator.js"; 
import { aStar, pathToCommands } from "./planner.js";


async function main() {
  console.log(chalk.blue.bold(">> Starting interactive Mars Robot CLI..."));

  const args = process.argv.slice(2);
  console.log(chalk.gray(">> Raw args:"), args);

  const inputFile = args[0];

  if (!inputFile || typeof inputFile !== "string") {
    console.error(chalk.red("❌ No input file provided."));
    console.log(`\n${chalk.green("Usage:")} node ./scripts/marsRobotCLIInteractive.js <input.json>`);
    process.exit(1);
  }

  console.log(chalk.yellow(`>> Loading input file: ${inputFile}`));

  let inputJson;
  try {
    const fileData = await fs.readFile(inputFile, "utf8");
    inputJson = JSON.parse(fileData);
    console.log(chalk.green("✅ Input file loaded successfully!"));
    console.log(chalk.gray(">> Input preview:"), JSON.stringify(inputJson, null, 2));
  } catch (err) {
    console.error(chalk.red(`❌ Failed to load input file: ${err.message}`));
    process.exit(1);
  }

  // Validate the required terrain, battery, commands, initialPosition keys exist
  if (!inputJson.terrain || !Array.isArray(inputJson.terrain)) {
    console.error(chalk.red("❌ Invalid input: missing or invalid 'terrain' array."));
    process.exit(1);
  }
  if (!inputJson.battery || typeof inputJson.battery !== "number") {
    console.error(chalk.red("❌ Invalid input: missing or invalid 'battery' number."));
    process.exit(1);
  }
  if (!inputJson.commands || !Array.isArray(inputJson.commands)) {
    inputJson.commands = []; // start empty commands array
  }
  if (!inputJson.initialPosition || typeof inputJson.initialPosition !== "object") {
    console.error(chalk.red("❌ Invalid input: missing or invalid 'initialPosition' object."));
    process.exit(1);
  }

  // Initialize state:
  // We'll keep terrain, battery, initialPosition fixed from input
  // We'll maintain commands array and current robot output state updated from simulator
  let state = {
    terrain: inputJson.terrain,
    battery: inputJson.battery,
    commands: inputJson.commands,
    initialPosition: inputJson.initialPosition,
  };

  // Run initial simulation to get robot starting state
  let simOutput;
  try {
    simOutput = simulateRobot(state);
  } catch (err) {
    console.error(chalk.red(`❌ Error during initial simulation: ${err.message}`));
    process.exit(1);
  }

  console.log(chalk.green("\n✅ Starting simulation! Type commands to control the robot."));
  console.log(chalk.gray("Commands: move (f), left (l), right (r), backward (b), sample (s), recharge (e), exit (q)\n"));

  while (true) {
    displayMap(state, simOutput);

    const { command } = await inquirer.prompt([
      {
        type: "input",
        name: "command",
        message: chalk.cyan("Enter command: (or 'plan path x1 y1 x2 y2'):"),
      },
    ]);

    const normalized = command.trim().toLowerCase();

    if (["exit", "quit", "q"].includes(normalized)) {
      console.log(chalk.blue("👋 Exiting interactive CLI. Goodbye!"));
      process.exit(0);
    }

    if (normalized.startsWith("plan path")) {
    const parts = normalized.split(/\s+/);
    if (parts.length !== 6) {
      console.log(chalk.yellow("⚠️ Usage: plan path <startX> <startY> <goalX> <goalY>"));
      continue;
    }
    const startX = parseInt(parts[2], 10);
    const startY = parseInt(parts[3], 10);
    const goalX = parseInt(parts[4], 10);
    const goalY = parseInt(parts[5], 10);

    if (
      isNaN(startX) || isNaN(startY) || isNaN(goalX) || isNaN(goalY) ||
      startX < 0 || startY < 0 || goalX < 0 || goalY < 0
    ) {
      console.log(chalk.yellow("⚠️ Coordinates must be non-negative integers."));
      continue;
    }

    // Run A* planner
    const terrain = state.terrain;
    const start = { x: startX, y: startY };
    const goal = { x: goalX, y: goalY };

    try {
      const path = aStar(terrain, start, goal);
      if (!path) {
        console.log(chalk.red("❌ No path found."));
        continue;
      }

      // Use robot's current facing from simulation output or state (default 'N')
      const currentFacing = simOutput?.FinalPosition?.Facing;
      if (!['North', 'East', 'South', 'West'].includes(currentFacing)) {
        currentFacing = 'North';
      }
      const commands = pathToCommands(path, currentFacing);

      // Append planned commands to state's command array
      state.commands = [...state.commands, ...commands];
      simOutput = simulateRobot(state);

      console.log(chalk.green(`✅ Path planned and ${commands.length} commands added.`));
    } catch (err) {
      console.log(chalk.red(`❌ Error during planning: ${err.message}`));
    }
    continue;
  }


    // Map user-friendly commands to your simulator commands:
    const commandMap = {
      f: "F",
      move: "F",
      b: "B",
      backward: "B",
      l: "L",
      left: "L",
      r: "R",
      right: "R",
      s: "S",
      sample: "S",
      e: "E",
      recharge: "E",
    };

    if (!(normalized in commandMap)) {
      console.log(chalk.yellow(`⚠️ Unknown command '${command}', please use valid commands.`));
      continue;
    }

    const simCommand = commandMap[normalized];

    // Append the new command to commands array
    state.commands = [...state.commands, simCommand];

    try {
      simOutput = simulateRobot(state);
      // Update battery & position in state for display and next iteration
      const currentBattery = simOutput.Battery;

      console.log(chalk.green(`✅ Command '${simCommand}' applied.`));
    } catch (err) {
      console.error(chalk.red(`❌ Error running simulator: ${err.message}`));
    }
  }
}

// Display the terrain + robot + visited + samples
function displayMap(inputState, simOutput, currentBattery) {
  console.log(chalk.yellow.bold("\n== Mars Terrain =="));
  console.log(chalk.blue(`Battery: ${currentBattery}`));

  const terrain = inputState.terrain;

  // Extract robot info from simOutput
  const robotX = simOutput.FinalPosition.Location.x;
  const robotY = simOutput.FinalPosition.Location.y;
  const facing = simOutput.FinalPosition.Facing;
  const visited = simOutput.VisitedCells || [];
  const samples = simOutput.SamplesCollected || [];

  for (let y = 0; y < terrain.length; y++) {
    let row = "";
    for (let x = 0; x < terrain[y].length; x++) {
      const cell = terrain[y][x];

      // Determine cell display
      if (x === robotX && y === robotY) {
        row += chalk.bgMagenta.white(" R "); // robot current position
      } else if (visited.some((pos) => pos.x === x && pos.y === y)) {
        row += chalk.bgGray.white(" . "); // visited cells
      } else if (samples.includes(cell)) {
        row += chalk.bgGreen.black(" $ "); // collected samples (not location-specific but gives idea)
      } else {
        // Show terrain symbol for context
        row += chalk.bgBlack.white(` ${cell} `);
      }
    }
    console.log(row);
  }

  console.log(chalk.blue(`\nRobot Position: x=${robotX}, y=${robotY}, facing=${facing}`));
  console.log(chalk.blue(`Battery: ${simOutput.Battery}`));
  console.log(chalk.blue(`Samples Collected: ${samples.join(", ") || "none"}`));
}

main();