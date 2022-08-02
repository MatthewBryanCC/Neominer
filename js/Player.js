const GameObjectFactory = require("./GameObjectFactory");
const Helper = require("./Helpers.js");
const MINING_DRONE_BASE_COST = 150;

const ACTION = {
    IDLE: 0,
    WANDER: 1,
    PATHING: 2,
    MINING: 3,
    ATTACKING: 4
};


class Player {
    constructor(id, socketID) {
        this.Id = id;
        if(socketID != null) {
            this.SocketId = socketID;
            this.PlayerType = "Player";
        } else {
            this.PlayerType = "AI";
        }
        this.Position = {x: 0, y: 0};
        this.Size = 30;
        this.Directions = {
            Up: false,
            Down: false,
            Left: false,
            Right: false
        };
        this.Type = "Player";
        this.Speed = 10;
        this.ServerOnly = {
            Drones: {}
        };
        this.Inventory = {
            Metal: 10000
        };
        this.Collisions = {};
        this.ClaimedObjects = {
            Asteroid: {}
        }
    }

    CreateDrone(droneType, gm) {
        if(droneType == "Mining") {
            if(this.Inventory.Metal >= MINING_DRONE_BASE_COST) {
                var newDrone = GameObjectFactory.CreateMiningDrone(this, gm);
                this.Inventory.Metal -= MINING_DRONE_BASE_COST;
                return newDrone;
            } else { return null; }
        }
        return null;
    }

    /* Movement Functionality */
    ChangeDirection(data) {
        this.Directions[data.direction] = data.toggle;
    }
    GetVelocity() {
        let [vx, vy] = [0,0];
        if(this.PlayerType == "Player") {
            if(this.Directions.Up) { vy -= 1; } 
            else if(this.Directions.Down) { vy += 1; }
            if(this.Directions.Left) { vx -= 1; }
            else if(this.Directions.Right) { vx += 1; }
            return [vx*this.Speed, vy*this.Speed];
        } else {
            return [this.vx, this.vy];
        }
    }
    Move() {
        var [vx, vy] = this.GetVelocity();
        if(vx != 0) { this.Position.x += vx; }
        if(vy != 0) { this.Position.y += vy; }
        return (vx != 0 || vy != 0);
    }
    AssessCollisions(celestialBodies, gm) {
        for(var type in celestialBodies) {
            for(var i in celestialBodies[type]) {
                var obj = celestialBodies[type][i];
                if(Helper.CircleCollision(this, obj)) {
                    obj.Collide(gm, this);
                    this.Collisions[obj.Id] = obj;
                } else {
                    if(obj.Id in this.Collisions) { 
                        obj.EndCollide(gm, this);
                        delete this.Collisions[obj.Id];
                    }
                }
            }
        }
    }

    ClaimObject(type, obj, gm) {
        this.ClaimedObjects[type][obj.Id] = obj;
        gm.ClaimedObjects[obj.Id] = obj;
        console.log("Object claimed!");
    }
    AssessResourceClaims() {
        //Claim resources from asteroids.
        for(var i in this.ClaimedObjects.Asteroid) {
            var asteroid = this.ClaimedObjects.Asteroid[i];
            var [type, updateValue] = asteroid.ClaimResources();
            this.Inventory[type] += updateValue;
            console.log("[Player Log]: Player '" + this.Id + "' now has " + this.Inventory.Metal + " Metal.");
        }
    }
}

class AIEnemy extends Player {
    constructor(id, ctx) {
        super(id, null);
        this.Delay=0;
        this.EnemyList=[];
        this.Health=0;
        this.Speed = 1;
        this.Shield=0;
        this.SearchRadius = 400;
        this.CurrentTarget = null;
        this.WanderLocation = {x: 0, y: 0};
        this.Action = ACTION.IDLE;
        this.vx = 0;
        this.vy = 0;
        this.gmCtx = ctx; //Game manager context.
    }

    Think() {
        //Brain
        switch(this.Action) {
            case ACTION.IDLE:
                this.ThinkIdle();
                break;
            case ACTION.WANDER:
                this.ThinkWander();
                break;
            case ACTION.PATHING:
                this.PathToTarget();
                break;
            default: 
                console.log("AI ERROR");
        }
    }

    ThinkIdle() {
        //If money too low
        console.log("Thinking idle");
        if(this.Inventory.Metal < MINING_DRONE_BASE_COST) {
            console.log("No metal, current target: " + this.CurrentTarget);
            //If no current target or enemies?
            if(this.CurrentTarget == null) {
                console.log("No target");
                //Find resource self
                var newTarget = this.FindAsteroid();
                //If no target found
                if(newTarget == null) {
                    console.log("Can't find target");
                    //Wander
                    this.StartWander();
                } else {
                    console.log("Asteroid found!");
                    this.CurrentTarget = newTarget;
                    this.StartPathing();
                }
            } else {
                //Path
                this.PathToTarget();
            }
        } else {
            //Create drone.
            this.CreateDrone("Mining");
        }      
    }
    ThinkWander() {
        var [dx, dy] = [(this.Position.x - this.WanderLocation.x), (this.Position.y - this.WanderLocation.y)];
        var distanceFromTarget = Math.sqrt((dx*dx)+(dy*dy));
        console.log("Distance: " + distanceFromTarget);
        if(distanceFromTarget > 2) {
            console.log("AI Movin! Current Position: x=" + this.Position.x + ", y=" + this.Position.y);
            this.Move();
        } else {
            console.log("AI at location!");
            this.Action = ACTION.IDLE;
        }
    }

    StartWander() {
        console.log("AI Starting wander");
        //Generate wander direction. Pick location in search radius.
        var randomX = Helper.getRandomNumberBetween(this.Position.x - this.SearchRadius, this.Position.x + this.SearchRadius);
        var randomY = Helper.getRandomNumberBetween(this.Position.y - this.SearchRadius, this.Position.y + this.SearchRadius);
        let dx = this.Position.x - randomX;
        let dy = this.Position.y - randomY;
        var mag = Math.sqrt((dx*dx) + (dy*dy));
        this.vx = (dx/mag) * this.Speed *-1;
        this.vy = (dy/mag) * this.Speed *-1;
        this.WanderLocation = {x: randomX, y: randomY}; 
        //Set action.
        this.Action = ACTION.WANDER;
    }
    StartPathing() {
        let dx = this.Position.x - this.CurrentTarget.Position.x;
        let dy = this.Position.y - this.CurrentTarget.Position.y;
        var mag = Math.sqrt((dx*dx) + (dy*dy));
        this.vx = (dx/mag) * this.Speed *-1;
        this.vy = (dy/mag) * this.Speed *-1;
        this.Action = ACTION.PATHING;
    }
    FindAsteroid() {
        var newTarget = null;
        for(var id in this.gmCtx.CelestialObjects.Asteroid) {
            var thisAsteroid = this.gmCtx.CelestialObjects.Asteroid[id];
            if(Helper.DistanceBetween(this, thisAsteroid) < this.SearchRadius) {
                //Found asteroid in range!
                console.log("Asteroid in range: " + thisAsteroid.Id);
                newTarget = thisAsteroid;
                break;
            } else { continue; }
        }
        return newTarget;
    }
    PathToTarget() {
        var distanceFromTarget = Helper.DistanceBetween(this, this.CurrentTarget);
        if(distanceFromTarget > 2) {
            //Path
            console.log("Pathing to target!");
            this.Move();
        } else {
            //At target
            console.log("At target! Yay!");
            this.CurrentTarget = ACTION.MINING;
        }
    }

    
}




function boxCollide() {}
module.exports = {Player, AIEnemy};