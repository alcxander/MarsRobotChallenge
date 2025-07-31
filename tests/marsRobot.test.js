import { describe, it, expect } from 'vitest';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const cliPath = fileURLToPath(new URL('../scripts/marsRobot.js', import.meta.url));

//** interesting issue happening here for test coverage of this code
// it reports as 0 coverage when really it's closer to 70/80, BUT to 
// get the coverage to that number off 0 requires a rewrite of the 
// code function. I think I will leave this here as an example of 
// understanding something instead of refactoring the code. 
// Root issue:
// test coverage comes in via spawning child process
// child process =/= coverage reports thus coverage = 0. 
// ....
// solution refactor cli code to take arguments in on the main call 
// instead of taking them in at the  */
describe('marsRobot CLI', () => {
  it('prints help with --help', async () => {
    const { stdout, stderr } = await execFileAsync('node', [cliPath, '--help']);
    expect(stdout).toContain('Usage:');
    expect(stderr).toBe('');
  });

  it('prints version with --version', async () => {
    const { stdout } = await execFileAsync('node', [cliPath, '--version']);
    expect(stdout).toMatch(/marsRobot version:/);
  });

  it('runs simulation with valid JSON', async () => {
    const inputPath = join(tmpdir(), 'input.json');
    const outputPath = join(tmpdir(), 'output.json');

    const validInput = {
      terrain: [["Fe", "Fe"], ["Fe", "Fe"]],
      battery: 50,
      commands: ["F", "R"],
      initialPosition: { location: { x: 0, y: 0 }, facing: "East" }
    };

    await writeFile(inputPath, JSON.stringify(validInput));

    const { stdout } = await execFileAsync('node', [cliPath, inputPath, outputPath]);
    expect(stdout).toContain('Simulation complete.');

    const outputJson = JSON.parse(await readFile(outputPath, 'utf8'));
    console.log('Output JSON:', outputJson);

    expect(outputJson).toHaveProperty('VisitedCells');

    // cleanup
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  });

  it('fails gracefully with invalid JSON', async () => {
    const badJsonPath = join(tmpdir(), 'bad.json');
    const outputPath = join(tmpdir(), 'out.json');
    await writeFile(badJsonPath, '{ invalid json');

    let error;
    try {
      await execFileAsync('node', [cliPath, badJsonPath, outputPath]);
    } catch (e) {
      error = e;
    }
    expect(error).toBeTruthy();
    expect(error.stderr).toMatch(/Error:/i);

    // cleanup
    await unlink(badJsonPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  });
});
