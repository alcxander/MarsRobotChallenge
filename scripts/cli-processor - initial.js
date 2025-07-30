#!/usr/bin/env node

const fs = require("fs").promises
const path = require("path")

// Import the simulation logic (in a real Node.js environment, you'd use proper imports)
// For this example, we'll include a simplified version of the robot logic

class MarsRobotCLI {
  constructor() {
    this.backoffStrategies = [
      ["E", "R", "F"],
      ["E", "L", "F"],
      ["E", "L", "L", "F"],
      ["E", "B", "R", "F"],
      ["E", "B", "B", "L", "F"],
      ["E", "F", "F"],
      ["E", "F", "L", "F", "L", "F"],
    ]
  }

  getDirectionVector(direction) {
    switch (direction) {
      case "North":
        return { x: 0, y: -1 }
      case "East":
        return { x: 1, y: 0 }
      case "South":
        return { x: 0, y: 1 }
      case "West":
        return { x: -1, y: 0 }
    }
  }

  turnLeft(facing) {
    const directions = ["North", "West", "South", "East"]
    const currentIndex = directions.indexOf(facing)
    return directions[(currentIndex + 1) % 4]
  }

  turnRight(facing) {
    const directions = ["North", "East", "South", "West"]
    const currentIndex = directions.indexOf(facing)
    return directions[(currentIndex + 1) % 4]
  }

  isValidPosition(pos, terrain) {
    return (
      pos.x >= 0 && pos.x < terrain[0].length && pos.y >= 0 && pos.y < terrain.length && terrain[pos.y][pos.x] !== "Obs"
    )
  }

  getNextPosition(position, facing, forward = true) {
    const vector = this.getDirectionVector(facing)
    const multiplier = forward ? 1 : -1
    return {
      x: position.x + vector.x * multiplier,
      y: position.y + vector.y * multiplier,
    }
  }

  simulate(input) {
    let position = { ...input.initialPosition.location }
    let facing = input.initialPosition.facing
    let battery = input.battery
    const visitedCells = [{ ...position }]
    const samplesCollected = []

    const addVisitedCell = (pos) => {
      const exists = visitedCells.some((cell) => cell.x === pos.x && cell.y === pos.y)
      if (!exists) {
        visitedCells.push({ ...pos })
      }
    }

    const consumeBattery = (amount) => {
      if (battery >= amount) {
        battery -= amount
        return true
      }
      return false
    }

    const executeCommand = (command) => {
      switch (command) {
        case "F":
          if (!consumeBattery(3)) return false
          const nextPosF = this.getNextPosition(position, facing, true)
          if (this.isValidPosition(nextPosF, input.terrain)) {
            position = nextPosF
            addVisitedCell(position)
            return true
          }
          return false

        case "B":
          if (!consumeBattery(3)) return false
          const nextPosB = this.getNextPosition(position, facing, false)
          if (this.isValidPosition(nextPosB, input.terrain)) {
            position = nextPosB
            addVisitedCell(position)
            return true
          }
          return false

        case "L":
          if (!consumeBattery(2)) return false
          facing = this.turnLeft(facing)
          return true

        case "R":
          if (!consumeBattery(2)) return false
          facing = this.turnRight(facing)
          return true

        case "S":
          if (!consumeBattery(8)) return false
          const currentTerrain = input.terrain[position.y][position.x]
          if (currentTerrain !== "Obs") {
            samplesCollected.push(currentTerrain)
          }
          return true

        case "E":
          if (!consumeBattery(1)) return false
          battery += 10
          return true

        default:
          return false
      }
    }

    for (const command of input.commands) {
      const requiredBattery = this.getRequiredBattery(command)

      if (battery < requiredBattery && battery >= 1) {
        executeCommand("E")
      }

      if (!executeCommand(command)) {
        break
      }
    }

    return {
      VisitedCells: visitedCells.map((cell) => ({ X: cell.x, Y: cell.y })),
      SamplesCollected: [...samplesCollected],
      Battery: battery,
      FinalPosition: {
        Location: { X: position.x, Y: position.y },
        Facing: facing,
      },
    }
  }

  getRequiredBattery(command) {
    switch (command) {
      case "F":
      case "B":
        return 3
      case "L":
      case "R":
        return 2
      case "S":
        return 8
      case "E":
        return 1
      default:
        return 0
    }
  }
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length !== 2) {
    console.error("Usage: node cli-processor.js <input.json> <output.json>")
    process.exit(1)
  }

  const [inputFile, outputFile] = args

  try {
    // Read input file
    const inputData = await fs.readFile(inputFile, "utf8")
    const input = JSON.parse(inputData)

    // Simulate robot
    const robot = new MarsRobotCLI()
    const result = robot.simulate(input)

    // Write output file
    await fs.writeFile(outputFile, JSON.stringify(result, null, 2))

    console.log(`Simulation completed successfully!`)
    console.log(`Input: ${inputFile}`)
    console.log(`Output: ${outputFile}`)
    console.log(`Battery remaining: ${result.Battery}`)
    console.log(`Samples collected: ${result.SamplesCollected.length}`)
    console.log(`Cells visited: ${result.VisitedCells.length}`)
  } catch (error) {
    console.error("Error:", error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { MarsRobotCLI }
