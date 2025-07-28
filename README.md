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
