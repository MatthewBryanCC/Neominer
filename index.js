const {Player, AIEnemy} = require('./js/Player.js');
const CelestialBodiesFactory = require('./js/CelestialBodiesFactory.js');
const GameObjectFactory = require('./js/GameObjectFactory.js');

//Global App Variables
//====================
var GM = null;
var GAME_SERVER = null;
var SOCKET_LIST = {};
var PLAYER_LIST = {};
var AI_LIST = {};

function ServerIntialize() {
    var express = require('express');
    var app = express();
    var serv = require('http').Server(app);

    app.get('/',function(req, res) {
        res.sendFile(__dirname + '/client/index.html');
    });
    app.use('/client', express.static(__dirname + '/client'));

    var port = process.env.PORT || 8000;
    serv.listen(port);
    GAME_SERVER = new Server(app, serv);

    console.log("Server is running");
}

class Server {
    constructor(app, serv) {
       this.app = app;
       this.serv = serv;
       this.gm = new GameManager(this);
       GM = this.gm;
       this.io = null;

       this.CreateConnectionRules();
       this.gm.InitializeWorld();
    }

    CreateConnectionRules() {
        this.io = require('socket.io')(this.serv, {});
        var gameManager = this.gm
        this.io.sockets.on('connection', function(socket) {
            socket.id = Math.random();
            SOCKET_LIST[socket.id] = socket;

            var newUUID = CreateUUID("P");
            var newPlayer = new Player(newUUID, socket.id);
            PLAYER_LIST[socket.id] = newPlayer;
            
            console.log("Player connected! ID: " + newUUID);
            gameManager.SendInitialPlayerConnection(socket, newPlayer);
            gameManager.SendInitialCelestialObjects(socket);
            gameManager.SendInitialExistingPlayers(socket);
            gameManager.SendInitialDrones(socket);

            GAME_SERVER.BroadcastConnection(newPlayer);
            
            socket.on('disconnect', function() {
                var playerId = PLAYER_LIST[socket.id].Id;
                console.log("Player disconnected! ID: " + playerId);
                delete PLAYER_LIST[socket.id];
                delete SOCKET_LIST[socket.id];
                GAME_SERVER.BroadcastDisconnection(playerId);
            });

            /* Player Events */
            socket.on("PlayerMove", (data) => {
                var player = PLAYER_LIST[socket.id];
                player.ChangeDirection(data);
            });
            socket.on("PlayerCreate", (data) => {
                /*
                    Expecting (for drones): { 
                        Creation: "Drone",
                        Type: "Mining"
                    }
                */ 
                var player = PLAYER_LIST[socket.id];
                if(data.Creation == "Drone") {
                    var newDrone = player.CreateDrone(data.Type, GM);
                    if(newDrone != null) {
                        GM.Drones[newDrone.Id] = newDrone; //Add new drone to drone list.
                        var droneData =  Object.assign(Object.create(Object.getPrototypeOf(newDrone)), newDrone);
                        droneData.gm = null;
                        GAME_SERVER.BroadcastData("DroneCreated", droneData);
                    } else {
                        //failed to make drone
                        console.log("[Drones]: Failed to make drone. Not enough metal.");
                    }
                }
            });

        });
    }

    BroadcastConnection(newPlayer) {
        for(var i in SOCKET_LIST) {
            if(newPlayer.SocketId == i) { continue; }
            var socket = SOCKET_LIST[i];
            socket.emit("PlayerConnection", newPlayer);
        }
    }
    BroadcastDisconnection(playerId) {
        this.BroadcastData("PlayerDisconnection", playerId);
    }
    BroadcastData(event, data) {
        for(var i in SOCKET_LIST) {
            var socket = SOCKET_LIST[i];
            socket.emit(event,data);
        }
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

class GameManager {
    constructor(ctx) {
        this.Server = ctx;
        this.MAX_ASTEROIDS = 100;
        this.CelestialObjects = {
            Star: {},
            Asteroid: {}
        };
        this.Drones = {};
        this.ClaimingObjects = {};
        this.ClaimedObjects = {};
        this.LastMiningTick = 0;
        this.LastResourceTick = 0;
        this.GameTime = 0;
        this.StartTime = 0;
    }
    InitializeWorld() {
        //Create Star
        this.AddCelestialObject(CelestialBodiesFactory.CreateStar());
        //Create Asteroids
        this.CreateAsteroids();
        //Create AI
        this.CreateAI();
        //Set server loop
        this.StartTime = new Date().getTime();
        setInterval(this.ServerLoop, (100/12)) //~120 tick runtime.
    }

    AddCelestialObject(obj) {
        this.CelestialObjects[obj.Type][obj.Id] = obj;
    }
    CreateAI() {
        var newAI = new AIEnemy(CreateUUID(), this);
        AI_LIST[newAI.Id] = newAI;
    }
    CreateAsteroids() {
        for(var i=0;i<this.MAX_ASTEROIDS;i++) {
            this.AddCelestialObject(CelestialBodiesFactory.CreateAsteroid());
        }
    }

    CountCelestialType(type) {
        this.CelestialObjects[type].length;
    }

    SendInitialCelestialObjects(socket) {
        socket.emit("InitialCelestialObjects", this.CelestialObjects);
    }
    SendInitialPlayerConnection(socket, player) {
        socket.emit("InitialPlayerConnection", player);
    }
    SendInitialExistingPlayers(socket) {
        var data = JSON.parse(JSON.stringify(PLAYER_LIST)); //Copy data
        delete data[socket.id]; //Ignore self.
        //Delete all server only data.
        for(var i in data) {
            delete data[i].ServerOnly;
        }
        socket.emit("InitialExistingPlayers", data);
    }
    SendInitialDrones(socket) {
        //Hacky copying to not send game manager data.
        var droneClone = Object.assign(Object.create(Object.getPrototypeOf(this.Drones)), this.Drones);
        for(var id in droneClone) {
            var thisDroneClone = Object.assign(Object.create(Object.getPrototypeOf(droneClone[id])), droneClone[id]);
            droneClone[id] = thisDroneClone;
            //Delete unnecessary properties.
            thisDroneClone.gm = null;
        }
        socket.emit("InitialDrones", droneClone);
    }

    ServerLoop() {
        var timeNow = new Date().getTime();
        GM.GameTime = (timeNow - GM.StartTime)/1000;
        var playerPositionInfo = GM.UpdatePlayers();
        //GM.UpdateAI();
        var dronePositionInfo = GM.UpdateDrones();
        var movementUpdates = {player: playerPositionInfo, drone: dronePositionInfo};
        GM.SendMovementUpdates(movementUpdates);
        GM.CheckClaimingObjects();
        GM.CheckClaimedObjects();
    }

    /* Loop Functions */

    CheckClaimingObjects() {
        var updateData = {};
        for(var i in this.ClaimingObjects) {
            var claimObj = this.ClaimingObjects[i];
            claimObj.AssessClaim(this);
            var newData = { ClaimValue: claimObj.ClaimValue, OwnerId: claimObj.Claimer.Id };
            updateData[claimObj.Id] = newData;
        }
        //Broadcast Object Claims
        if(updateData != {}) {
            this.Server.BroadcastData("AsteroidUpdates", updateData);
        }
    }
    CheckClaimedObjects() {
        if(this.TimeSinceLastResourceTick() >= 1) {
            for(var id in this.ClaimedObjects) {
                var claimedObj = this.ClaimedObjects[id];
                if(claimedObj.CanBeHarvested()) {
                    var owner = this.GetPlayerById(claimedObj.Owner.Id);
                    claimedObj.ClaimResources(owner);
                }
            }
            this.LastResourceTick = this.GameTime;
        }
    }

    UpdateAI() {
        for(var id in AI_LIST) {
            var thisAI = AI_LIST[id];
            thisAI.Think();
        }
    }

    UpdatePlayers() {
        var positionInfo = this.MovePlayers();
        return positionInfo;
    }

    UpdateDrones() {
        var positionInfo = {};
        for(var id in this.Drones) {
            //Update movement.
            var drone = this.Drones[id];
            var moved = drone.Think();
            if(moved) {
                positionInfo[id] = {x: drone.Position.x, y: drone.Position.y};
                drone.AssessCollisions(this.CelestialObjects, this);
            }
            
        }
        return positionInfo;
    }
    

    MovePlayers() {
        var positionInfo = {};
        for(var key in PLAYER_LIST) {
            var player = PLAYER_LIST[key];
            var playerHasMoved = player.Move();
            if(playerHasMoved) {
                player.AssessCollisions(this.CelestialObjects, this);
            }
            positionInfo[player.Id] = {x: player.Position.x, y: player.Position.y};
        }
        return positionInfo;
        
    }

    SendMovementUpdates(positionInfo) {
        for(var socketId in SOCKET_LIST) {
            var socket = SOCKET_LIST[socketId];
            socket.emit("PositionUpdates", positionInfo);
        }
    }
    TimeSinceLastResourceTick() {
        return (this.GameTime - this.LastResourceTick);
    }
    GetPlayerById(id) { 
        for(var sockId in PLAYER_LIST) {
            var thisPly = PLAYER_LIST[sockId];
            if(thisPly.Id == id) {
                return thisPly;
            }
        }
        return null;
    }
}

ServerIntialize();