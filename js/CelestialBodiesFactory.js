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
    }
    Collide(gm, collider) {
        console.log("[Celestial Object]: Collision detected. Object type '" + this.Type + "'");
        if(this.Claimable && !this.Claimed && !this.BeingClaimed) {
            this.BeingClaimed = true;
            this.Claimer = collider;
            gm.ClaimObjects[this.Id] = this;
            console.log("Clamin!");
        }
    }
    EndCollide(gm, collider) {
        console.log("[Celestial Object]: Collision ended. Object type '" + this.Type + "'");
        if(this.Claimable && this.Claimer == collider) {
            this.BeingClaimed = false;
            this.Claimer = null;
            this.ClaimValue = 0;
            delete gm.ClaimObjects[this.Id];
        }
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
        this.ClaimValue = 0;
        this.BeingClaimed = false;
        this.Claimer = null;
        this.Claimed = false;
        this.Owner = null;
        this.AsteroidType = "Metal"
    }
    AssessClaim(gm) {
        this.ClaimValue += 0.002; //Roughly 6 seconds serverside.
        if(this.ClaimValue >= 1) {
            this.ClaimValue = 1;
            this.Claimed = true;
            this.Owner = this.Claimer;
            delete gm.ClaimObjects[this.Id];
            this.Owner.ClaimObject("Asteroid", this);
            //Broadcast claim
            var data = {
                AsteroidId: this.Id,
                OwnerId: this.Owner.Id
            };
            gm.Server.BroadcastData("AsteroidClaim", data);
        }
    }

    ClaimResources() {
        return [this.AsteroidType, 0.01]; //Metal
    }
}
