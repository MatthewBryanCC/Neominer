const Player = require('./js/Player.js');
const CelestialBodiesFactory = require('./js/CelestialBodiesFactory.js');
const GameObjectFactory = require('./js/GameObjectFactory.js');

//Global App Variables
//====================
var GM = null;
var GAME_SERVER = null;
var SOCKET_LIST = {};
var PLAYER_LIST = {};

function ServerIntialize() {
    var express = require('express');
    var app = express();
    var serv = require('http').Server(app);

    app.get('/',function(req, res) {
        res.sendFile(__dirname + '/client/index.html');
    });
    app.use('/client', express.static(__dirname + '/client'));

    var port = process.env.PORT;
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
                    player.CreateDrone(data.Type);
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
        this.ClaimObjects = {};
    }
    InitializeWorld() {
        //Create Star
        this.AddCelestialObject(CelestialBodiesFactory.CreateStar());
        //Create Asteroids
        this.CreateAsteroids();
        //Set server loop
        setInterval(this.ServerLoop, (100/12)) //~120 tick runtime.
    }

    AddCelestialObject(obj) {
        this.CelestialObjects[obj.Type][obj.Id] = obj;
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
        var data = JSON.parse(JSON.stringify(PLAYER_LIST));
        delete data[socket.id]; //Ignore self.
        //Delete all server only data.
        for(var i in data) {
            delete data[i].ServerOnly;
        }
        socket.emit("InitialExistingPlayers", data);
    }

    ServerLoop() {
        GM.UpdatePlayers();
        GM.CheckClaimObjects();
    }

    /* Loop Functions */

    CheckClaimObjects() {
        var updateData = {};
        for(var i in this.ClaimObjects) {
            var claimObj = this.ClaimObjects[i];
            claimObj.AssessClaim(this);
            var newData = { ClaimValue: claimObj.ClaimValue, OwnerId: claimObj.Claimer.Id };
            updateData[claimObj.Id] = newData;
        }
        //Broadcast Object Claims
        if(updateData != {}) {
            this.Server.BroadcastData("AsteroidUpdates", updateData);
        }
    }

    UpdatePlayers() {
        this.GainPlayerResources(); //TODO: Change this to occur on a timed basis.
        this.MovePlayers();
    }
    
    GainPlayerResources() {
        for(var i in PLAYER_LIST) {
            var player = PLAYER_LIST[i];
            player.AssessResourceClaims();
        }
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
        for(var socketId in SOCKET_LIST) {
            var socket = SOCKET_LIST[socketId];
            socket.emit("PositionUpdates", positionInfo);
        }
    }
}

ServerIntialize();