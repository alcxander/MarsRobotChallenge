#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";

//some imports here i'm not thinking of

import { simulateRobot } from "../lib/robot-simulator";

async function main() { 
    // break out args
    const args = process.argv.slice(2)
    if (args.length !== 2){
        // may change this in future to be a typed version of params,right now it's only accepting input + output
        console.error("Usage: marsRobotCli.js <input.json> <output.json>");
        process.exit(1);
    };

    // process input data in arg
    const [inputPath, outputPath] = args
    
    try{
        const inputJson = await fs.readFile(inputPath, "utf8")
        // doule check encoding being enforced is better than no encoding
        const input = JSON.parse(inputJson);

        // send to simulateRobot function
        const output = simulateRobot(input);

        // await result?

        await fs.writeFile(outputPath, JSON.stringify(output, null, 2));

        console.log("None.")

        // capture error?
    }catch (e){
        console.error("Error:", e.message);
        process.exit(1);
    }
    // exit/finish
}

if (process.argv[1] === new URL(import.meta.url).pathname){
    main();
}