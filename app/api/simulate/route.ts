import { type NextRequest, NextResponse } from "next/server"
import { simulateRobot, type RobotInput } from "@/lib/robot-simulator"

export async function POST(request: NextRequest) {
  try {
    const input: RobotInput = await request.json()
    const result = simulateRobot(input)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Simulation error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Simulation failed" }, { status: 400 })
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
