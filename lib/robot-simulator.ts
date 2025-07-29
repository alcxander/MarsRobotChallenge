export interface Position {
  x: number
  y: number
}

export interface InitialPosition {
  location: Position
  facing: string
}

export interface RobotInput {
  terrain: string[][]
  battery: number
  commands: string[]
  initialPosition: InitialPosition
}

export interface RobotOutput {
  VisitedCells: Position[]
  SamplesCollected: string[]
  Battery: number
  FinalPosition: {
    Location: Position
    Facing: string
  }
}

export type Direction = "North" | "East" | "South" | "West"
export type TerrainType = "Fe" | "Se" | "W" | "Si" | "Zn" | "Obs"
export type Command = "F" | "B" | "L" | "R" | "S" | "E"

export class MarsRobot {
  private position: Position
  private facing: Direction
  private battery: number
  private terrain: string[][]
  private visitedCells: Position[]
  private samplesCollected: string[]
  private readonly backoffStrategies: Command[][] = [
    ["E", "R", "F"],
    ["E", "L", "F"],
    ["E", "L", "L", "F"],
    ["E", "B", "R", "F"],
    ["E", "B", "B", "L", "F"],
    ["E", "F", "F"],
    ["E", "F", "L", "F", "L", "F"],
  ]

  constructor(input: RobotInput) {
    this.position = { ...input.initialPosition.location }
    this.facing = input.initialPosition.facing as Direction
    this.battery = input.battery
    this.terrain = input.terrain
    this.visitedCells = [{ ...this.position }]
    this.samplesCollected = []
  }

  private getDirectionVector(direction: Direction): Position {
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

  private turnLeft(): void {
    const directions: Direction[] = ["North", "West", "South", "East"]
    const currentIndex = directions.indexOf(this.facing)
    this.facing = directions[(currentIndex + 1) % 4]
  }

  private turnRight(): void {
    const directions: Direction[] = ["North", "East", "South", "West"]
    const currentIndex = directions.indexOf(this.facing)
    this.facing = directions[(currentIndex + 1) % 4]
  }

  private isValidPosition(pos: Position): boolean {
    return (
      pos.x >= 0 &&
      pos.x < this.terrain[0].length &&
      pos.y >= 0 &&
      pos.y < this.terrain.length &&
      this.terrain[pos.y][pos.x] !== "Obs"
    )
  }

  private getNextPosition(forward = true): Position {
    const vector = this.getDirectionVector(this.facing)
    const multiplier = forward ? 1 : -1
    return {
      x: this.position.x + vector.x * multiplier,
      y: this.position.y + vector.y * multiplier,
    }
  }

  private consumeBattery(amount: number): boolean {
    if (this.battery >= amount) {
      this.battery -= amount
      return true
    }
    return false
  }

  private executeCommand(command: Command): boolean {
    switch (command) {
      case "F":
        if (!this.consumeBattery(3)) return false
        const nextPosF = this.getNextPosition(true)
        if (this.isValidPosition(nextPosF)) {
          this.position = nextPosF
          this.addVisitedCell(this.position)
          return true
        } else {
          return this.executeBackoffStrategy()
        }

      case "B":
        if (!this.consumeBattery(3)) return false
        const nextPosB = this.getNextPosition(false)
        if (this.isValidPosition(nextPosB)) {
          this.position = nextPosB
          this.addVisitedCell(this.position)
          return true
        } else {
          return this.executeBackoffStrategy()
        }

      case "L":
        if (!this.consumeBattery(2)) return false
        this.turnLeft()
        return true

      case "R":
        if (!this.consumeBattery(2)) return false
        this.turnRight()
        return true

      case "S":
        if (!this.consumeBattery(8)) return false
        const currentTerrain = this.terrain[this.position.y][this.position.x]
        if (currentTerrain !== "Obs") {
          this.samplesCollected.push(currentTerrain)
        }
        return true

      case "E":
        if (!this.consumeBattery(1)) return false
        this.battery += 10
        return true

      default:
        return false
    }
  }

  private executeBackoffStrategy(): boolean {
    for (const strategy of this.backoffStrategies) {
      const originalPosition = { ...this.position }
      const originalFacing = this.facing
      const originalBattery = this.battery
      let strategySuccessful = true

      for (const command of strategy) {
        if (!this.executeCommand(command)) {
          strategySuccessful = false
          break
        }
      }

      if (strategySuccessful) {
        return true
      }

      // Restore state if strategy failed
      this.position = originalPosition
      this.facing = originalFacing
      this.battery = originalBattery
    }

    return false
  }

  private addVisitedCell(position: Position): void {
    const exists = this.visitedCells.some((cell) => cell.x === position.x && cell.y === position.y)
    if (!exists) {
      this.visitedCells.push({ ...position })
    }
  }

  public simulate(commands: Command[]): RobotOutput {
    for (const command of commands) {
      // Check if we can execute the command
      const requiredBattery = this.getRequiredBattery(command)

      // If we don't have enough battery but can extend solar panels, do it automatically
      if (this.battery < requiredBattery && this.battery >= 1) {
        this.executeCommand("E")
      }

      // Try to execute the command
      if (!this.executeCommand(command)) {
        // If we still can't execute, stop simulation
        break
      }
    }

    return {
      VisitedCells: this.visitedCells.map((cell) => ({ X: cell.x, Y: cell.y })),
      SamplesCollected: [...this.samplesCollected],
      Battery: this.battery,
      FinalPosition: {
        Location: { X: this.position.x, Y: this.position.y },
        Facing: this.facing,
      },
    }
  }

  private getRequiredBattery(command: Command): number {
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

export function simulateRobot(input: RobotInput): RobotOutput {
  // Validate input
  if (!input.terrain || !Array.isArray(input.terrain) || input.terrain.length === 0) {
    throw new Error("Invalid terrain: must be a non-empty 2D array")
  }

  if (!input.terrain.every((row) => Array.isArray(row) && row.length === input.terrain[0].length)) {
    throw new Error("Invalid terrain: all rows must have the same length")
  }

  if (typeof input.battery !== "number" || input.battery < 0) {
    throw new Error("Invalid battery: must be a non-negative number")
  }

  if (!Array.isArray(input.commands)) {
    throw new Error("Invalid commands: must be an array")
  }

  const validCommands = ["F", "B", "L", "R", "S", "E"]
  if (!input.commands.every((cmd) => validCommands.includes(cmd))) {
    throw new Error("Invalid commands: must contain only F, B, L, R, S, E")
  }

  if (!input.initialPosition || !input.initialPosition.location) {
    throw new Error("Invalid initial position")
  }

  const { x, y } = input.initialPosition.location
  if (x < 0 || x >= input.terrain[0].length || y < 0 || y >= input.terrain.length) {
    throw new Error("Initial position is outside terrain boundaries")
  }

  if (input.terrain[y][x] === "Obs") {
    throw new Error("Initial position cannot be on an obstacle")
  }

  const validDirections = ["North", "East", "South", "West"]
  if (!validDirections.includes(input.initialPosition.facing)) {
    throw new Error("Invalid facing direction: must be North, East, South, or West")
  }

  const robot = new MarsRobot(input)
  return robot.simulate(input.commands as Command[])
}
