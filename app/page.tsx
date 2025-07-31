"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

//how many interfaces do I need, position?, robot in/out, 
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

  const [commandInputCount, setcommandInputCount] = useState<number>(0);
  
  const handleSimulate = async () => {
    setLoading(true)
    setError(null)
    setOutput(null)

    try {
      const parsedInput: RobotInput = JSON.parse(input)
      const count = parsedInput.commands.filter(
        cmd => cmd === 'S'
      ).length;
      setcommandInputCount(count);

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

  const renderTerrain = (terrain: string[][], visitedCells: Position[], finalPosition: Position) => {
    return (
      <div className="grid gap-1 p-4 bg-gray-50 rounded-lg">
        {terrain.map((row, y) => (
          <div key={y} className="flex gap-1 items-center justify-center">
            {row.map((cell, x) => {
              const isVisited = visitedCells.some((pos) => pos.x === x && pos.y === y)
              const isFinal = finalPosition.x === x && finalPosition.y === y
              //TODO: finalposition not getting logged here correctly, they're NaN, also this renders twice.
              //durr this is dev and strict mode is on. 
              //console.log(x +":"+y)
              return (
                <div
                  key={`${x}-${y}`}
                  className={`w-12 h-12 flex items-center justify-center text-xs font-bold border rounded ${
                    isFinal
                      ? "bg-red-500 text-white"
                      : isVisited
                        ? "bg-blue-200 border-blue-400"
                        : cell === "Obs"
                          ? "bg-gray-800 text-white"
                          : "bg-white border-gray-300"
                  }`}
                >
                  {isFinal ? "🤖" : cell}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  //not a fan of how final position is being displayed currently so going to refactor that to present something nicer 
  // and then will backtrack to find root cause of NaN
  // const finalPosition = () => {
  //   const finalPosition = output?.FinalPosition?.Location
  //   if (!finalPosition || typeof finalPosition.x !== 'number' || typeof finalPosition.y !== 'number'){
  //     return <p className="text-gray-800">Unable to render final co-ordinates</p>
  //   }
  //   return null;
  // };
  // ended up not using this, this was silly approach just do it in line

  return (
    <div className="container mx-auto p-6 max-w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mars Robot Challenge Simulator</h1>
        <p className="text-gray-600">
          Simulate a Mars exploration robot navigating terrain, collecting samples, and managing battery life.
        </p>
      </div>

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
              {loading ? "Simulating..." : "Run Simulation"}
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
                      {typeof output.FinalPosition?.Location?.x === 'number' && typeof output.FinalPosition.Location.y === 'number'
                       ?`(${output.FinalPosition.Location.x}, ${output.FinalPosition.Location.y})`
                       : 'unable to display final co-ordinates'}                     
                       <strong>
                        {" "}facing{" "}
                       </strong>
                      {output.FinalPosition.Facing}
                    </p>
                  </div>
                </div>

                <Separator />
                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <h4 className="font-semibold mb-2">Count of Samples Target Number {commandInputCount}</h4>
                    <div className="flex flex-wrap gap-2">
                      { commandInputCount === output.SamplesCollected.length 
                      ? (<p className="text-green-600 text-sm">Samples collected match</p>)
                       : (
                        <p className="text-red-500 text-sm">Samples collected mismatch</p>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">Visited Cells</h4>
                  <div className="flex flex-wrap gap-2">
                    {output.VisitedCells.map((cell, index) => (
                      <Badge key={index} variant="outline">
                        ({cell.x}, {cell.y})
                      </Badge>
                    ))}
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Command Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Backouts on Obstacles</h4>
              <ul className="space-y-1 text-sm">
                <li>
                  <strong>E R F</strong> - 1 
                </li>
                <li>
                  <strong>E L F</strong> - 2
                </li>
                <li>
                  <strong>E L L F</strong> - 3 this works but ideally L L F could be replaced with 'B' for battery save of 4 units
                </li>
                <li>
                  <strong>E B R F</strong> - 4
                </li>
                <li>
                  <strong>E B B L F</strong> - 5
                </li>
                <li>
                  <strong>E F F</strong> - 6 this does not work but has been kept in from exercise example. recharge, forwards twice does get around an obstacle which is only known once you end a step facing it.
                </li>
                <li>
                  <strong>E F L F L F</strong> - 7 - this works but only when you get to the second step of the sequence otherwise it's forcing the engine to figure out another obstacle choice
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
