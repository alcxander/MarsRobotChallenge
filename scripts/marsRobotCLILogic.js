import fs from "fs/promises";
import chalk from "chalk";
import { simulateRobot } from "../dist/robot-simulator.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pkg = require("../package.json");

export async function runCli(argv, {
  fsModule = fs,
  consoleModule = console,
  exit = process.exit,
} = {}) {
  const usage = `
${chalk.green.bold('Usage:')}
  marsRobot <input.json> <output.json>

${chalk.green.bold('Description:')}
  Reads the JSON input file, simulates the Mars robot, and writes the output JSON.

${chalk.green.bold('Examples:')}
  marsRobot sample-input.json output.json

${chalk.green.bold('Options:')}
  -h, --help       Show help message
  -v, --version    Show version
`;

  const args = argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    consoleModule.log(usage);
    exit(0);
    return;
  }

  if (args.includes("--version") || args.includes("-v")) {
    consoleModule.log(chalk.blue(`marsRobot version: ${pkg.version}`));
    exit(0);
    return;
  }

  if (args.length !== 2) {
    consoleModule.error(chalk.red("Incorrect number of arguments"), " expected, see below usage:");
    consoleModule.log(usage);
    exit(0);
    return;
  }

  const [inputPath, outputPath] = args;

  try {
    const inputJson = await fsModule.readFile(inputPath, "utf8");
    const input = JSON.parse(inputJson);

    const output = simulateRobot(input);
    consoleModule.log(chalk.cyan("Simulation complete. Output:"), output);

    await fsModule.writeFile(outputPath, JSON.stringify(output, null, 2));
    consoleModule.log(chalk.green("Done. Output written to: "), chalk.bold(outputPath));
  } catch (e) {
    consoleModule.error(chalk.red("Error:"), e.message);
    exit(1);
  }
}
