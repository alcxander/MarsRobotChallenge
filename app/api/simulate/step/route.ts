import { type NextRequest, NextResponse } from "next/server"
import { type RobotInput, MarsRobot } from "@/lib/robot-simulator"

//let's break this down.
// showing off how to implement stepped procedures in the API logic rather than in 
// the simulator logic

interface StepRequest extends RobotInput {
  step: number
  currentState?: any
  commandOverride?: string
}

interface StepResult {
  position : { x: number; y: number}
  facing: string
  battery: number
  terrain: string[][]
  visitedCells: { x:number; y:number}
  samplesCollected: string[]
  log: string[]
  completed: boolean
}

export async function POST(request: NextRequest) {
  try {
    const input: StepRequest = await request.json()

    if (input.step === 0) {
      // Initialize step mode
      const robot = new MarsRobot(input)
      const initialState = robot.getStepState()

      return NextResponse.json({
        position: initialState.position,
        facing: initialState.facing,
        battery: initialState.battery,
        terrain: initialState.terrain,
        visitedCells: initialState.visitedCells,
        samplesCollected: initialState.samplesCollected,
        log: initialState.log,
        completed: false,
      })
    } else {
      // Execute single step
      const robot = new MarsRobot(input)

      if (input.currentState) {
        robot.restoreState(input.currentState)
      }

      const command = input.commandOverride || input.commands[input.step - 1]
      const completed = !command || input.step > input.commands.length

      if (!completed && command) {
        robot.executeStep(command)
      }

      const stepState = robot.getStepState()

      return NextResponse.json({
        position: stepState.position,
        facing: stepState.facing,
        battery: stepState.battery,
        terrain: stepState.terrain,
        visitedCells: stepState.visitedCells,
        samplesCollected: stepState.samplesCollected,
        log: stepState.log,
        completed: completed || stepState.battery <= 0,
      })
    }
  } catch (error) {
    console.error("Step simulation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Step simulation failed" },
      { status: 400 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Mars Robot Simulator API",
    endpoints: {
      "POST /api/simulate": "Run robot simulation with JSON input",
    },
  })
}
