"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarsRobot = void 0;
exports.simulateRobot = simulateRobot;
var MarsRobot = /** @class */ (function () {
    function MarsRobot(input) {
        this.backoffStrategies = [
            ["E", "R", "F"],
            ["E", "L", "F"],
            ["E", "L", "L", "F"],
            ["E", "B", "R", "F"],
            ["E", "B", "B", "L", "F"],
            ["E", "F", "F"],
            ["E", "F", "L", "F", "L", "F"],
        ];
        this.position = __assign({}, input.initialPosition.location);
        this.facing = input.initialPosition.facing;
        this.battery = input.battery;
        this.terrain = input.terrain;
        this.visitedCells = [__assign({}, this.position)];
        this.samplesCollected = [];
        //no longer does anything, misunderstood an instruction
        this.collectSampleAtCurrentPosition();
    }
    MarsRobot.prototype.getDirectionVector = function (direction) {
        switch (direction) {
            case "North":
                return { x: 0, y: -1 };
            case "East":
                return { x: 1, y: 0 };
            case "South":
                return { x: 0, y: 1 };
            case "West":
                return { x: -1, y: 0 };
        }
    };
    MarsRobot.prototype.turnLeft = function () {
        var directions = ["North", "West", "South", "East"];
        var currentIndex = directions.indexOf(this.facing);
        this.facing = directions[(currentIndex + 1) % 4];
    };
    MarsRobot.prototype.turnRight = function () {
        var directions = ["North", "East", "South", "West"];
        var currentIndex = directions.indexOf(this.facing);
        this.facing = directions[(currentIndex + 1) % 4];
    };
    //TODO: check if pairing this as two is better than pairing it as all 4
    MarsRobot.prototype.isValidPosition = function (pos) {
        return (pos.x >= 0 &&
            pos.x < this.terrain[0].length &&
            pos.y >= 0 &&
            pos.y < this.terrain.length &&
            this.terrain[pos.y][pos.x] !== "Obs");
    };
    MarsRobot.prototype.getNextPosition = function (forward) {
        if (forward === void 0) { forward = true; }
        var vector = this.getDirectionVector(this.facing);
        var multiplier = forward ? 1 : -1;
        return {
            x: this.position.x + vector.x * multiplier,
            y: this.position.y + vector.y * multiplier,
        };
    };
    MarsRobot.prototype.consumeBattery = function (amount) {
        if (this.battery >= amount) {
            this.battery -= amount;
            return true;
        }
        return false;
    };
    MarsRobot.prototype.executeCommand = function (command) {
        switch (command) {
            case "F":
                if (!this.consumeBattery(3))
                    return false;
                var nextPosF = this.getNextPosition(true);
                if (this.isValidPosition(nextPosF)) {
                    this.position = nextPosF;
                    this.addVisitedCell(this.position);
                    return true;
                }
                else {
                    return this.executeBackoffStrategy();
                }
            case "B":
                if (!this.consumeBattery(3))
                    return false;
                var nextPosB = this.getNextPosition(false);
                if (this.isValidPosition(nextPosB)) {
                    this.position = nextPosB;
                    this.addVisitedCell(this.position);
                    return true;
                }
                else {
                    return this.executeBackoffStrategy();
                }
            case "L":
                if (!this.consumeBattery(2))
                    return false;
                this.turnLeft();
                return true;
            case "R":
                if (!this.consumeBattery(2))
                    return false;
                this.turnRight();
                return true;
            case "S":
                if (!this.consumeBattery(8))
                    return false;
                var currentTerrain = this.terrain[this.position.y][this.position.x];
                if (currentTerrain !== "Obs") {
                    this.samplesCollected.push(currentTerrain);
                }
                return true;
            case "E":
                if (!this.consumeBattery(1))
                    return false;
                this.battery += 10;
                return true;
            default:
                return false;
        }
    };
    MarsRobot.prototype.executeBackoffStrategy = function () {
        for (var _i = 0, _a = this.backoffStrategies; _i < _a.length; _i++) {
            var strategy = _a[_i];
            var originalPosition = __assign({}, this.position);
            var originalFacing = this.facing;
            var originalBattery = this.battery;
            var strategySuccessful = true;
            for (var _b = 0, strategy_1 = strategy; _b < strategy_1.length; _b++) {
                var command = strategy_1[_b];
                if (!this.executeCommand(command)) {
                    strategySuccessful = false;
                    break;
                }
            }
            if (strategySuccessful) {
                return true;
            }
            // Restore state if strategy failed
            this.position = originalPosition;
            this.facing = originalFacing;
            this.battery = originalBattery;
        }
        return false;
    };
    MarsRobot.prototype.addVisitedCell = function (position) {
        var exists = this.visitedCells.some(function (cell) { return cell.x === position.x && cell.y === position.y; });
        if (!exists) {
            this.visitedCells.push(__assign({}, position));
        }
    };
    MarsRobot.prototype.simulate = function (commands) {
        for (var _i = 0, commands_1 = commands; _i < commands_1.length; _i++) {
            var command = commands_1[_i];
            // Check if we can execute the command
            var requiredBattery = this.getRequiredBattery(command);
            // If we don't have enough battery but can extend solar panels, do it automatically
            // The battery should never get to a state where it goes to 1 or 2 and causes boundary
            // issues. If we encounter any issue we'll just break out of the loop.
            if (this.battery < requiredBattery && this.battery >= 1) {
                this.executeCommand("E");
            }
            // Try to execute the command
            if (!this.executeCommand(command)) {
                // If we still can't execute, stop simulation
                break;
            }
        }
        return {
            VisitedCells: this.visitedCells.map(function (cell) { return ({ x: cell.x, y: cell.y }); }),
            SamplesCollected: __spreadArray([], this.samplesCollected, true),
            Battery: this.battery,
            FinalPosition: {
                Location: { x: this.position.x, y: this.position.y },
                Facing: this.facing,
            },
        };
    };
    MarsRobot.prototype.getRequiredBattery = function (command) {
        switch (command) {
            case "F":
            case "B":
                return 3;
            case "L":
            case "R":
                return 2;
            case "S":
                return 8;
            case "E":
                return 1;
            default:
                return 0;
        }
    };
    // EXAMPLE of incorrect assumption here, that's what happens when you are 2/3 thoughts deep and get
    // distracted on another problem. left this in now as a sign of what happened previously.
    //I feel like we are not collecting samples correctly, let's put in get sample at currentLocation 
    // for first iteration of the engine as it's not being picked up
    MarsRobot.prototype.collectSampleAtCurrentPosition = function () {
        // const currentTerrain = this.terrain[this.position.y][this.position.x]
        // if (currentTerrain !== "Obs") //which shouldn't happen because we have a filter to stop us from starting on Obs territory
        // {
        //   this.samplesCollected.push(currentTerrain)
        // }
        //this.executeCommand("S")
        // we don't need this, I'm leaving this in to show what was done but if the command 'S' is not given then the bot won't varvest
        // for some reason I had thought it must harvest on the first go. but really the count of harvested materials should
        // match the number of S's in the input
    };
    return MarsRobot;
}());
exports.MarsRobot = MarsRobot;
function simulateRobot(input) {
    // Validate input and keep application clean from bad inputs, will but other considerations here after testing
    /**
     * Validations done
     * non empty arrays - no work given to be done
     * non square terrain map - this can be removed really as the logic works ubt can create weird Obs states
     * battery check - must be positive and must be a number e.g. 'thirty' does not count
     * command array - must be an array
     * command array II - must be a valid command so we don't let rubbish in here
     * initial position - if not given will be error no assumptions on inital position made in case we assume it on top of an OBs
     * initial position Obs - make sure initial pos not an Obs
     * direction - make sure we have valid directions
     *
     * */
    if (!input.terrain || !Array.isArray(input.terrain) || input.terrain.length === 0) {
        throw new Error("Invalid terrain: must be a non-empty 2D array");
    }
    if (!input.terrain.every(function (row) { return Array.isArray(row) && row.length === input.terrain[0].length; })) {
        throw new Error("Invalid terrain: all rows must have the same length");
    }
    if (typeof input.battery !== "number" || input.battery < 0) {
        throw new Error("Invalid battery: must be a non-negative number");
    }
    if (!Array.isArray(input.commands)) {
        throw new Error("Invalid commands input: must be an array");
    }
    var validCommands = ["F", "B", "L", "R", "S", "E"];
    if (!input.commands.every(function (cmd) { return validCommands.includes(cmd); })) {
        throw new Error("Invalid commands: must contain only F, B, L, R, S, E");
    }
    if (!input.initialPosition || !input.initialPosition.location) {
        throw new Error("Invalid or empty initial position supplied");
    }
    var _a = input.initialPosition.location, x = _a.x, y = _a.y;
    if (x < 0 || x >= input.terrain[0].length || y < 0 || y >= input.terrain.length) {
        throw new Error("Initial position is outside terrain boundaries");
    }
    if (input.terrain[y][x] === "Obs") {
        throw new Error("Initial position cannot be on an obstacle");
    }
    var validDirections = ["North", "East", "South", "West"];
    if (!validDirections.includes(input.initialPosition.facing)) {
        throw new Error("Invalid facing direction: must be North, East, South, or West");
    }
    var robot = new MarsRobot(input);
    return robot.simulate(input.commands);
}
