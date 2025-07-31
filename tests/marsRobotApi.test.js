// tests/marsRobotApi.test.js
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import http from "http";
import fs from "fs";
import path from "path";
import { server } from "../scripts/marsRobotApi.js";

const mockOutput = { result: "mocked output" };

// Mock the robot simulator so tests don't depend on actual logic
vi.mock("../dist/robot-simulator.js", () => ({
  simulateRobot: (input) => mockOutput,
}));

// Use a fixed port for testing to avoid conflicts with your main app's default 3000
const TEST_PORT = 4000; // Changed from PORT to TEST_PORT for clarity in test context

describe("MarsRobot API server", () => {
  // Using async/await for beforeAll and afterAll for cleaner Promise handling
  beforeAll(async () => {
    return new Promise((resolve, reject) => {
      server.listen(TEST_PORT, (err) => {
        if (err) {
          console.error("Test server failed to listen:", err);
          return reject(err);
        }
        console.log(`Test server started on http://localhost:${TEST_PORT}`);
        resolve();
      });
    });
  });

  afterAll(async () => {
    return new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) {
          console.error("Test server failed to close:", err);
          return reject(err);
        }
        console.log(`Test server closed on http://localhost:${TEST_PORT}`);
        resolve();
      });
    });
  });

  // Test Case 1: Valid POST /api/simulate
  it("responds with simulation output on valid POST /api/simulate", () => {
    return new Promise((resolve, reject) => {
      // Return a Promise
      const postDataPath = path.resolve(
        __dirname,
        "../samples/sample-input.json"
      );
      let postData;
      try {
        postData = fs.readFileSync(postDataPath, "utf-8");
        JSON.parse(postData); // Validate JSON format
      } catch (e) {
        console.error("Error reading or parsing sample-input.json:", e);
        return reject(e); // Reject the promise if file issues
      }

      const options = {
        hostname: "localhost",
        port: TEST_PORT,
        path: "/api/simulate",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      };

      const req = http.request(options, (res) => {
        expect(res.statusCode).toBe(200);
        expect(res.headers["content-type"]).toMatch(/application\/json/);

        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            expect(JSON.parse(data)).toEqual(mockOutput);
            resolve(); // Resolve the promise on successful assertions
          } catch (err) {
            reject(err); // Reject the promise if assertions fail or parsing issues
          }
        });
      });

      req.on("error", (e) => {
        // Handle request errors
        console.error("Request error:", e);
        reject(e); // Reject the promise on request error
      });

      req.write(postData);
      req.end();
    });
  }); // Test Case 2: Invalid JSON POST /api/simulate

  it("responds with 400 on invalid JSON POST /api/simulate", () => {
    return new Promise((resolve, reject) => {
      // Return a Promise
      const invalidJson = "{ invalid json }";

      const options = {
        hostname: "localhost",
        port: TEST_PORT,
        path: "/api/simulate",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(invalidJson),
        },
      };

      const req = http.request(options, (res) => {
        expect(res.statusCode).toBe(400);
        expect(res.headers["content-type"]).toMatch(/application\/json/);

        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            expect(json.error).toBeDefined();
            resolve(); // Resolve the promise on successful assertions
          } catch (err) {
            reject(err); // Reject the promise if assertions fail or parsing issues
          }
        });
      });

      req.on("error", (e) => {
        // Handle request errors
        console.error("Request error:", e);
        reject(e); // Reject the promise on request error
      });

      req.write(invalidJson);
      req.end();
    });
  }); // Test Case 3: Unknown Path

  it("responds with 404 on unknown path", () => {
    return new Promise((resolve, reject) => {
      // Return a Promise
      const options = {
        hostname: "localhost",
        port: TEST_PORT,
        path: "/unknown",
        method: "GET",
      };

      const req = http.request(options, (res) => {
        expect(res.statusCode).toBe(404);
        expect(res.headers["content-type"]).toMatch(/application\/json/);

        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            expect(json.error).toBe("Not Found");
            resolve(); // Resolve the promise on successful assertions
          } catch (err) {
            reject(err); // Reject the promise if assertions fail or parsing issues
          }
        });
      });

      req.on("error", (e) => {
        // Handle request errors
        console.error("Request error:", e);
        reject(e); // Reject the promise on request error
      });

      req.end();
    });
  });
});
