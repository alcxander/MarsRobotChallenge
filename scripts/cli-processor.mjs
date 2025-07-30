#!/usr/bin/env node

import fs from "fs/promises";
import { fileURLToPath } from 'url';
import { basename } from 'path';
//some other imports here i'm not thinking of

import { MarsRobot, simulateRobot } from "../lib/robot-simulator.js";

async function main() { 
    // break out args
    console.log("1")
    const args = process.argv.slice(2)
    if (args.length !== 2){
        // may change this in future to be a typed version of params,right now it's only accepting input + output
        console.error("Usage: marsRobotCli.js <input.json> <output.json>");
        process.exit(1);
    };
console.log("2")
    // process input data in arg
    const [inputPath, outputPath] = args
    
    try{
        const inputJson = await fs.readFile(inputPath, "utf8")
        // doule check encoding being enforced is better than no encoding
        const input = JSON.parse(inputJson);

        console.log("3")

        // send to simulateRobot function
        const output = simulateRobot(input);
        console.log("Simulation complete. Output:", output);

        
        // await result?

        await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
        console.log("Done.")
        

        // capture error?
    }catch (e){
        console.error("Error:", e.message);
        process.exit(1);
    }
    // exit/finish
}

if (basename(fileURLToPath(import.meta.url)) === basename(process.argv[1])){
    main();
}

