#!/usr/bin/env node

import fs from "fs/promises";
import { fileURLToPath } from "url";
import { basename } from "path";
//some other imports here i'm not thinking of

import { MarsRobot, simulateRobot } from "../dist/robot-simulator.js";
import chalk from "chalk";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pkg = require("../package.json");


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


async function main() {

  // break out args

  const args = process.argv.slice(2);

  //putting in a help tidbit as it just crossed my mind
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(usage);
    process.exit(0); // powershell is a bit weird about exiting with 1 so just putting to 0 for now
  }

  if (args.includes("--version") || args.includes("-v")) {
    console.log(chalk.blue(`marsRobot version: ${pkg.version}`));
    process.exit(0);
  }

  if (args.length !== 2) {
    // may change this in future to be a typed version of params,right now it's only accepting input + output
    console.error(chalk.red("Incorrect number of arguments"), " expected, see below usage:");
    console.log(usage);
    process.exit(0);
  }

  // process input data in arg
  const [inputPath, outputPath] = args;

  try {
    const inputJson = await fs.readFile(inputPath, "utf8");
    // doule check encoding being enforced is better than no encoding
    const input = JSON.parse(inputJson);

    // send to simulateRobot function
    const output = simulateRobot(input);
    console.log(chalk.cyan("Simulation complete. Output:"), output);

    // await result?

    await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
    console.log(chalk.green("Done. Output written to: "), chalk.bold(outputPath));

    // capture error?
  } catch (e) {
    console.error(chalk.red("Error:"), e.message);
    process.exit(1);
  }
  // exit/finish
}

if (basename(fileURLToPath(import.meta.url)) === basename(process.argv[1])) {
  main();
}
