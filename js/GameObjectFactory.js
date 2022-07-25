module.exports = class GameObjectFactory {
    constructor() {

    }
    static CreateMiningDrone(owner) {
        console.log("Trying to make mining drone!");
        var newMiningDrone = new MiningDrone(CreateUUID("MDrone"), owner.Position, "Mining_Drone", owner);
        owner.ServerOnly.Drones[newMiningDrone.Id] = newMiningDrone;
        return true;
    }
    static CreateGuardDrone(owner) {

    }
}

class PlayerDrone {
    constructor(id, position, type, owner) {
        this.Id = id;
        this.Position = position;
        this.Type = type;
        this.Owner = owner;
    }
}

class MiningDrone extends PlayerDrone {
    constructor(id, position, type, owner) {
        super(id, position, type, owner);
    }

    Think() {
        console.log("Mining drone thinks!");
    }
}

class GuardDrone extends PlayerDrone {
    constructor(id, position, type, owner) {
        super(id, position, type, owner);
    }
}