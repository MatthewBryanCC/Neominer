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
        this.Claimer = null;
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
                this.Claimer = gm.GetPlayerById(collider.OwnerId);
            } else {
                this.Claimer = collider;
            }
            gm.ClaimingObjects[this.Id] = this;
            console.log("Clamin!");
        }
        this.Collisions[collider.Id] = collider;
    }
    EndCollide(gm, collider) {
        console.log("[Celestial Object]: Collision ended. Object type '" + this.Type + "'");
        if(this.Claimable && this.Claimer == collider) {
            if((this.CaimedByDrone && collider.Type == "Mining_Drone") || !this.ClaimedByDrone) {
                delete gm.ClaimingObjects[this.Id];
                this.BeingClaimed = false;
                this.Claimer = null;
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
    HasFriendlyCollision() {
        if(this.Owner == null) { return false; }
        for(var id in this.Collisions) {
            console.log(id);
            var collider = this.Collisions[id];
            console.log(collider.Type);
            if(collider.Type == "Mining_Drone") {
                var ownerId = collider.OwnerId;
                if(ownerId == this.Owner.Id) return true;
            } else {
                if(collider.Id == this.Owner.Id) return true;
            }
            continue;
        }
        return false;
    }
    Unclaim() {
        this.ClaimValue = 0;
        this.Claimer = false;
        this.BeingClaimed = false;
        this.Owner = null;
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
        this.Owner = null;
        this.AsteroidType = "Metal";
        this.MaxResource = 100;
        this.CurrentResource = 100; 
    }
    AssessClaim(gm) {
        this.ClaimValue += 0.002; //Roughly 6 seconds serverside.
        if(this.ClaimValue >= 1) {
            this.ClaimValue = 1;
            this.Claimed = true;
            this.Owner = this.Claimer;
            delete gm.ClaimingObjects[this.Id];
            this.Owner.ClaimObject("Asteroid", this, gm);
            //Broadcast claim
            var data = {
                AsteroidId: this.Id,
                OwnerId: this.Owner.Id
            };
            gm.Server.BroadcastData("AsteroidClaim", data);
            return true;
        }
        return false;
    }
    CanBeHarvested() {
        return (!this.Contested && this.HasFriendlyCollision());
    }

    IsBeingHarvested() {
        return this.HasFriendlyCollision();
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
