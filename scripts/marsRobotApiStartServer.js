#!/usr/bin/env node

import { server, PORT } from './marsRobotApi.js';
import chalk from "chalk";

server.listen(PORT, () => {
  console.log(chalk.green(`🚀 MarsRobot API server running on http://localhost:${PORT}`));
  console.log("Test this out with Postman or similar or curl at the endpoint.");
  console.log(chalk.yellow("Sample CURL Command for Windows") + " works well if you run in same folder otherwise update the sampleinput json path fully if running elsewhere.");
  console.log("curl.exe -X POST http://localhost:3000/api/simulate -H \"Content-Type: application/json\" -d @sample-input.json | ConvertFrom-Json | ConvertTo-Json -Depth 10");
});
