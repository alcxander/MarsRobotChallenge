"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Pause, RotateCcw, StepForward, Send } from "lucide-react"

interface Position {
  x: number
  y: number
}

interface InitialPosition {
  location: Position
  facing: string
}

interface RobotInput {
  terrain: string[][]
  battery: number
  commands: string[]
  initialPosition: InitialPosition
}

interface RobotOutput {
  VisitedCells: Position[]
  SamplesCollected: string[]
  Battery: number
  FinalPosition: {
    Location: Position
    Facing: string
  }
}

interface StepResult {
  position: Position
  facing: string
  battery: number
  terrain: string[][]
  visitedCells: Position[]
  samplesCollected: string[]
  log: string[]
  completed: boolean
}

export default function MarsRobotSimulator() {
  const [input, setInput] = useState(`{
  "terrain": [["Fe", "Fe", "Se"], ["W", "Si", "Obs"]],
  "battery": 50,
  "commands": ["F", "S", "R", "F"],
  "initialPosition": {
    "location": {"x": 0, "y": 0},
    "facing": "East"
  }
}`)
  const [output, setOutput] = useState<RobotOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Step-by-step mode state
  const [stepMode, setStepMode] = useState<"batch" | "step">("batch")
  const [stepResult, setStepResult] = useState<StepResult | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playInterval, setPlayInterval] = useState<NodeJS.Timeout | null>(null)
  const [manualCommand, setManualCommand] = useState<string>("")

  const generateRandomInput = () => {
    // Terrain types
    const terrainTypes = ["Fe", "Se", "W", "Si", "Zn", "Obs"]

    // Generate random terrain size (3x3 to 6x6)
    const width = Math.floor(Math.random() * 4) + 3 // 3-6
    const height = Math.floor(Math.random() * 4) + 3 // 3-6

    // Generate terrain grid
    const terrain: string[][] = []
    for (let y = 0; y < height; y++) {
      const row: string[] = []
      for (let x = 0; x < width; x++) {
        // Reduce obstacle probability to ensure navigable terrain
        const isObstacle = Math.random() < 0.15 // 15% chance of obstacle
        if (isObstacle) {
          row.push("Obs")
        } else {
          const randomTerrain = terrainTypes[Math.floor(Math.random() * (terrainTypes.length - 1))] // Exclude "Obs" from random selection
          row.push(randomTerrain)
        }
      }
      terrain.push(row)
    }

    // Generate random initial position (ensure it's not on an obstacle)
    let initialX: number, initialY: number
    do {
      initialX = Math.floor(Math.random() * width)
      initialY = Math.floor(Math.random() * height)
    } while (terrain[initialY][initialX] === "Obs")

    // Generate random facing direction
    const facingDirections = ["North", "East", "South", "West"]
    const facing = facingDirections[Math.floor(Math.random() * facingDirections.length)]

    // Generate random battery (10-999)
    const battery = Math.floor(Math.random() * 990) + 10

    // Generate random commands (3-12 commands)
    const commandTypes = ["F", "B", "L", "R", "S", "E"]
    const commandCount = Math.floor(Math.random() * 10) + 3 // 3-12 commands
    const commands: string[] = []

    for (let i = 0; i < commandCount; i++) {
      const randomCommand = commandTypes[Math.floor(Math.random() * commandTypes.length)]
      commands.push(randomCommand)
    }

    // Create the input object
    const randomInput = {
      terrain,
      battery,
      commands,
      initialPosition: {
        location: { x: initialX, y: initialY },
        facing,
      },
    }

    // Update the input textarea
    setInput(JSON.stringify(randomInput, null, 2))
  }

  // Add this useEffect after the state declarations
  useEffect(() => {
    return () => {
      if (playInterval) {
        clearInterval(playInterval)
      }
    }
  }, [playInterval])

  // Also add this useEffect to stop auto-play when simulation completes
  useEffect(() => {
    if (stepResult?.completed && isPlaying && playInterval) {
      clearInterval(playInterval)
      setPlayInterval(null)
      setIsPlaying(false)
    }
  }, [stepResult?.completed, isPlaying, playInterval])

  const handleSimulate = async () => {
    setLoading(true)
    setError(null)
    setOutput(null)

    try {
      const parsedInput: RobotInput = JSON.parse(input)

      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsedInput),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Simulation failed")
      }

      const result: RobotOutput = await response.json()
      console.log("Simulation result:", result) // Debug log
      setOutput(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const initializeStepMode = async () => {
    setError(null)
    setStepResult(null)
    setCurrentStep(0)

    try {
      const parsedInput: RobotInput = JSON.parse(input)

      const response = await fetch("/api/simulate/step", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...parsedInput, step: 0 }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Step initialization failed")
      }

      const result: StepResult = await response.json()
      setStepResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const executeStep = async (commandOverride?: string) => {
    if (!stepResult) return

    try {
      const parsedInput: RobotInput = JSON.parse(input)
      const command = commandOverride || parsedInput.commands[currentStep]

      if (!command && !commandOverride) {
        // No more commands, mark as completed
        if (playInterval) {
          clearInterval(playInterval)
          setPlayInterval(null)
          setIsPlaying(false)
        }
        return
      }

      const response = await fetch("/api/simulate/step", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...parsedInput,
          step: currentStep + 1,
          currentState: stepResult,
          commandOverride: commandOverride || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Step execution failed")
      }

      const result: StepResult = await response.json()
      setStepResult(result)
      setCurrentStep((prev) => prev + 1)
      setManualCommand("")

      // Check if simulation is completed and stop auto-play
      if (result.completed && playInterval) {
        clearInterval(playInterval)
        setPlayInterval(null)
        setIsPlaying(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      // Stop auto-play on error
      if (playInterval) {
        clearInterval(playInterval)
        setPlayInterval(null)
        setIsPlaying(false)
      }
    }
  }

  const toggleAutoPlay = () => {
    if (isPlaying) {
      if (playInterval) {
        clearInterval(playInterval)
        setPlayInterval(null)
      }
      setIsPlaying(false)
    } else {
      if (!stepResult || stepResult.completed) {
        return // Don't start if no step result or simulation is completed
      }

      setIsPlaying(true)
      const interval = setInterval(() => {
        // Use a callback to get the latest state
        setCurrentStep((currentStepValue) => {
          setStepResult((currentStepResult) => {
            if (!currentStepResult || currentStepResult.completed) {
              clearInterval(interval)
              setPlayInterval(null)
              setIsPlaying(false)
              return currentStepResult
            }

            try {
              const parsedInput: RobotInput = JSON.parse(input)
              const command = parsedInput.commands[currentStepValue]

              if (!command) {
                // No more commands, stop auto-play
                clearInterval(interval)
                setPlayInterval(null)
                setIsPlaying(false)
                return currentStepResult
              }

              // Execute the step asynchronously
              executeStepAsync(currentStepValue, currentStepResult, interval)
              return currentStepResult
            } catch (error) {
              console.error("Auto-play error:", error)
              clearInterval(interval)
              setPlayInterval(null)
              setIsPlaying(false)
              return currentStepResult
            }
          })
          return currentStepValue
        })
      }, 1500)
      setPlayInterval(interval)
    }
  }

  // Add this new async function after toggleAutoPlay
  const executeStepAsync = async (stepIndex: number, currentStepResult: StepResult, interval: NodeJS.Timeout) => {
    try {
      const parsedInput: RobotInput = JSON.parse(input)
      const command = parsedInput.commands[stepIndex]

      if (!command) {
        clearInterval(interval)
        setPlayInterval(null)
        setIsPlaying(false)
        return
      }

      const response = await fetch("/api/simulate/step", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...parsedInput,
          step: stepIndex + 1,
          currentState: currentStepResult,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Step execution failed")
      }

      const result: StepResult = await response.json()
      setStepResult(result)
      setCurrentStep(stepIndex + 1)

      // Check if simulation is completed and stop auto-play
      if (result.completed) {
        clearInterval(interval)
        setPlayInterval(null)
        setIsPlaying(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      clearInterval(interval)
      setPlayInterval(null)
      setIsPlaying(false)
    }
  }

  const resetStepMode = () => {
    if (playInterval) {
      clearInterval(playInterval)
      setPlayInterval(null)
    }
    setIsPlaying(false)
    initializeStepMode()
  }

  const sendManualCommand = () => {
    if (manualCommand.trim()) {
      executeStep(manualCommand.trim().toUpperCase())
    }
  }

  const renderTerrain = (terrain: string[][], visitedCells: Position[], currentPosition: Position, facing?: string) => {
    if (!terrain || terrain.length === 0) {
      return <p className="text-gray-500 text-sm">No terrain data available</p>
    }

    const maxCellsToShow = 20 // Increased limit
    const shouldTruncate = terrain.length > maxCellsToShow || terrain[0]?.length > maxCellsToShow

    if (shouldTruncate) {
      return (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Terrain too large to display ({terrain[0]?.length}x{terrain.length}). Showing summary:
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Terrain Size:</strong> {terrain[0]?.length} x {terrain.length}
            </div>
            <div>
              <strong>Total Cells:</strong> {terrain.length * (terrain[0]?.length || 0)}
            </div>
            <div>
              <strong>Robot Position:</strong> ({currentPosition.x}, {currentPosition.y})
            </div>
            <div>
              <strong>Robot Facing:</strong> {facing || "Unknown"}
            </div>
            <div>
              <strong>Visited Cells:</strong> {visitedCells.length}
            </div>
            <div>
              <strong>Path Preview:</strong>
              <div className="text-xs mt-1 max-h-20 overflow-y-auto bg-gray-100 p-1 rounded">
                {visitedCells.slice(0, 10).map((cell, i) => (
                  <span key={i} className="inline-block bg-blue-100 px-1 mr-1 mb-1 rounded">
                    ({cell.x},{cell.y})
                  </span>
                ))}
                {visitedCells.length > 10 && (
                  <span className="text-gray-500">...and {visitedCells.length - 10} more</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="max-w-full overflow-auto">
        <div
          className="grid gap-0.5 p-2 bg-gray-50 rounded-lg inline-block min-w-fit"
          style={{ gridTemplateColumns: `repeat(${terrain[0]?.length || 0}, minmax(0, 1fr))` }}
        >
          {terrain.map((row, y) =>
            row.map((cell, x) => {
              const isVisited = visitedCells.some((pos) => pos.x === x && pos.y === y)
              const isCurrent = currentPosition.x === x && currentPosition.y === y

              const getFacingIcon = () => {
                switch (facing) {
                  case "North":
                    return "↑"
                  case "East":
                    return "→"
                  case "South":
                    return "↓"
                  case "West":
                    return "←"
                  default:
                    return "🤖"
                }
              }

              return (
                <div
                  key={`${x}-${y}`}
                  className={`w-6 h-6 flex items-center justify-center text-xs font-bold border border-gray-300 ${
                    isCurrent
                      ? "bg-red-500 text-white border-red-600"
                      : isVisited
                        ? "bg-blue-200 border-blue-400 text-blue-800"
                        : cell === "Obs"
                          ? "bg-gray-800 text-white"
                          : cell === "Sa"
                            ? "bg-yellow-600 text-white"
                            : "bg-white"
                  }`}
                  title={`(${x},${y}): ${cell}${isCurrent ? ` - Robot facing ${facing}` : ""}${isVisited ? " - Visited" : ""}`}
                >
                  {isCurrent ? getFacingIcon() : cell === "Obs" ? "█" : cell === "Sa" ? "~" : cell}
                </div>
              )
            }),
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mars Robot Challenge Simulator</h1>
        <p className="text-gray-600">
          Simulate a Mars exploration robot navigating terrain, collecting samples, and managing battery life.
        </p>
      </div>

      <Tabs value={stepMode} onValueChange={(value) => setStepMode(value as "batch" | "step")} className="mb-6">
        <TabsList>
          <TabsTrigger value="batch">Batch Simulation</TabsTrigger>
          <TabsTrigger value="step">Step-by-Step Mode</TabsTrigger>
        </TabsList>

        <TabsContent value="batch">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Input Configuration</CardTitle>
                <CardDescription>Define the terrain, battery level, commands, and starting position</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 mb-2">
                  <Button onClick={generateRandomInput} variant="outline" className="flex-1 bg-transparent">
                    🎲 Generate Random Input
                  </Button>
                </div>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="Enter JSON input..."
                />
                <Button onClick={handleSimulate} disabled={loading} className="w-full">
                  {loading ? "Simulating..." : "Run Full Simulation"}
                </Button>
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Simulation Results</CardTitle>
                <CardDescription>Robot movement path, samples collected, and final state</CardDescription>
              </CardHeader>
              <CardContent>
                {output ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Battery Level</h4>
                        <Badge variant={output.Battery > 20 ? "default" : "destructive"}>{output.Battery} units</Badge>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Final Position</h4>
                        <p className="text-sm">
                          ({output.FinalPosition?.Location?.x ?? output.FinalPosition?.Location?.x ?? "N/A"},{" "}
                          {output.FinalPosition?.Location?.y ?? output.FinalPosition?.Location?.y ?? "N/A"}) facing{" "}
                          {output.FinalPosition?.Facing ?? "Unknown"}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2">Samples Collected ({output.SamplesCollected?.length || 0})</h4>
                      <div className="flex flex-wrap gap-2">
                        {output.SamplesCollected && output.SamplesCollected.length > 0 ? (
                          output.SamplesCollected.map((sample, index) => (
                            <Badge key={index} variant="secondary">
                              {sample}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm">No samples collected</p>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2">Visited Cells ({output.VisitedCells?.length || 0})</h4>
                      <div className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-xs">
                        {output.VisitedCells && output.VisitedCells.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {output.VisitedCells.map((cell, index) => (
                              <span key={index} className="bg-blue-100 px-1 rounded">
                                ({cell.x ?? cell.x}, {cell.y ?? cell.y})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">No cells visited</p>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2">Terrain Visualization</h4>
                      {(() => {
                        try {
                          const parsedInput: RobotInput = JSON.parse(input)
                          // Convert API response format (X,Y) to internal format (x,y)
                          const visitedCells = (output.VisitedCells || []).map((cell) => ({
                            x: cell.x ?? cell.x ?? 0,
                            y: cell.y ?? cell.y ?? 0,
                          }))
                          const finalPosition = {
                            x: output.FinalPosition?.Location?.x ?? output.FinalPosition?.Location?.x ?? 0,
                            y: output.FinalPosition?.Location?.y ?? output.FinalPosition?.Location?.y ?? 0,
                          }
                          return renderTerrain(
                            parsedInput.terrain,
                            visitedCells,
                            finalPosition,
                            output.FinalPosition?.Facing,
                          )
                        } catch {
                          return <p className="text-gray-500 text-sm">Unable to render terrain</p>
                        }
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Run a simulation to see results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="step">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Step Controls</CardTitle>
                <CardDescription>Control the robot step by step</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 mb-2">
                  <Button onClick={generateRandomInput} variant="outline" className="w-full bg-transparent">
                    🎲 Generate Random Input
                  </Button>
                </div>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  placeholder="Enter JSON input..."
                />

                <div className="flex gap-2">
                  <Button onClick={initializeStepMode} variant="outline" className="flex-1 bg-transparent">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Initialize
                  </Button>
                  <Button onClick={toggleAutoPlay} disabled={!stepResult} className="flex-1">
                    {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    {isPlaying ? "Pause" : "Auto Play"}
                  </Button>
                </div>

                <Button onClick={() => executeStep()} disabled={!stepResult || stepResult.completed} className="w-full">
                  <StepForward className="w-4 h-4 mr-2" />
                  Execute Next Step
                </Button>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="manual-command">Manual Command</Label>
                  <div className="flex gap-2">
                    <Select value={manualCommand} onValueChange={setManualCommand}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select command" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="F">F - Move Forward</SelectItem>
                        <SelectItem value="B">B - Move Backward</SelectItem>
                        <SelectItem value="L">L - Turn Left</SelectItem>
                        <SelectItem value="R">R - Turn Right</SelectItem>
                        <SelectItem value="S">S - Take Sample</SelectItem>
                        <SelectItem value="E">E - Extend Solar Panels</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={sendManualCommand} disabled={!stepResult || !manualCommand}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current State</CardTitle>
                <CardDescription>Real-time robot status</CardDescription>
              </CardHeader>
              <CardContent>
                {stepResult ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Step</h4>
                        <Badge>{currentStep}</Badge>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Battery</h4>
                        <Badge variant={stepResult.battery > 20 ? "default" : "destructive"}>
                          {stepResult.battery} units
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Position & Facing</h4>
                      <p className="text-sm">
                        ({stepResult.position.x}, {stepResult.position.y}) facing {stepResult.facing}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Samples Collected</h4>
                      <div className="flex flex-wrap gap-2">
                        {stepResult.samplesCollected.length > 0 ? (
                          stepResult.samplesCollected.map((sample, index) => (
                            <Badge key={index} variant="secondary">
                              {sample}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm">No samples collected</p>
                        )}
                      </div>
                    </div>

                    {stepResult.completed && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-green-700 text-sm font-semibold">Simulation Complete!</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Initialize step mode to begin</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Live Terrain</CardTitle>
                <CardDescription>Real-time terrain with sand drops</CardDescription>
              </CardHeader>
              <CardContent>
                {stepResult ? (
                  <div className="space-y-4">
                    {renderTerrain(stepResult.terrain, stepResult.visitedCells, stepResult.position, stepResult.facing)}

                    <div>
                      <h4 className="font-semibold mb-2">Activity Log</h4>
                      <div className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-xs space-y-1">
                        {stepResult.log.slice(-5).map((entry, index) => (
                          <div key={index} className="text-gray-700">
                            {entry}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Initialize to see live terrain</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Command Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Robot Commands</h4>
              <ul className="space-y-1 text-sm">
                <li>
                  <strong>F</strong> - Move Forward (3 battery)
                </li>
                <li>
                  <strong>B</strong> - Move Backward (3 battery)
                </li>
                <li>
                  <strong>L</strong> - Turn Left (2 battery)
                </li>
                <li>
                  <strong>R</strong> - Turn Right (2 battery)
                </li>
                <li>
                  <strong>S</strong> - Take Sample (8 battery)
                </li>
                <li>
                  <strong>E</strong> - Extend Solar Panels (1 battery, +10 charge)
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Terrain Types</h4>
              <ul className="space-y-1 text-sm">
                <li>
                  <strong>Fe</strong> - Iron deposit
                </li>
                <li>
                  <strong>Se</strong> - Selenium deposit
                </li>
                <li>
                  <strong>W</strong> - Water deposit
                </li>
                <li>
                  <strong>Si</strong> - Silicon deposit
                </li>
                <li>
                  <strong>Zn</strong> - Zinc deposit
                </li>
                <li>
                  <strong>Obs</strong> - Obstacle (impassable)
                </li>
                <li>
                  <strong>Sa</strong> - Sand obstacle (randomly appears)
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}