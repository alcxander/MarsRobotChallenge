#!/usr/bin/env node
import { fileURLToPath } from "url";
import { basename } from "path";
import { runCli } from "./marsRobotCLILogic.js";

if (basename(fileURLToPath(import.meta.url)) === basename(process.argv[1])) {
  runCli(process.argv);
}