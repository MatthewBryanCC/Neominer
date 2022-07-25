/* CLIENT PLAYER */
class Entity {
    constructor() {

    }
    GetDrawPosition(x, y) {
        var newX = x + (window.innerWidth / 2); // PLUS OFFSET!
        var newY = y + (window.innerHeight / 2); // PLUS OFFSET!
        return [newX, newY];
    }
}

class Player extends Entity {
    constructor(data) {
        super();
        this.Id = data.Id;
        this.cSocket = null;
        this.SocketId = data.SocketId;
        this.Position = data.Position;
        this.Directions = data.Directions;
        this.Size = data.Size;
        this.holdingM = false;
    }
    CreateMiningDrone() {
        if(this.holdingM == false) {
            var data = {
                Creation: "Drone",
                Type: "Mining"
            }
            this.cSocket.emit("PlayerCreate", data);
            this.holdingM = true;
        }
    }
    Move(direction, toggle) {
        if(this.Directions[direction] == !toggle) {
            //Not already pressing.
            var data = {direction: direction, toggle: toggle}
            this.Directions[direction] = toggle;
            this.cSocket.emit("PlayerMove", data);
        }
        return;
    }
    Draw(g) {
        var [drawX, drawY] = [window.innerWidth/2, window.innerHeight/2];
        g.ctx.beginPath();
        g.ctx.fillStyle = "grey";
        g.ctx.arc(drawX, drawY, this.Size, 0, Math.PI*2);
        g.ctx.fill();
        g.ctx.closePath();
        g.ctx.beginPath();
        g.ctx.fillStyle = "blue";
        g.ctx.arc(drawX, drawY, this.Size*.8, 0, Math.PI*2);
        g.ctx.fill();
        g.ctx.closePath();
    }
}

class PlayerRep {
    constructor(id, position, size) {
        this.Id = id;
        this.Position = position;
        this.Size = size
    }
    UpdatePosition(positionData) {
        this.Position = positionData;
    }
    Draw(g) {
        var [drawX, drawY] = this.GetDrawPosition(g, this.Position.x, this.Position.y);
        g.ctx.beginPath();
        g.ctx.fillStyle = "grey";
        g.ctx.arc(drawX, drawY, this.Size, 0, Math.PI*2);
        g.ctx.fill();
        g.ctx.closePath();
        g.ctx.beginPath();
        g.ctx.fillStyle = "green";
        g.ctx.arc(drawX, drawY, this.Size*.8, 0, Math.PI*2);
        g.ctx.fill();
        g.ctx.closePath();
    }
    GetDrawPosition(g, x, y) {
        var offsetX = g.worldOffsetX;
        var offsetY = g.worldOffsetY;
        var newX = x + (window.innerWidth / 2) - offsetX;
        var newY = y + (window.innerHeight / 2) - offsetY;
        return [newX, newY];
    }
}

export { Player, PlayerRep }

