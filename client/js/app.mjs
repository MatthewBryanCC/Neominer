import { Player, PlayerRep } from './Player.mjs';
import { CelestialBodiesFactory } from './CelestialBodiesFactory.mjs';
import { GameObjectFactory } from './GameObjectFactory.mjs';
var app = null;
var LocalPlayer = null;

class App {
    constructor() {
        this.Active = false;
        this.WorldCelestialBodies = {};
        this.Graphics = new Graphics(this);
        this.ALL_PLAYERS = {};
        this.ALL_DRONES = {};
        this.ClaimObjects = {};
        this.cSocket = io();
        this.BindSocketEvents();
        this.CreateEventListeners();
    }

    Initialize() {

        //Start game loop
    }
    /* Start Socket Events */
    BindSocketEvents() {
        this.cSocket.on("InitialCelestialObjects", this.InitialBodiesLoad);
        this.cSocket.on("InitialPlayerConnection", this.InitialCharacterLoad);
        this.cSocket.on("InitialExistingPlayers", this.InitialExistingPlayersLoad)
        this.cSocket.on("InitialDrones", this.InitialDronesLoad);
        this.cSocket.on("PositionUpdates", this.UpdatePositions);
        this.cSocket.on("AsteroidUpdates", this.UpdateAsteroids);
        this.cSocket.on("PlayerConnection", this.CreateNewPlayer);
        this.cSocket.on("PlayerDisconnection", this.DeletePlayer);
        this.cSocket.on("AsteroidClaim", this.AsteroidClaimed)
        this.cSocket.on("DroneCreated", this.DroneCreated);
    }
    InitialBodiesLoad(data) {
        console.log("[Client Debug (Socket)]: Initial Celestial Body data received!");
        app.ConvertBodies(data);

        //Start game loop
        app.Active = true;
        app.GameLoop();
    }
    InitialCharacterLoad(data) {
        console.log("[Client Debug (Socket)]: Initial client data received!");
        LocalPlayer = new Player(data);
        LocalPlayer.cSocket = app.cSocket;
        app.Active = true;
    }
    InitialExistingPlayersLoad(data) {
        console.log("[Client Debug (Socket)]: Initial existing player data received!");
        app.ConvertPlayerReps(data);
    }
    InitialDronesLoad(data) {
        console.log("[Client Debug (Socket)]: Initial drone data loaded!")
        console.log("Drone Data: " + JSON.stringify(data));
        app.ConvertDrones(data);
    }
    DroneCreated(newDrone) {
        var goFactory = new GameObjectFactory(app);
        app.ALL_DRONES[newDrone.Id] = goFactory.ConvertNewDrone(newDrone);
    }
    UpdatePositions(data) {
        //Update players
        for(var id in data.player) {
            if(app.ALL_PLAYERS[id] === undefined && id != LocalPlayer.Id) {continue;}
            if(id == LocalPlayer.Id) {
                var playerData = data.player[id];
                LocalPlayer.Position.x = playerData.x;
                LocalPlayer.Position.y = playerData.y;
                continue;
            }
            app.ALL_PLAYERS[id].UpdatePosition(data.player[id])
        }
        //Update drones
        for(var id in data.drone) {
            if(app.ALL_DRONES[id] != null) {
                var newPosition = data.drone[id];
                app.ALL_DRONES[id].Position = newPosition;
            } else {
                console.log("[Drone Updates]: Drone does not exist locally? Shouldn't happen.")
            }
        }
        return;
    }
    UpdateAsteroids(data) {
        for(var id in data) {
            var claimData = data[id];
            if(!(id in app.ClaimObjects)) {
                app.ClaimObjects[id] = true;
            }
            app.WorldCelestialBodies.Asteroid[id].ClaimValue = claimData.ClaimValue;
            app.WorldCelestialBodies.Asteroid[id].OwnerId = claimData.OwnerId;
        }
        for(var id in app.ClaimObjects) {
            if(!(id in data) && !app.WorldCelestialBodies.Asteroid[id].Claimed) { 
                //Remove all asteroids no longer being claimed.
                app.WorldCelestialBodies.Asteroid[id].ClaimValue = 0;
                app.WorldCelestialBodies.Asteroid[id].OwnerId = null;
                delete app.ClaimObjects[id];
            }
        }
    }
    AsteroidClaimed(data) {
        var thisAsteroid = app.WorldCelestialBodies.Asteroid[data.AsteroidId];
        thisAsteroid.OwnerId = data.OwnerId;
        thisAsteroid.Claimed = true;
    }
    CreateNewPlayer(data) {
        console.log("[Client Debug (Socket)]: New Player connection detected! Data: " + JSON.stringify(data));
        app.ALL_PLAYERS[data.Id] = new PlayerRep(data.Id, data.Position, 30);
    }
    DeletePlayer(playerId) {
        delete app.ALL_PLAYERS[playerId];
    }
    /* End Socket Events */
    ConvertBodies(data) {
        var bodyFactory = new CelestialBodiesFactory(this);
        //Convert basic data into client objects.
        this.WorldCelestialBodies = {
            Star: bodyFactory.ConvertStars(data.Star), 
            Asteroid: bodyFactory.ConvertAsteroids(data.Asteroid)
        };
        return true;
    }
    ConvertPlayerReps(data) {
        var allPlayers = {};
        for(var i in data) {
            var playerData = data[i];
            var newPlayer = new PlayerRep(playerData.Id, playerData.Position, 30);
            allPlayers[newPlayer.Id] = newPlayer;
        }
        app.ALL_PLAYERS = allPlayers;
    }
    ConvertDrones(droneData) {
        var goFactory = new GameObjectFactory(this);
        app.ALL_DRONES = goFactory.ConvertDrones(droneData);
    }
    GameLoop() {

        app.Graphics.DrawLoop();

        requestAnimationFrame(app.GameLoop);
    }

    CreateEventListeners() {
        document.addEventListener("keydown", this.OnPlayerKeyDown);
        document.addEventListener("keyup", this.OnPlayerKeyUp)
    }

    OnPlayerKeyDown(event) {
        if(app.Active == false) { return; } //Ignore input if no data received yet.
        if(event.keyCode == 68) { //d
            LocalPlayer.Move("Right", true);
        }
        if(event.keyCode == 83) { //s
            LocalPlayer.Move("Down", true)
        }
        if(event.keyCode == 65) {// a
            LocalPlayer.Move("Left", true);
        }
        if(event.keyCode == 87) {//w
            LocalPlayer.Move("Up", true);
        }
        if(event.keyCode == 77) {//m
            LocalPlayer.CreateMiningDrone();
        }
    }
    OnPlayerKeyUp(event) {
        if(app.Active == false) { return; } //Ignore input if no data received yet.
        if(event.keyCode == 68) { //d
            LocalPlayer.Move("Right", false);
        }
        if(event.keyCode == 83) { //s
            LocalPlayer.Move("Down", false)
        }
        if(event.keyCode == 65) {// a
            LocalPlayer.Move("Left", false);
        }
        if(event.keyCode == 87) {//w
            LocalPlayer.Move("Up", false);
        }
        if(event.keyCode == 77) {//m
            LocalPlayer.holdingM = false;
        }
    }
}

class Graphics { 
    constructor(app) {
        this.ScrW = window.innerWidth;
        this.ScrH = window.innerHeight;
        this.worldOffsetX = 0;
        this.worldOffsetY = 0;

        console.log("Sizing: " + this.ScrW + " and " + this.ScrH);
        this.app = app;
        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");
    }

    DrawLoop() {
        this.ctx.clearRect(0,0,this.ScrW, this.ScrH);
        this.DrawWorld();
        this.DrawSelf();
        this.DrawPlayers();
        this.DrawDrones();
    }

    DrawWorld() {
        this.DrawStars();
        this.DrawAsteroids();
    }
    DrawStars() {
        if(this.app.WorldCelestialBodies.Star == {}) { return; }
        for(var key in this.app.WorldCelestialBodies.Star) {
            var star = this.app.WorldCelestialBodies.Star[key];
            star.Draw(this);
        }
    }
    DrawAsteroids() {
        if(this.app.WorldCelestialBodies.Asteroid == {}) {return;}
        for(var key in this.app.WorldCelestialBodies.Asteroid) {
            var asteroid = this.app.WorldCelestialBodies.Asteroid[key];
            asteroid.Draw(this, LocalPlayer.Id);
        }
    }

    DrawSelf() {
        this.worldOffsetX = LocalPlayer.Position.x;
        this.worldOffsetY = LocalPlayer.Position.y;

        LocalPlayer.Draw(this);
    }

    DrawPlayers() {
        for(var i in this.app.ALL_PLAYERS) {
            var player = this.app.ALL_PLAYERS[i];
            player.Draw(this);
        }
    }
    DrawDrones() {
        for(var i in this.app.ALL_DRONES) {
            var drone = this.app.ALL_DRONES[i];
            drone.Draw(this, LocalPlayer.Id);
        }
    }
}

app = new App();