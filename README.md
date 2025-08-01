# 🪐 Mars Robot API

A simple Node.js project simulating a Mars robot control API.  
Includes a basic HTTP server, CLI access with secondary interactivity, a simple web front end, sample inputs, and automated tests with coverage reporting.

---

## 🚀 Project Overview

This project demonstrates a small, testable API that accepts robot command data (from a JSON file) and returns simulated movement responses.  
Built for clarity, testability, and easy local development.

Project was designed to follow best practices where possible. The logic of the application is separated into its own robot-simulater.ts where the main action happens. 

Project has network tests, input validators, typing on the constructors and classes, exported options to be consumable elsewhere. 

Inside the scripts folder you'll find the scripts that are the requirements for the project requirements. They are run via the below mentioned commands. 

There are sample files pre-made into the samples folder feel free to use them. 

There are multiple access points to the project
- Web at localhost:3000
- CLI running in the directory (or globally per below steps)
- Client Server

Basic structure:

lib -> holds the robot simulator
dist -> holds the tsc compiled robot-simulator.ts
this was made for one of the scripts which cannot take in a ts file at run time as a script. In a real project I would include a shortcut in the package.json that builds this automatically every time, but I have compiled it now and don't plan on making more changes to the core code
app -> Web application .in page.tsx
components -> mostly shadcn that was downloaded to fill out the front end UI
app -> api -> a route to handle post and get requests for data into the robot-simulator
coverage -> vitest automated coverage folder
samples -> some files made to showcase testing setup and what can be input to the tool
scripts -> scripts to run code that do various things
tests -> where the automated tests are stored


---

## 📦 Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/mars-robot-api.git
cd mars-robot-api

npm install 

npm link 
```

(this is used to setup the commands in bin to run locally. The other idea to have this run globally is to publish to NPM which I did do with the code but will retract anyway at some point as while it works it's not production code.)

from here the code should run, you can see the web running on localhost:3000

## Test Coverage
To see tests you can run 

npm run coverage
(should run vitest --coverage in the background)

after running you'll see

-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------|---------|----------|---------|---------|-------------------
All files        |   42.85 |      100 |     100 |   42.85 | 15-34
-----------------|---------|----------|---------|---------|-------------------


Coverage focus primarily on API logic, some statup/down logic and rulesets. There are some areas still left uncovered. 

# Commands (requirements)
## marsRobotCLI1
this CLI tool satisfies the first requirement of the brief:
CLI Mode

No server running needed this plugs right into the backend logic.

on command line run
marsRobotCLI1 ./samples/sample-input.json output.json

to run this command. If you run without parameters you'll get help by default with a prompt explaining the same. 

you should get something like this as a result

Loaded robot-simulator.js
Terrain matrix: [["Fe","Fe","Se"],["W","Si","Obs"],["Fe","W","Si"]]
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
Done. Output written to:  output.json

(should look nicer in the terminal)
#### help option
marsRobotCLI1 -h          

Usage:
  marsRobot <input.json> <output.json>

Description:
  Reads the JSON input file, simulates the Mars robot, and writes the output JSON.

Examples:
  marsRobot sample-input.json output.json

Options:
  -h, --help       Show help message
  -v, --version    Show version


## marsRobotAPIServer2

this satisfies the REST API server mode

this will fail if the server is running already from npm run dev.

### usage 

marsRobotAPIServer2 
🚀 MarsRobot API server running on http://localhost:3001
Test this out with Postman or similar or curl at the endpoint.
Sample CURL Command for Windows works well if you run in same folder otherwise update the sampleinput json path fully if running elsewhere.
curl.exe -X POST http://localhost:3000/api/simulate -H "Content-Type: application/json" -d @sample-input.json | ConvertFrom-Json | ConvertTo-Json -Depth 10

there is an example provided for ease of use but once running you can send POST commands to the local server that's now running.

## marsRobotAPIClient3

this satisfies the last requirement
REST API Client Mode

make sure server is running either with npm run dev or marsRobotAPIServer2

then you can run

marsRobotAPIClient3 ./samples/sample-input.json

### usage

marsRobotAPIClient3 ./samples/sample-input.json
Sending request to Mars Robot API...
Input file: ./samples/sample-input.json

=== MARS ROBOT SIMULATION RESULTS ===

🔋 Battery Level: 24 units
📍 Final Position: (1, 2) facing East

🗺️  Visited Cells (5):
   1. (0, 0)
   2. (1, 0)
   3. (1, 1)
   4. (1, 2)
   5. (2, 2)

🧪 Samples Collected (2):
   1. Fe
   2. Si

=====================================


## marsRobotAPIClientMode

lastly this extension, if you feel like it you can also see the code run in the command line interactively 

### usage

marsRobotCLI1Interactive ./samples/sample-input-big.json

will present you with the below

>> Starting interactive Mars Robot CLI...
>> Raw args: [ './samples/sample-input-big.json' ]
>> Loading input file: ./samples/sample-input-big.json
✅ Input file loaded successfully!
>> Input preview: {
  [removed preview as it's huge]

  ✅ Starting simulation! Type commands to control the robot.
Commands: move (f), left (l), right (r), backward (b), sample (s), recharge (e), exit (q)


== Mars Terrain ==
Battery: undefined
 .  .  .  Fe  .  .  .  Si  .  .  R 
 .  Zn  .  Se  .  Fe  .  Fe  .  Se  Zn 
 .  Fe  .  Zn  .  .  .  Fe  .  Fe  Zn 
 .  Si  .  W  .  Zn  Se  Fe  .  .  . 
 .  Fe  .  Zn  .  .  .  Zn  Fe  Se  . 
 .  Si  .  Fe  .  Fe  .  Si  Zn  Fe  . 
 .  .  .  W  .  .  .  Fe  .  .  . 
 Obs  Obs  .  Obs  .  Obs  Obs  Obs  .  Obs  Obs 
 Fe  Zn  .  .  .  .  .  .  .  Si  Zn 
 Si  Fe  Fe  Zn  Se  W  Si  Fe  Fe  Zn  Zn 

Robot Position: x=10, y=0, facing=East
Battery: 4748
Samples Collected: none
? Enter command: (or 'plan path x1 y1 x2 y2'):

at this point you can use commands to move the bot or you can write

plan path 0 0 5 5

it will tell you if a path is available to that node and what commands it takes to get there efficiently. 

## Improvements

The extensions on the requirement were pretty comprehensive already. Some things I would consider in a live application in the future
- DB integrations to store session activity per user or per session.
- a slightly updated UI on the web app to create random files for input. 
- refactoring the scripts just a little bit more to make better test coverage and get over the current 65%
- a second bot that races you turn for turn with randomly applied mission objectives to each controller

## Working with AI on this Project

The plan for this project was simple, use a base tool to scaffold out the project then use other tools and my own knowledge to fill in gaps on the code where I found issues that weren't built correctly. 

AI tools used

- V0
- ChatGPT
- My Own 'Edito' AI tool (built atop ChatGPT but with larger prompts to curtail certain behaviours)
- Mobbin - to design the UI
- coderabbit - for automated code reviews on the PR's
- copilot
- gemini

Overall the AI tooling was useful, however at times it showed weaknesses and needed some pointed debugging and directions from me to push it in the right direction to solve certain issues. I bulit many things myself and tried to use AI To fill in gaps to spend less time on larger pieces of 'known' code segments. I relied on it for the CLI piece as that's not something I had to do before from scratch, though easy enough honestly, I used AI here mainly for questions and understanding of the process as I developed it. The general approach of scaffold out then fill in gaps worked well with small downsides. V0 got a base layer up and running easy enough thus adding in more was easy, it did however make several mistakes that I corrected to get it working correctly. It made other mistakes that needed patching. 

For general use i used ChatGPT because it's limits are quite useful. 

For PF reviews and anything I may have missed I used Code Rabbit to review my work which was tremendously useful when producing code en masse. 

I tried gemini and CoPilot on specific features when creating branches and found them mostly useless and a hindrance. There is an experience issue there for sure but my experience with them was not great. Gemini seemed to always go down high level paths of issues and produced code snippets that didn't always work without iterating a few times and CoPilot kept taking over my PC popping up windows which, admittedly, was an inexperience issue that pulled me away from it. I did some comparitive tests with ChatGPT and Gemini for some issues and found ChatGPT more regularly found root causes of the issues.

There were some headaches though. The pathing algorithm for a start, at a certain point while using AI tools to write code and flesh out features I noticed some strange behaviours and hallucinations. The pathing algorithm took maybe 1.5 hours to do and 80% of that was trying to figure out why the algorithm was not seeing a value in scoring was not being set correctly. In hindsight an interesting lesson to go through. Another headache was V0 seemed to implement some commonJS at some point, I didn't catch when this happened exactly but ChatGPT was giving other code and at a certain point I was getting commonJS v ESM errors, I ended up spending time to align everything to ESM and then later on I had other issues with ESM with other tooling as a result of that early configuration work. Useful learning but interesting hole to have been led into by the AI. 

I think the scaffolding was immensely useful, I also think there is something to be said for staying in-house on one tech for a whole project. 

