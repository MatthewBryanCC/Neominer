/* CLIENT FACTORY */
export class CelestialBodiesFactory {
    constructor(ctx) {
       this.ApplicationContext = ctx;
    }

    ConvertStars(stars) {
        var newStars = {};
        for(var key in stars) {
            var starData = stars[key];
            newStars[starData.Id] = new Star(this, starData);
        }
        return newStars;
    }

    ConvertAsteroids(asteroids) {
        var newAsteroids = {};
        for(var key in asteroids) {
            var asteroidData = asteroids[key];
            newAsteroids[asteroidData.Id] = new Asteroid(this, asteroidData);
        }
        return newAsteroids;
    }
}

class CelestialBody {
    constructor(ctx, id, type, position, size) {
        this.CelestialContext = ctx;
        this.Id = id;
        this.Type = type;
        this.Position = position;
        this.Size = size;
    }
    GetDrawPosition(x, y) {
        var offsetX = this.CelestialContext.ApplicationContext.Graphics.worldOffsetX;
        var offsetY = this.CelestialContext.ApplicationContext.Graphics.worldOffsetY;
        var newX = x + (window.innerWidth / 2) - offsetX; // PLUS OFFSET!
        var newY = y + (window.innerHeight / 2) - offsetY; // PLUS OFFSET!
        return [newX, newY];
    }
}

class Star extends CelestialBody {
    constructor(ctx, starData) {
        super(ctx, starData.Id, "Star", starData.Position, starData.Size);
        this.CelestialContext = ctx;
        this.Size = 500;
    }

    Think() {

    }

    Draw(g) {
        var [drawX, drawY] = this.GetDrawPosition(this.Position.x, this.Position.y);
        g.ctx.beginPath();
        var grd = g.ctx.createRadialGradient(drawX, drawY, this.Size/2, drawX, drawY,this.Size);
        grd.addColorStop(0, "rgb(255,206,0)");
        grd.addColorStop(1, "transparent");
        g.ctx.fillStyle = grd;
        g.ctx.arc(drawX, drawY, this.Size, 0, 2*Math.PI);
        g.ctx.fill();
        g.ctx.closePath();
    }
}

class Asteroid extends CelestialBody {
    constructor(ctx, asteroidData) {
        super(ctx, asteroidData.Id, "Asteroid", asteroidData.Position, asteroidData.Size);
        this.CelestialContext = ctx;
        this.ClaimValue = 0;
        this.CurrentValue = asteroidData.CurrentResource;
        this.MaxValue = asteroidData.MaxResource;
        this.Claimed = asteroidData.Claimed;
        this.OwnerId = null;
    }

    UpdateResourceValue(value, max) {
        this.CurrentValue = value;
        this.MaxValue = max;
    }

    Think() {

    }

    Draw(g, localPlayerId) {
        var [drawX, drawY] = this.GetDrawPosition(this.Position.x, this.Position.y);
        g.ctx.beginPath();
        g.ctx.fillStyle = "grey";
        g.ctx.arc(drawX, drawY, this.Size*(this.CurrentValue/this.MaxValue), 0, 2*Math.PI);
        g.ctx.fill();
        g.ctx.closePath();

        //Claim circle.
        g.ctx.beginPath();
        if(this.OwnerId != localPlayerId) {
            g.ctx.fillStyle = "green";
        } else if(this.OwnerId == localPlayerId) {
            g.ctx.fillStyle = "blue";
        }
        if(!this.Claimed) {
            g.ctx.arc(drawX, drawY, this.Size*this.ClaimValue, 0, 2*Math.PI);
        } else {
            g.ctx.arc(drawX, drawY, this.Size*(this.CurrentValue/this.MaxValue), 0, 2*Math.PI);
        }
            g.ctx.fill();
            g.ctx.closePath();
    }
}