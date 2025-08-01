import { type NextRequest, NextResponse } from "next/server"
import { simulateRobot, type RobotInput } from "@/lib/robot-simulator"

export async function POST(request: NextRequest) {
  try {
    const input: RobotInput = await request.json()

    // Add request timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
    try {
      const result = simulateRobot(input)
      clearTimeout(timeoutId)
      return NextResponse.json(result)
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        return NextResponse.json(
          {
            error:
              "Simulation timeout: The input is too large or complex. Please try a smaller terrain or fewer commands.",
          },
          { status: 408 },
        )
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: "Simulation failed" }, { status: 500 })
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