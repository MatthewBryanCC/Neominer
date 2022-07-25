/* Client GameObjectFactory */
export class GameObjectFactory {

    constructor(ctx) {
        this.ApplicationContext = ctx;
    }

    ConvertDrones(droneData) {
        var newDrones = {};
        for(var id in droneData) {
            var data = droneData[id];
            if(data.Type == "Mining_Drone") {
                var newDrone = new Mining_Drone(this, data.Id, data.Position, data.Type, data.Size, data.OwnerId);
                newDrones[id] = newDrone;
            }
            //Other drone types.
        }
        return newDrones;
    }
    ConvertNewDrone(data) {
        if(data.Type == "Mining_Drone") {
            var newDrone = new Mining_Drone(this, data.Id, data.Position, data.Type, data.Size, data.OwnerId);
            return newDrone;
        }
        //Other drone types.
    }
}

class Drone {
    constructor(ctx, id, position, type, size, ownerId) {
        this.Id = id;
        this.Position = position;
        this.Type = type;
        this.Size = size;
        this.OwnerId = ownerId;
        this.GameObjectsContext = ctx;
    }
    GetDrawPosition(x, y) {
        var offsetX = this.GameObjectsContext.ApplicationContext.Graphics.worldOffsetX;
        var offsetY = this.GameObjectsContext.ApplicationContext.Graphics.worldOffsetY;
        var newX = x + (window.innerWidth / 2) - offsetX; // PLUS OFFSET!
        var newY = y + (window.innerHeight / 2) - offsetY; // PLUS OFFSET!
        return [newX, newY];
    }
}

class Mining_Drone extends Drone {
    constructor(ctx, id, position, type, size, ownerId) {
        super(ctx, id, position, type, size, ownerId);
    }

    Draw(g, localPlayerId) {
        var [drawX, drawY] = this.GetDrawPosition(this.Position.x, this.Position.y);
        g.ctx.beginPath();
        g.ctx.fillStyle = "grey";
        g.ctx.arc(drawX, drawY, this.Size, 0, 2*Math.PI);
        g.ctx.fill();
        g.ctx.closePath();

        
        g.ctx.beginPath();
        g.ctx.fillStyle = "green";
        console.log(this.OwnerId);
        if(localPlayerId == this.OwnerId) {
            g.ctx.fillStyle = "blue";
        }
        g.ctx.arc(drawX, drawY, this.Size*.8, 0, 2*Math.PI);
        g.ctx.fill();
        g.ctx.closePath();
    }
}