#!/usr/bin/env node


//**
// so to distinguish this from the other API client, this code does not need the server running first, this creates its
// own server that serves the code at /api/simulate. It gives some feedback to the user on startup and is then otherwise
// usable in another terminal/tool in the normal way to contact at. I have wrote some protections in for 200/400 as 
// standards but otherwise I expect the simulator to do alot of the lifting for when something is not correct with the 
// inbound payload. 
// Author Dexter*/

import http from 'http';
import { simulateRobot } from '../dist/robot-simulator.js';
import chalk from "chalk";

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/simulate') {
    let body = '';

    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const input = JSON.parse(body);
        const output = simulateRobot(input);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(output));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen(PORT, () => {
  console.log(chalk.green(`🚀 MarsRobot API server running on http://localhost:${PORT}`));
  console.log("Test this out with Postman or similar or curl at the endpoint. ")
  console.log(chalk.yellow("Sample CURL Command for Windows") + " works well if you run in same folder otherwise update the sampleinput json path fully if running elsewhere. ")
  console.log("curl.exe -X POST http://localhost:3000/api/simulate -H \"Content-Type: application/json\" -d @sample-input.json | ConvertFrom-Json | ConvertTo-Json -Depth 10"
)
});
