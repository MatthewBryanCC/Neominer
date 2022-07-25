const GameObjectFactory = require("./GameObjectFactory");

module.exports = class Player {
    constructor(id, socketID) {
        this.Id = id;
        this.SocketId = socketID;
        this.Position = {x: 0, y: 0};
        this.Size = 30;
        this.Directions = {
            Up: false,
            Down: false,
            Left: false,
            Right: false
        };
        this.Speed = 10;
        this.ServerOnly = {
            Drones: {}
        };
        this.Inventory = {
            Metal: 0
        };
        this.Collisions = {};
        this.ClaimedObjects = {
            Asteroid: {}
        }
    }

    CreateDrone(droneType) {
        if(droneType == "Mining") {
            GameObjectFactory.CreateMiningDrone(this);
        }
    }

    /* Movement Functionality */
    ChangeDirection(data) {
        this.Directions[data.direction] = data.toggle;
    }
    GetVelocity() {
        let [vx, vy] = [0,0];
        if(this.Directions.Up) { vy -= 1; } 
        else if(this.Directions.Down) { vy += 1; }
        if(this.Directions.Left) { vx -= 1; }
        else if(this.Directions.Right) { vx += 1; }
        return [vx*this.Speed, vy*this.Speed];
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
                if(CircleCollision(this, obj)) {
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

    ClaimObject(type, obj) {
        this.ClaimedObjects[type][obj.Id] = obj;
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

function CircleCollision(obj1, obj2) {
    var p1x = obj1.Position.x;
    var p1y = obj1.Position.y;
    var r1 = obj1.Size;
    var p2x = obj2.Position.x;
    var p2y = obj2.Position.y;
    var r2 = obj2.Size;
    var a;
    var x;
    var y;

    a = r1 + r2;
    x = p1x - p2x;
    y = p1y - p2y;

    if (a > Math.sqrt((x * x) + (y * y))) {
        return true;
    } else {
        return false;
    }
}
function boxCollide() {}