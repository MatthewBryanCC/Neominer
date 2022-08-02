module.exports = class CelestialBodiesFactory {
    constructor(ctx) {
        this.gameManager = ctx;
    }
    static CreateStar() {
        return new Star(CreateUUID("Star"), "Star", {x: 0, y: 0}, 500);
    }
    static CreateAsteroid() {
        var localWorldSpace = { 
            minWidth: -3000, 
            minHeight: -3000,
            maxWidth: 3000,
            maxHeight: 3000
        };
        var positionX = getRandomNumberBetween(localWorldSpace.minWidth, localWorldSpace.maxWidth);
        var positionY = getRandomNumberBetween(localWorldSpace.minHeight, localWorldSpace.maxHeight);
        return new Asteroid(CreateUUID("Asteroid"), "Asteroid", {x: positionX, y: positionY}, 65);
    }
}

function CreateUUID(type) {
    function uuid(mask = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx') {
        return `${mask}`.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    }
    return uuid(type + "-xxxx-xxxx-xxxx-xxx-OBJECT");
}
function getRandomNumberBetween(min,max){
    return Math.floor(Math.random()*(max-min+1)+min);
}


class CelestialBody {
    constructor(id, type, position, size) {
        this.Id = id;
        this.Type = type;
        this.Position = position;
        this.Size = size;
        this.Claimable = false;
        this.ClaimValue = 0;
        this.ClaimerId = null;
        this.Claimed = false;
        this.Collisions = {};
        this.BeingClaimed = false;
        this.ClaimedByDrone = false;
        this.DroneId = null;
        this.Contested = false;
    }
    Collide(gm, collider) {
        console.log("[Celestial Object]: Collision detected. Object type '" + this.Type + "'");
        if(this.Claimable && !this.Claimed && !this.BeingClaimed) {
            this.BeingClaimed = true;
            if(collider.Type == "Mining_Drone") {
                this.ClaimedByDrone = true;
                this.DroneId = collider.Id;
                this.ClaimerId = collider.OwnerId
            } else {
                this.ClaimerId = collider.Id;
            }
            gm.ClaimingObjects[this.Id] = this;
            console.log("Clamin!");
        }
        var collisionInfo = {
            Id: collider.Id,
            CollisionType: collider.Type
        }
        this.Collisions[collider.Id] = collisionInfo;
    }
    EndCollide(gm, collider) {
        console.log("[Celestial Object]: Collision ended. Object type '" + this.Type + "'");
        if(this.Claimable && (this.ClaimerId == collider.Id || this.ClaimerId == collider.OwnerId)) {
            if((this.CaimedByDrone && collider.Type == "Mining_Drone") || !this.ClaimedByDrone) {
                delete gm.ClaimingObjects[this.Id];
                this.BeingClaimed = false;
                this.ClaimerId = null;
                this.ClaimedByDrone = false;
                this.ClaimValue = 0;
            }
        }
        delete this.Collisions[collider.Id];
    }
    IsBeingClaimed() {
        return this.BeingClaimed;
    }
    ClaimingByDroneId(id) {
        if(this.ClaimedByDrone) {
            if(this.DroneId == id) {
                return true;
            }
            return false; 
        }
        return false;
    }
    HasFriendlyCollision(gm) {
        //var owner = gm.GetPlayerById(this.OwnerId);
        //if(owner == null) { return false; } //Owner dc'ed, ignore.
        for(var id in this.Collisions) {
            var colliderInfo = this.Collisions[id];
            if(colliderInfo.CollisionType == "Mining_Drone") {
                var ownerId = colliderInfo.Id;
                if(ownerId == this.OwnerId) return true;
            } else {
                if(colliderInfo.Id == this.OwnerId) return true;
            }
            continue;
        }
        return false;
    }
    Unclaim(playerId) {
        this.ClaimValue = 0;
        this.ClaimerId = null;
        this.BeingClaimed = false;
        this.Claimed = false;
        this.OwnerId = null;
        delete this.Collisions[playerId];
    }
}

class Star extends CelestialBody {
    constructor(id, type, position, size) {
        super(id, type, position, size);
    }
}

class Asteroid extends CelestialBody {
    constructor(id, type, position, size) {
        super(id, type, position, size);
        this.Claimable = true;
        this.OwnerId = null;
        this.AsteroidType = "Metal";
        this.MaxResource = 100;
        this.CurrentResource = 100; 
    }
    AssessClaim(gm) {
        this.ClaimValue += 0.002; //Roughly 6 seconds serverside.
        if(this.ClaimValue >= 1) {
            this.ClaimValue = 1;
            this.Claimed = true;
            this.OwnerId = this.ClaimerId;
            delete gm.ClaimingObjects[this.Id];
            var owner = gm.GetPlayerById(this.OwnerId);
            owner.ClaimObject("Asteroid", this, gm);
            //Broadcast claim
            var data = {
                AsteroidId: this.Id,
                OwnerId: this.OwnerId
            };
            gm.Server.BroadcastData("AsteroidClaim", data);
            return true;
        }
        return false;
    }
    CanBeHarvested(gm) {
        return (!this.Contested && this.HasFriendlyCollision(gm));
    }

    IsBeingHarvested(gm) {
        return this.HasFriendlyCollision(gm);
    }

    ClaimResources(owner, gm) {
        this.CurrentResource -= 1;
        owner.Inventory[this.AsteroidType] += 1;
        console.log("Resource claimed!");

        this.AssessDepletion(gm);

        return [this.CurrentResource, this.MaxResource];
    }
    AssessDepletion(gm) {
        if(this.CurrentResource <= 0) {
            var deleteData = this.Id;
            //Destroy self and notify.
            delete gm.CelestialObjects.Asteroid[this.Id];
            delete gm.ClaimedObjects[this.Id];
            if(this.ClaimedByDrone) {
                var drone = gm.Drones[this.DroneId];
                drone.StartIdle();
            }
            gm.Server.BroadcastData("AsteroidDepleted", deleteData);
        }
    }
}
