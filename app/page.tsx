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
  //sample provided in doc
  const [input, setInput] = useState(`{
  "terrain": [
    ["Fe", "Si", "Zn", "Fe", "Se", "Fe", "W", "Si", "Zn", "Fe", "Zn"],
    ["W", "Zn", "Fe", "Se", "Si", "Fe", "Zn", "Fe", "W", "Se", "Zn"],
    ["Si", "Fe", "Fe", "Zn", "W", "Se", "Si", "Fe", "Zn", "Fe", "Zn"],
    ["Zn", "Si", "Fe", "W", "Fe", "Zn", "Se", "Fe", "Si", "W", "Zn"],
    ["Fe", "Fe", "Se", "Zn", "W", "Si", "Fe", "Zn", "Fe", "Se", "Zn"],
    ["W", "Si", "Zn", "Fe", "Se", "Fe", "W", "Si", "Zn", "Fe", "Zn"],
    ["Se", "Zn", "Fe", "W", "Fe", "Si", "Zn", "Fe", "Se", "Fe", "Zn"],
    ["Obs", "Obs", "Si", "Obs", "W", "Obs", "Obs", "Obs", "Si", "Obs", "Obs"],
    ["Fe", "Zn", "W", "Si", "Fe", "Se", "Zn", "Fe", "W", "Si", "Zn"],
    ["Si", "Fe", "Fe", "Zn", "Se", "W", "Si", "Fe", "Fe", "Zn", "Zn"]
  ],
  "battery": 5000,
  "commands": ["F","F","R","F","F","F","F","F","F","R","F","F","R","F","F","F","F","F","R","R","F","F","F","F","F","L","F","F","R","F","F","L","F","F","L","F","F","F","F","F","F","F","F","R","F","F","R","F","F","R","F","F","L","F","F","L","F","F","R","F","F","R","F","F","L","F","F","L","F","F","F","F","L","F","F", "R","F","F","L","F","F","F","L","F","F","R","F","F","F","R","F","F"],
  "initialPosition": {
    "location": { "x": 0, "y": 0 },
    "facing": "East"
  }
}`)

  //let's use state to map things out on the front end
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

  useEffect(() => {
    return () => {
      if (playInterval) {
        clearInterval(playInterval)
      }
    }
  }, [playInterval])

  // stop auto-play when simulation completes
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

      const count = parsedInput.commands.filter(
        cmd => cmd === 'S'
      ).length;

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
      setOutput(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const initializeStepMode = async () => {
    //todo put in fallback
    setError(null)
    setStepResult(null)
    setCurrentStep(0)

    try {
      //todo put better handler in
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
        // set interval values to complete the steps
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

      // putting another guard here for checking the auto run
      if (result.completed && playInterval) {
        clearInterval(playInterval)
        setPlayInterval(null)
        setIsPlaying(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")

      //edge case to auto play on error
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

  // classic ai issues, leaving this in as an observation that sometimes AI gives you things it ends up not using which requires vigilance
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
    return (
      <div className="grid gap-1 p-4 bg-gray-50 rounded-lg">
        {terrain.map((row, y) => (
          <div key={y} className="flex gap-1">
            {row.map((cell, x) => {
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
                  className={`w-12 h-12 flex items-center justify-center text-xs font-bold border rounded ${
                    isCurrent
                      ? "bg-red-500 text-white" //remove final position logic and just default the behaviour to this instead, final can now mean middle of execution
                      : isVisited
                        ? "bg-blue-200 border-blue-400"
                        : cell === "Obs"
                          ? "bg-gray-800 text-white"
                          : cell === "Sa"
                            ? "bg-yellow-600 text-white"
                            : "bg-white border-gray-300"
                  }`}
                >
                  {isCurrent ? getFacingIcon() : cell}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-8xl">
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
                          ({output.FinalPosition.Location.x}, {output.FinalPosition.Location.y}) facing{" "}
                          {output.FinalPosition.Facing}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2">Samples Collected</h4>
                      <div className="flex flex-wrap gap-2">
                        {output.SamplesCollected.length > 0 ? (
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
                      <h4 className="font-semibold mb-2">Terrain Visualization</h4>
                      {(() => {
                        try {
                          const parsedInput: RobotInput = JSON.parse(input)
                          return renderTerrain(parsedInput.terrain, output.VisitedCells, output.FinalPosition.Location)
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
                  <div className="space-y-4 overflow-x-auto">
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
