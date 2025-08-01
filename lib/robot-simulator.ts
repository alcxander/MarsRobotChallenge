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
  seed?: number // Add optional seed for deterministic behavior
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
export type TerrainType = "Fe" | "Se" | "W" | "Si" | "Zn" | "Obs" | "Sa"
export type Command = "F" | "B" | "L" | "R" | "S" | "E"

// Simple seeded random number generator for deterministic behavior
class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }
}

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

  private readonly sandDropProbability = 0.15 // 15% chance after each move
  private simulationLog: string[] = []
  private seededRandom: SeededRandom
  private moveCount = 0

  constructor(input: RobotInput) {
    this.position = { ...input.initialPosition.location }
    this.facing = input.initialPosition.facing as Direction
    this.battery = input.battery
    this.terrain = input.terrain.map((row) => [...row]) // Deep copy to avoid mutations
    this.visitedCells = [{ ...this.position }]
    this.samplesCollected = []

    // Use provided seed or generate one based on input for deterministic behavior
    const seed = input.seed || this.generateSeedFromInput(input)
    this.seededRandom = new SeededRandom(seed)
    this.simulationLog.push(`Simulation started with seed: ${seed}`)
  }

  private generateSeedFromInput(input: RobotInput): number {
    // Generate a consistent seed based on input data
    let hash = 0
    const str = JSON.stringify({
      terrain: input.terrain,
      battery: input.battery,
      commands: input.commands,
      initialPosition: input.initialPosition,
    })

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }

    return Math.abs(hash)
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
      this.terrain[pos.y][pos.x] !== "Obs" &&
      this.terrain[pos.y][pos.x] !== "Sa"
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
        if (!this.consumeBattery(3)) {
          this.simulationLog.push(`Insufficient battery for forward movement (need 3, have ${this.battery})`)
          return false
        }
        const nextPosF = this.getNextPosition(true)
        if (this.isValidPosition(nextPosF)) {
          this.position = nextPosF
          this.addVisitedCell(this.position)
          this.simulationLog.push(`Moved forward to (${this.position.x}, ${this.position.y})`)
          this.dropRandomSand()
          return true
        } else {
          this.simulationLog.push(`Forward movement blocked, attempting backoff strategy`)
          return this.executeBackoffStrategy()
        }

      case "B":
        if (!this.consumeBattery(3)) {
          this.simulationLog.push(`Insufficient battery for backward movement (need 3, have ${this.battery})`)
          return false
        }
        const nextPosB = this.getNextPosition(false)
        if (this.isValidPosition(nextPosB)) {
          this.position = nextPosB
          this.addVisitedCell(this.position)
          this.simulationLog.push(`Moved backward to (${this.position.x}, ${this.position.y})`)
          this.dropRandomSand()
          return true
        } else {
          this.simulationLog.push(`Backward movement blocked, attempting backoff strategy`)
          return this.executeBackoffStrategy()
        }

      case "L":
        if (!this.consumeBattery(2)) {
          this.simulationLog.push(`Insufficient battery for left turn (need 2, have ${this.battery})`)
          return false
        }
        this.turnLeft()
        this.simulationLog.push(`Turned left, now facing ${this.facing}`)
        return true

      case "R":
        if (!this.consumeBattery(2)) {
          this.simulationLog.push(`Insufficient battery for right turn (need 2, have ${this.battery})`)
          return false
        }
        this.turnRight()
        this.simulationLog.push(`Turned right, now facing ${this.facing}`)
        return true

      case "S":
        if (!this.consumeBattery(8)) {
          this.simulationLog.push(`Insufficient battery for sampling (need 8, have ${this.battery})`)
          return false
        }
        const currentTerrain = this.terrain[this.position.y][this.position.x]
        if (currentTerrain !== "Obs" && currentTerrain !== "Sa") {
          this.samplesCollected.push(currentTerrain)
          this.simulationLog.push(`Collected sample: ${currentTerrain}`)
        } else {
          this.simulationLog.push(`Cannot sample from ${currentTerrain}`)
        }
        return true

      case "E":
        if (!this.consumeBattery(1)) {
          this.simulationLog.push(`Insufficient battery for solar panels (need 1, have ${this.battery})`)
          return false
        }
        this.battery += 10
        this.simulationLog.push(`Extended solar panels, battery now: ${this.battery}`)
        return true

      default:
        this.simulationLog.push(`Unknown command: ${command}`)
        return false
    }
  }

  private executeBackoffStrategy(): boolean {
    this.simulationLog.push(`Executing backoff strategies...`)

    for (let i = 0; i < this.backoffStrategies.length; i++) {
      const strategy = this.backoffStrategies[i]
      const originalPosition = { ...this.position }
      const originalFacing = this.facing
      const originalBattery = this.battery
      const originalTerrain = this.terrain.map((row) => [...row])
      let strategySuccessful = true

      this.simulationLog.push(`Trying backoff strategy ${i + 1}: [${strategy.join(", ")}]`)

      for (const command of strategy) {
        if (!this.executeCommand(command)) {
          strategySuccessful = false
          break
        }
      }

      if (strategySuccessful) {
        this.simulationLog.push(`Backoff strategy ${i + 1} successful`)
        return true
      }

      // Restore state if strategy failed
      this.position = originalPosition
      this.facing = originalFacing
      this.battery = originalBattery
      this.terrain = originalTerrain
      this.simulationLog.push(`Backoff strategy ${i + 1} failed, restoring state`)
    }

    this.simulationLog.push(`All backoff strategies failed`)
    return false
  }

  private addVisitedCell(position: Position): void {
    const exists = this.visitedCells.some((cell) => cell.x === position.x && cell.y === position.y)
    if (!exists) {
      this.visitedCells.push({ ...position })
    }
  }

  public simulate(commands: Command[]): RobotOutput {
    this.simulationLog.push(`Starting simulation with ${commands.length} commands`)

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i]
      this.simulationLog.push(`Step ${i + 1}: Executing command '${command}' (Battery: ${this.battery})`)

      // Check if we can execute the command
      const requiredBattery = this.getRequiredBattery(command)

      // If we don't have enough battery but can extend solar panels, do it automatically
      if (this.battery < requiredBattery && this.battery >= 1) {
        this.simulationLog.push("Auto-extending solar panels due to low battery")
        this.executeCommand("E")
      }

      // Try to execute the command
      if (!this.executeCommand(command)) {
        this.simulationLog.push(`Simulation stopped at step ${i + 1} due to failed command execution`)
        break
      }
    }

    const result = {
      VisitedCells: this.visitedCells.map((cell) => ({ x: cell.x, y: cell.y })),
      SamplesCollected: [...this.samplesCollected],
      Battery: this.battery,
      FinalPosition: {
        Location: { x: this.position.x, y: this.position.y },
        Facing: this.facing,
      },
    }

    this.simulationLog.push(`Simulation completed. Final state: ${JSON.stringify(result)}`)
    return result
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

  private dropRandomSand(): void {
    this.moveCount++

    // Use seeded random for deterministic behavior
    if (this.seededRandom.next() < this.sandDropProbability) {
      const availablePositions: Position[] = []

      // Find all non-obstacle positions
      for (let y = 0; y < this.terrain.length; y++) {
        for (let x = 0; x < this.terrain[0].length; x++) {
          if (this.terrain[y][x] !== "Obs" && this.terrain[y][x] !== "Sa") {
            availablePositions.push({ x, y })
          }
        }
      }

      if (availablePositions.length > 0) {
        const randomIndex = Math.floor(this.seededRandom.next() * availablePositions.length)
        const sandPosition = availablePositions[randomIndex]
        this.terrain[sandPosition.y][sandPosition.x] = "Sa"
        this.simulationLog.push(`Sand dropped at (${sandPosition.x}, ${sandPosition.y}) after move ${this.moveCount}`)
      }
    }
  }

  public getSimulationLog(): string[] {
    return [...this.simulationLog]
  }

  public getCurrentTerrain(): string[][] {
    return this.terrain.map((row) => [...row])
  }

  public getStepState() {
    return {
      position: { ...this.position },
      facing: this.facing,
      battery: this.battery,
      terrain: this.terrain.map((row) => [...row]),
      visitedCells: this.visitedCells.map((cell) => ({ ...cell })),
      samplesCollected: [...this.samplesCollected],
      log: [...this.simulationLog],
    }
  }

  public restoreState(state: any) {
    this.position = { ...state.position }
    this.facing = state.facing
    this.battery = state.battery
    this.terrain = state.terrain.map((row: string[]) => [...row])
    this.visitedCells = state.visitedCells.map((cell: Position) => ({ ...cell }))
    this.samplesCollected = [...state.samplesCollected]
    this.simulationLog = [...state.log]
  }

  public executeStep(command: Command): boolean {
    const requiredBattery = this.getRequiredBattery(command)

    // If we don't have enough battery but can extend solar panels, do it automatically
    if (this.battery < requiredBattery && this.battery >= 1) {
      this.simulationLog.push("Auto-extending solar panels due to low battery")
      this.executeCommand("E")
    }

    // Try to execute the command
    const success = this.executeCommand(command)
    if (!success) {
      this.simulationLog.push(`Failed to execute command: ${command}`)
    }

    return success
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

  // Add timeout protection for large simulations
  const startTime = Date.now()
  const TIMEOUT_MS = 30000 // 30 seconds timeout

  const robot = new MarsRobot(input)

  // Check for timeout during simulation
  const originalExecuteCommand = robot["executeCommand"].bind(robot)
  robot["executeCommand"] = (command: Command) => {
    if (Date.now() - startTime > TIMEOUT_MS) {
      throw new Error("Simulation timeout: execution took too long")
    }
    return originalExecuteCommand(command)
  }

  return robot.simulate(input.commands as Command[])
}
