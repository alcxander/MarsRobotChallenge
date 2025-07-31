#!/usr/bin/env node

//
// this function fulfills criteria of the instructions so long as the server is running
// however i'm not sure that's exactly what was wanted. So this section runs and serves
// if the server is running already, so:
// npm run dev
// node api-client.js input (will change this on bin command to be something better)
// receive output 
// --------------------------------------


import fs from "fs/promises";
import https from "https";
import http from "http";
import { fileURLToPath } from "url";
import { basename } from "path";

async function makeRequest(hostname, port, path, data, useHttps = false) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data)

    const options = {
      hostname,
      port,
      path,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    }

    const client = useHttps ? https : http
    const req = client.request(options, (res) => {
      let responseData = ""

      res.on("data", (chunk) => {
        responseData += chunk
      })

      res.on("end", () => {
        try {
          const result = JSON.parse(responseData)
          resolve({ statusCode: res.statusCode, data: result })
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${responseData}`))
        }
      })
    })

    req.on("error", (error) => {
      reject(error)
    })

    req.write(postData)
    req.end()
  })
}

function formatOutput(result) {
  console.log("\n=== MARS ROBOT SIMULATION RESULTS ===\n")

  console.log(`🔋 Battery Level: ${result.Battery} units`)
  console.log(
    `📍 Final Position: (${result.FinalPosition.Location.x}, ${result.FinalPosition.Location.y}) facing ${result.FinalPosition.Facing}`,
  )

  console.log(`\n🗺️  Visited Cells (${result.VisitedCells.length}):`)
  result.VisitedCells.forEach((cell, index) => {
    console.log(`   ${index + 1}. (${cell.x}, ${cell.y})`)
  })

  console.log(`\n🧪 Samples Collected (${result.SamplesCollected.length}):`)
  if (result.SamplesCollected.length > 0) {
    result.SamplesCollected.forEach((sample, index) => {
      console.log(`   ${index + 1}. ${sample}`)
    })
  } else {
    console.log("No samples collected")
  }

  console.log("\n=====================================\n")
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length !== 1) {
    console.error("Usage: node api-client.js <input.json>")
    console.error("Make sure the API server is running on localhost:3000")
    process.exit(1)
  }

  const [inputFile] = args

  try {
    // Read input file
    const inputData = await fs.readFile(inputFile, "utf8")
    const input = JSON.parse(inputData)

    console.log("Sending request to Mars Robot API...")
    console.log(`Input file: ${inputFile}`)

    // Make API request
    const response = await makeRequest("localhost", 3000, "/api/simulate", input, false)

    if (response.statusCode === 200) {
      formatOutput(response.data)
    } else {
      console.error("API Error:", response.data.error || "Unknown error")
      process.exit(1)
    }
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      console.error("Error: Could not connect to API server.")
      console.error("Make sure the server is running with: npm run dev")
    } else if (error.code === "ENOENT") {
      console.error(`Error: Input file '${inputFile}' not found.`)
    } else {
      console.error("Error:", error.message)
    }
    process.exit(1)
  }
}

//think ive been tripping myself up managing different types of setups here, just pushing all of them to esm

if (basename(fileURLToPath(import.meta.url)) === basename(process.argv[1])) {
  main();
}

export { makeRequest, formatOutput };