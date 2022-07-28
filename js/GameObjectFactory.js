const Helper = require('./Helpers.js');
module.exports = class GameObjectFactory {
    constructor() {

    }
    static CreateMiningDrone(owner, gm) {
        console.log("Trying to make mining drone!");
        var newMiningDrone = new MiningDrone(Helper.CreateUUID("MDrone"), JSON.parse(JSON.stringify(owner.Position)), "Mining_Drone", owner.Id, gm);
        //owner.ServerOnly.Drones[newMiningDrone.Id] = newMiningDrone;
        return newMiningDrone;
    }
    static CreateGuardDrone(owner) {

    }
}


const ACTION = {
    IDLE: 0,
    WANDER: 1,
    PATHING: 2,
    MINING: 3,
    ATTACKING: 4
};


class PlayerDrone {
    constructor(id, position, type, ownerId, gm) {
        this.Id = id;
        this.Position = position;
        this.Type = type;
        this.OwnerId = ownerId;
        this.Speed = 1;
        this.Size = 10;
        this.Action = ACTION.IDLE;
        this.CurrentTarget = null;
        this.vx = 0;
        this.vy = 0;
        this.SearchRadius = 300;
        this.gm = gm;
        this.Collisions = {};
        this.WanderLocation = {x: 0, y: 0};
    }

    Move() {
        this.Position.x += this.vx;
        this.Position.y += this.vy;
        return(this.vx != 0 || this.vy != 0);
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
}

class MiningDrone extends PlayerDrone {
    constructor(id, position, type, ownerId, gm) {
        super(id, position, type, ownerId, gm);
    }

    Think() {
        var moved = false;
        switch(this.Action) {
            case ACTION.IDLE:
                moved = this.ThinkIdle();
                break;
            case ACTION.WANDER:
                moved = this.ThinkWander();
                break;
            case ACTION.PATHING:
                moved = this.ThinkPathing();
                break;
            case ACTION.MINING:
                break;
            default:
                console.log("Drone error!");
        }
        return moved;
    }
    StartIdle() {
        console.log("[Drone]: Now idling");
        this.Action = ACTION.IDLE;
    }
    ThinkIdle() {
        if(this.CurrentTarget == null) {
            var newTarget = this.FindClosestAsteroid();
            if(newTarget != null) {
                console.log("[Drone]: Asteroid found!");
                this.StartPathing(newTarget);
            } else {
                //No target found.
                this.StartWander();
            }
        }
        return false;
    }
    FindClosestAsteroid() {
        var closestAsteroid = null;
        var closestDist = 0;
        for(var id in this.gm.CelestialObjects.Asteroid) {
            var asteroid = this.gm.CelestialObjects.Asteroid[id];
            var dist = Helper.DistanceBetween(this, asteroid);
            if(dist <= this.SearchRadius) {
                if(closestAsteroid == null) {
                    closestAsteroid = asteroid;
                    closestDist = dist;
                } else {
                    if(dist < closestDist) {
                        closestAsteroid = asteroid;
                        closestDist = dist;
                    }
                }
            }
        }
        return closestAsteroid;
    }

    StartWander() {
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
        console.log("[Drone]: Couldn't find asteroid, starting to wander.")
    }
    ThinkWander() {
        var [dx, dy] = [(this.Position.x - this.WanderLocation.x), (this.Position.y - this.WanderLocation.y)];
        var distanceFromTarget = Math.sqrt((dx*dx)+(dy*dy));
        if(distanceFromTarget > 2) {
            //console.log("Drone Movin! Current Position: x=" + this.Position.x + ", y=" + this.Position.y);
            this.Move();
            return true;
        } else {
            this.StartIdle();
            return false;
        }
    }
    StartPathing(newTarget) {
        this.CurrentTarget = newTarget;
        let dx = this.Position.x - this.CurrentTarget.Position.x;
        let dy = this.Position.y - this.CurrentTarget.Position.y;
        var mag = Math.sqrt((dx*dx) + (dy*dy));
        this.vx = (dx/mag) * this.Speed *-1;
        this.vy = (dy/mag) * this.Speed *-1;
        this.Action = ACTION.PATHING;
        console.log("[Drone]: Pathing to target!");
    }
    ThinkPathing() {
        var distanceFromTarget = Helper.DistanceBetween(this, this.CurrentTarget);
        if(distanceFromTarget > 2) {
            //Path
            this.Move();
            return true;
        } else {
            //At target
            console.log("[Drone]: At target! Yay!");
            this.Action = ACTION.MINING;
            return false;
        }
    }
}

class GuardDrone extends PlayerDrone {
    constructor(id, position, type, ownerId) {
        super(id, position, type, ownerId);
    }
}

