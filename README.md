# MarsRobotChallenge
code challenge to be built as part of interview process


Implementation Requirements
• Console application in your chosen language
• Same simulation logic across all execution modes
• Proper error handling for invalid inputs and network failures
• Clean separation between robot logic and interface layers

# Submission Requirements
☐ Working solution meeting all requirements
☐ All three execution modes functional
☐ Test suite covering functionality
☐ README with setup instructions
☐ Clean Git repository with meaningful commit messages, logical commit structure, and proper
.gitignore
☐ Brief notes on AI tool usage: which tools you used for what tasks, and examples of how you
reviewed, modified, or improved AI-generated output (if applicable)

# Optional Extensions
These extensions are intentionally open-ended to encourage AI tool usage for rapid prototyping and
implementation.

# Robot Visualization
Create a simple web-based visualization showing robot movement on the terrain. A basic 2D topdown view is sufficient - showing the grid, robot position, path taken, and samples collected. Use
any web technology you prefer (HTML5 Canvas, SVG, React, etc.).

# Interactive CLI Visualization
Create an interactive CLI interface where you can input commands and see the updated terrain and
robot state. A basic text-based display is sufficient - showing the terrain grid as ASCII characters,
robot position and facing direction, and current battery/samples. Use any CLI library or framework
available in your chosen language.

# Pathfinding Intelligence
Create a pathfinding system that analyzes terrain and generates optimal command sequences for
the robot. Consider battery constraints, obstacle avoidance, and mission objectives. Implement
algorithms for:
- Exploring the entire map and collecting samples of each terrain type
- Navigating from any point A to point B efficiently
Use any approach you prefer (A*, Dijkstra, custom algorithms, etc.). The system should integrate
with your existing robot simulation.



---------------------------------------------------------------


### Testing REST API with curl

run dev i.e. npm run dev

have a json in the local folder named sample-input.json

```
curl.exe -X POST http://localhost:3000/api/simulate -H "Content-Type: application/json" -d @sample-input.json | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

also added to scripts so you can run 

'npm run marsBot1' 

In the terminal. It's currently set to 'sample-input.json' only though sorry. 



![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/alcxander/MarsRobotChallenge?utm_source=oss&utm_medium=github&utm_campaign=alcxander%2FMarsRobotChallenge&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)


---------------------------------------------------------------

resources to consider

storage is no real quick challenge, maybe schema it out so it can be reviesd later, likely going to use prisma or similar if I go typescript. Could use noSQL either. Not sure what I need to define.

Some assumptions, whole thing runs locally, need to trim need for env keys, avoid passing keys from machine to machine. mayb eneed to revisit what storage tech is used. Would like to do something that is easy peasy to enable for another user on another machine. 

Let's set up a database with latest transactions/actions for the robot. Worried about latest state action on the bot and what steps it's taken but I don't want to get caught up managing some global state parameters for the bots steps that the CLI needs special actions for. Maybe we build the table with a session ID to tackle steps, so we have seeded database with maps it can pull from, then when we 'start' a session we pick a tseeded table at random, a start location, then apply the sequence of steps to solve the challenge but we create a session to store this against and ID it on the screen somewhere and in the output for the CLI. if we have a session we can map the routes to the session, and as steps are taken we can hold that as the last state of the bot to pull down. maybe we can push completed steps to a history table for reference to recall. if a session is incomplete we can mark it as incompleted or end step is listed as the last step they took when archived.


what components am I going to need here:

robot class/thing (facing, battery, samples collected, visited cells(should this be robot or terrain or a separate object for history), )
terrain thing (cell, contents, positioning)
commands (processes the actual requests for the robot when doing things like, sequences of commands and handles the logic of what to do when you hit an obstacle or a resource etc.)
a service of some sort to orchestrate these together into a 'function'

need to keep these separate from other things so these are reusable in the API and REST services

cli layer (never built one of these before)
rest api (this comes from page layouts really, should be self done by projce structure)
rest client (takes in the json posts to API shows result, likely be connected to the front end somewhere)

that's the communication layer

visualising and maps

likely going to exist in the app alongside the pages with a simple visualisation page. need some way to cordon off sessions

don't forget! 
battery costs, is that it's own typing on the move sets that can be peformed?
back of fstrategies, put in a 1 check sum at the start of every maneuver. also a 0 check as well to give up why not
terrain seeding strategies
json linter for examples provided, need to extend them to include session IDs,
unit tests - code rabbit for this. Need something to know the cli works



CLI works after publishing and installing the project 
PS C:\Users\Dextosterone\git\MarsRobotChallenge> marsRobot sample-input.json output.json
Simulation complete. Output: {
  VisitedCells: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 1, y: 2 },
    { x: 2, y: 2 }
  ],
  SamplesCollected: [ 'Fe', 'Si' ],
  Battery: 24,
  FinalPosition: { Location: { x: 1, y: 2 }, Facing: 'East' }      
}
Done.


C:\Users\Dextosterone>marsRobot
Usage: marsRobotCli.js <input.json> <output.json>

works globally also now as a result. 