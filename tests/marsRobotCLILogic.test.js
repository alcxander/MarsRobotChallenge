import { describe, it, expect, vi, beforeEach } from 'vitest';

// mock simulateRobot *before* importing runCli
const expectedOutput = { 
  VisitedCells: [{x:0,y:0}, {x:1, y:1}], 
  SamplesCollected: ["Fe"], 
  Battery: 45, 
  FinalPosition: { Location: {x:0,y:0}, Facing: 'North' }
};

vi.mock('../dist/robot-simulator.js', () => ({
  simulateRobot: () => expectedOutput
}));

import { runCli } from '../scripts/marsRobotCLILogic.js';

describe('marsRobotCLILogic', () => {
  let mockConsole;
  let mockFs;
  let mockExit;

  beforeEach(() => {
    mockConsole = {
      log: vi.fn(),
      error: vi.fn(),
    };
    mockFs = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
    };
    mockExit = vi.fn();  // don't actually exit tests
  });

  it('prints help when no args', async () => {
    await runCli(['node', 'marsRobotCLI.js'], {
      consoleModule: mockConsole,
      exit: mockExit,
    });
    expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('prints version with --version', async () => {
    await runCli(['node', 'marsRobotCLI.js', '--version'], {
      consoleModule: mockConsole,
      exit: mockExit,
    });
    expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('marsRobot version:'));
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('prints error on incorrect number of args', async () => {
    await runCli(['node', 'marsRobotCLI.js', 'only-one-arg.json'], {
      consoleModule: mockConsole,
      exit: mockExit,
    });
    expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('Incorrect number of arguments'), expect.anything());
    expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('runs simulation and writes output', async () => {
    const sampleInput = {
      terrain: [["Fe", "Fe"], ["Fe", "Fe"]],
      battery: 50,
      commands: ["F", "S"],
      initialPosition: { location: { x: 0, y: 0 }, facing: "East" }
    };

    mockFs.readFile.mockResolvedValue(JSON.stringify(sampleInput));

    await runCli(['node', 'marsRobotCLI.js', 'input.json', 'output.json'], {
      fsModule: mockFs,
      consoleModule: mockConsole,
      exit: mockExit,
    });

    expect(mockFs.readFile).toHaveBeenCalledWith('input.json', 'utf8');
    expect(mockFs.writeFile).toHaveBeenCalledWith('output.json', JSON.stringify(expectedOutput, null, 2));
    expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('Simulation complete. Output:'), expectedOutput);
    expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('Done. Output written to:'), expect.anything());
  });

  it('handles JSON parse error gracefully', async () => {
    mockFs.readFile.mockResolvedValue('invalid json');

    await runCli(['node', 'marsRobotCLI.js', 'input.json', 'output.json'], {
      fsModule: mockFs,
      consoleModule: mockConsole,
      exit: mockExit,
    });

    expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('Error:'), expect.anything());
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
