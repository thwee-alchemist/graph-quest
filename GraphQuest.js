
"use strict";

var vertex_id = 0;
class Vertex{
    constructor(){
        this.id = vertex_id++;
        this.neighbors = new Set();
        this.edges = new Set();
    }

    release(){
        for(var v of this.neighbors){
            v.neighbors.delete(this);
        }
        delete this.id;
    }
}

var edge_id = 0;
class Edge{
    constructor(src, tgt){
        this.id = edge_id++;
        this.src = src;
        this.tgt = tgt;
        
        src.neighbors.add(tgt);
        tgt.neighbors.add(src);

        src.edges.add(this);
        tgt.edges.add(this);
    }
    
    release(){
        this.src.release();
        this.src.edges.delete(this);
        delete this.src;

        this.tgt.release();
        this.tgt.edges.delete(this);
        delete this.tgt;
    }
}

var graph_id = 0;
class Graph {
    constructor(){
        this.id = graph_id++;
        this.V = new Map();
        this.E = new Map();
    }
    
    add_vertex(vertex){
        this.V.set(vertex.id, vertex);
        return vertex;
    }
    
    remove_vertex(id){
        this.V.delete(id);
    }
    
    add_edge(src_vertex, tgt_vertex){
        var edge = new Edge(src_vertex, tgt_vertex);
        this.E.set(edge.id, edge);
        return edge;
    }
    
    remove_edge(id){
        this.E.delete(id);
    }
    
    /*
      Lists a random vertex.
    */
    random_vertex(){
        var items = Array.from(this.V.values());
        return items[Math.round(Math.random() * items.length)];
    }
    
    /*
      Creates an edge between two random vertices. 
    */
    random_edge(){
        
        var v1 
        while((v1 = this.random_vertex()) == undefined);

        var v2;
        while((v2 = this.random_vertex()) == v1 || (v2 == undefined));
        
        return this.add_edge(v1, v2);
    }
    
    clear(){
        this.E.clear();
        this.V.clear();
    }

    connected(){
        var source = this.random_vertex();
        for(var goal of this.V){
            var path = this.a_star(source, goal);
            if(path.length >= 2){
                return true;
            }else{
                return false; 
            }
        }
    }
}


Graph.prototype.a_star = function(start, goal){
    // The set of nodes already evaluated. 
    var closed_set = new Set();
    
    // The set of currently discovered nodes that are not evaluated yet.
    // Initially, only the start node is known. 
    var open_set = new Set([start]);
    
    // For each node, which node it can most efficiently be reached from. 
    // If a node can be reached from manny nodes, came_from will eventually
    // contain the most efficient step. 
    var came_from = new Map();
    
    // For each node, the cost of getting from the start node to that node.
    var g_score = new Map()
    this.V.forEach(function(vertex){
        g_score.set(vertex, Infinity);
    });
    
    // For the first node, that value is completely heuristic. 
    g_score.set(start, 0.0);
    
    // For each node, the total cost of getting from the start node to the 
    // goal by passing by that node. That value is partly known, partly
    // heuristic. 
    var f_score = new Map();
    this.V.forEach(function(vertex){
        f_score.set(vertex, Infinity);
    });
    
    // For the first node, that value is completely heuristic. 
    f_score.set(start, heuristic_cost_estimate(start, goal));
    
    while(open_set.size){
        var entries_it = open_set.entries();
        var entries = [];
        for(var entry of entries_it){
            entries.push(entry[0]);
        }
        entries.sort((a, b) => f_score.get(a) - f_score.get(b));
        var current = entries[0];
        // why keep it in a set if we're just gonna sort it anyway? 
        
        if(current === goal){
            return reconstruct_path(came_from, current);
        }
        
        open_set.delete(current);
        closed_set.add(current);
        
        var neighbors = current.neighbors.values();
        for(var neighbor of neighbors){
            if(closed_set.has(neighbor)){
                continue;
            }
            
            if(!open_set.has(neighbor)){
                open_set.add(neighbor);
            }
            
            var tentative_g_score = g_score.get(current) + 1.0;
            if(tentative_g_score >= g_score.get(neighbor)){
                continue;
            }
            
            came_from.set(neighbor, current);
            g_score.set(neighbor, tentative_g_score);
            f_score.set(neighbor, g_score.get(neighbor) + heuristic_cost_estimate(neighbor, goal));
        }
    }
    
    return [];
}

function reconstruct_path(came_from, current){
    var total_path = [current];
    while(came_from.has(current)){
        current = came_from.get(current);
        total_path.push(current);
    }
    
    return total_path.reverse();
}

function heuristic_cost_estimate(start, goal){
    return 1.0 - (1.0/start.neighbors.size > 0 ? start.neighbors.size : 1);
}

function dist_between(start, goal){
    return 1.0;
}

"use strict";

const EventEmitter = require('events');
class FleetEventEmitter extends EventEmitter {};

var fleet_id = 0;
class Fleet{
    constructor(ruler, efficiency, destination){
        this.id = fleet_id++;
        this.ruler = ruler;
        this.efficiency = efficiency;
        this._strength = 0;
        // what if a constructor automatically assigned incoming parameters by name? 
        this.destination = destination;
        
        this.events = new FleetEventEmitter();
    }
    
    get strength(){
        return this._strength;
    }
    
    set strength(val){
        if(val >= 0){
            this._strength = val;
        }else{
            this._strength = 0;
        }
    }
    
    get all(){
        return this.strength;
    }
    
    get available(){
        return Math.max(this._strength-1, 0);
    }
    
    get might(){
        return Math.round(this.strength * this.efficiency);
    }
    
    turn(){
        return this.travel();
    }

    /*
        Returns either nothing or a created fleet with set destination. 
    */
    dispatch(strength, destination){
        console.assert(destination);
        console.assert(strength <= this.available);
        var fleet = new Fleet(this.ruler, this.efficiency, destination);
        fleet.add(this.remove(strength));
        return fleet;
    }
    
    add(s){
        s = Math.round(s)
        this.strength += s;
        return s; // this is intentional
    }
    
    remove(s){
        s = Math.round(s)
        this.strength -= s;
        return s;
    }

    travel(){
        console.log(`${this.id} travelling to ${this.destination.id}.`)
        var star_system = this.destination;
        if(!star_system){
            return;
        }

        star_system.universe.travelling.delete(this);
        
        if(star_system.ruler == this.ruler){
            this.check_in(star_system);
            return null;
        }else{
            var survivor = this.battle(star_system.fleet);
            return survivor.rule_change ? survivor : null;
        }
    }

    battle(fleet){
        var battle_result = Math.round(this.might - fleet.might);
        if(battle_result > 0){
            this.strength = battle_result;
            this.destination.fleet = this;
        }else{
            fleet.strength = Math.abs(battle_result);
        }
        
        var battle_info = {
            attacking: this.ruler, 
            defending: fleet.ruler, 
            star: this.destination,
            survivor: battle_result > 0 ? this : fleet,
            rule_change: this != this.destination.fleet
        };

        
        var cache = new Set();
        battle_info = JSON.stringify(battle_info, function(key, value) {
            if (typeof value === 'object' && value !== null) {
                if (cache.has(value)) {
                    // Circular reference found, discard key
                    return;
                }
                
                // Store value in our collection
                cache.add(value);
            }
            return value;
        });
        cache = null; // Enable garbage collection

        this.events.emit('battle', battle_info);
        fleet.events.emit('battle', battle_info);
        
        // return the winning fleet.
        return this.destination.fleet;
    }
    
    check_in(planet){
        planet.fleet.add(this.remove(this.strength));
    }
}

function choice(s){
    if(s.size == 0){
        return [];
    }
    
    var l = Array.from(s);
    return l[Math.floor(Math.random() * l.length)];
}

var player_id = 0;
class Player{
    constructor(name){
        this._name = name;
        this.color = Math.floor(Math.random() * 0xffffff);
        this.ready = false;
        this.id = player_id++;
        this.socket = null;
    }

    set name(val){
        this._name = val;
    }

    get name(){
        return this._name;
    }
    
    join(game){
        game.map.add_player(this);
    }

    random_moves(map){
        var moves = [];
        map.player_systems(this).forEach((star_system) => {
            var goal = choice(star_system.neighbors);
            var fleet = star_system.dispatch(Math.round(Math.random()*planet.fleet.available), goal);
            map.travelling.add(fleet);
            moves.push(fleet);
        });
        console.log('moves', moves);
        return moves; 
    }
}


class StarSystem extends Vertex{
    constructor(efficiency, production_rate, ruler, universe){
        super();
        this.efficiency = efficiency;
        this.production_rate = Math.round(production_rate);
        this.fleet = new Fleet(ruler, this.efficiency, this);
        this.fleet.add(this.production_rate);
        this.universe = universe;
        
        return this;
    }
    
    turn(){
        this.fleet.add(this.production_rate);
    }
    
    get ruler(){
        return this.fleet.ruler;
    }
    
    /*
        Only to be called by GameMap::add_player(...)
    */
    set ruler(val){
        this.fleet.ruler = val;
    }

    get strength(){
        return this.fleet.strength;
    }
}

class GameMap extends Graph {
    constructor(stars, wormholes){
        super();
        this.travelling = new Set();
        this.round = 0;
        
        this.players = [];
        this.stars = stars; // number
        this.wormholes = wormholes; // number
        
        this.generate();

        this.sockets_by_players = new WeakMap();
        this.players_by_sockets = new WeakMap();
    }
    
    /*
        Generates a map with this.star's number of vertices
        and this.wormholes number of wormholes.
    */
    generate(){
        this.clear();

        var star_systems = [];

        for(var i=0; i<this.stars; i++){
            star_systems.push(this.add_vertex(new StarSystem(
                Math.random(), 
                Math.round(Math.random()*10), 
                undefined, 
                this
            )));
        }

        var last_star = star_systems[0];
        for(var i=1; i<this.stars; i++){
            this.add_edge(last_star, star_systems[i]);
            last_star = star_systems[i];
        }

        for(var i=0; i<this.wormholes; i++){
            this.create_random_wormhole();
        }
    }
    
    /*
        Adds a player to the map and assigns a random untaken star.
        Returns a star if successful, false otherwise. 
    */
    add_player(player, socket){
        this.players.push(player);
        for(var star of this.V){
            star = star[1];
            if(star.ruler === undefined){
                star.ruler = player;
                return star;
            }
        }
        star.production_rate = 10;

        this.sockets_by_players.set(player, socket);
        this.players_by_sockets.set(socket, player);
        return false;
    }
    
    remove_player(player){
        this.players.splice(this.players.indexOf(player));
        var socket = this.sockets_by_players.get(player);
        this.sockets_by_players.delete(player);
        this.players_by_sockets.delete(socket);
    }
    
    /*
        Returns a random vertex from the set. 
    */
    get_random_system(){
        return this.random_vertex();
    }
    
    /*
        Creates and returns an edge between two random vertices. 
        Supposes there are two vertices, or it will run forever. 
    */
    create_random_wormhole(){
        return this.random_edge();
    }
    
    /*
        Advances the game by one round.
        All travelling ships arrive at their destinations.
        All players' ready states are reset to false.
    */
    turns(){
        this.round++;
        
        var changed_systems = [];
        this.travelling.forEach(fleet => {
            var system = fleet.turn();
            if(system){
                changed_systems.push(system);
            }
        });
        
        this.V.forEach(system => {
            system.turn();
        })

        return changed_systems;
    }
    
    /*
        Determines whether there's a winner. 
        Returns false if there's no winner, 
        and the winner if there is one. 
    */
    winner(){
        var winner = undefined;
        this.V.forEach(system => {
            if(winner === undefined){
                winner = system.ruler;
            }else{
                winner = winner == system.ruler ? winner : false
            }
        });

        return winner;
    }

    player_lost(player){
        var has_one = false;
        this.V.forEach(system => {
           has_one = has_one || (system.ruler == player);
        });

        return !has_one;
    }
};

var game_id = 0;
class Game{
    constructor(name, stars, wormholes, password){
        this.name = name;
        this.id = game_id++;
        this.map = new GameMap(stars, wormholes);
        this.open = true;
        this.password = password;
        this.sockets = new Set();
        this.moves = [];
    }

    add_moves(moves){
        this.moves.concat(moves);
    }

    turn(){
        this.moves.forEach(m => {
            var source = this.map.V.get(m.source_idss)
        })
    }
    
    get players(){
        return this.map.players;
    }

    ready(){
        for(var i=0; i<this.players.length; i++){
            if(!this.players[i].ready){
                return false;
            }
        }
        
        return true;
    }

    player_map(player){
        
        var map = {
            V: new Set(),
            E: new Set()
        }

        if(player === undefined){
            this.map.V.forEach(star => {
                map.V.add(star);
            });
            
            this.map.E.forEach(e => {
                map.E.add(e);
            })
        }else{
            this.map.V.forEach(star => {
                if(star && (star.ruler == player)){
                    map.V.add(star);
                    star.neighbors.forEach(other_star => {
                        map.V.add(other_star);
                    });
                    
                    star.edges.forEach(e => {
                        map.E.add(e);
                    });
                }
            });
        }
        
        map.V = Array.from(map.V).map(star => {
            if(player && star.ruler == player){
                return {
                    id: star.id,
                    production_rate: star.production_rate,
                    efficiency: star.efficiency,
                    strength: star.fleet.strength,
                    ruler: star.ruler
                }
            }else{
                return {
                    id: star.id,
                    ruler: star.ruler
                }
            }
        }); 
        map.E = Array.from(map.E).map((wormhole) => {
            return {
                id: wormhole.id,
                source: wormhole.src.id,
                target: wormhole.tgt.id
            };
        });

        return map;
    }
    
    send_player_maps(){
        this.sockets.forEach(s => {
            var map = this.player_map(s.player);
            console.log('player map', JSON.stringify(map));
            s.emit('game map', JSON.stringify(map));
        });
    }
    
    reset_players_ready(){
        this.sockets.forEach(s => {
            s.player.ready = false;
        })
    }

    reset_clients_ready(){
        this.sockets.forEach(s => {
            try{
                s.player.ready = false;
            }catch(e){
                console.warn(e);
            }
        });
    }
    
    announce_new_round(){
        this.sockets.forEach(s => {
            s.emit('new round', this.map.round);
        });
    }

    kick_lost_players(){
        this.sockets.forEach(s => {
            if(this.map.player_lost(s.player)){
                this.map.remove_player(s.player);
                s.emit('You lost.');
                s.to(this.id.toString()).broadcast.emit('player defeated', s.player);
            }
        });
    }
}

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var nocache = require('nocache');
var path = require('path');

app.use(express.static('public'));
app.use(nocache());

app.get('/', function(req, res){
    res.sendFile('index.html', {root: path.join(__dirname, 'public')});
});

http.listen(3000, function(){
    console.log('listening on *:3000');
});

var setup_fleet_events = function(game, fleet, socket){
    fleet.events.on('battle', (battle_info) => {
        socket.emit('battle', battle_info);
        socket.emit('battle', battle_info);
        game.send_player_maps();
    });
}

var ready = function(game){
    var each = true;
    game.sockets.forEach(s => {
        each = each && s.player.ready;
    });
    return each;
}

var games = new Set();
var players = new Set();
io.on('connection', function(socket){
    console.log('a user connected'); 
    
    console.log('asking for name...');
    socket.emit('name?');
    
    /*
        on name 
        
        assigns the player's name and ultimately the player to the socket. 
    */
    socket.on('name:', name => {
        console.log('got reply for name...');
        socket.name = name;
        socket.player = new Player(name);
        socket.player.ready = false;
        console.log('name:', name);
        players.add(socket.player);
    });
    
    /*
        on games? 
        
        Returns a list of open games. 
    */
    socket.on('games?', () => {
        console.log('asked for games');
        socket.emit('games:', games.filter(game => game.open));
    });
    
    /*
        creates a new game and broadcasts it to all sockets
    */
    socket.on('new game', spec => {
        console.log('creating new game', spec.name);
        var game = new Game(spec.name);
        game.open = true;
        
        game.map.stars = spec.stars;
        game.map.wormholes = spec.wormholes;
        game.map.generate();
        
        games.add(game);
        socket.emit('games:', games.filter(game => game.open));
        socket.broadcast.emit('games:', games.filter(game => game.open));
    });
    
    /*
        join game
        
        This event is fired when the player selects a game in the client.
    */
    socket.on('join game:', id => {
        // retrieve the game
        var game = games.filter(game => game.id == id)[0];
        socket.game = game;
        socket.join(game.id.toString());
        
        // add this socket to the game
        game.sockets.add(socket);
        
        // assigns a star to the player
        var star = game.map.add_player(socket.player);
        if(!star){
            console.log(`${socket.player._name} tried joining full game ${game.name}.`);
            socket.emit('game full');
            return;
        }
        star.production_rate = 10; 
        
        // setup fleet events such as battle or star system conquered
        setup_fleet_events(game, star.fleet, socket);
        
        // send the complete map to the player
        var map = JSON.stringify(game.player_map(undefined));
        socket.emit('game map', map);
        socket.emit('color', socket.player.color);
        socket.player.ready = false;
        
        // communicates the newly assigned star to all connected sockets
        socket.to(game.id.toString()).emit('star system conquered', {player: socket.player, star_id: star.id});
        game.started = false;
    });
    
    socket.on('ready', (moves) => {
        socket.player.ready = true;
        console.log(`${socket.player.name} ready...`);
        
        var game = socket.game;
        if(!game.started){
            if(game.ready()){
                console.log(`all players ready, distributing ${socket.game.name}'s maps to players...`);
                game.started = true;
                game.open = false;
                
                game.reset_clients_ready();
                game.announce_new_round();
                
                game.send_player_maps();
            }
        }else{
            var game = socket.game;
            
            // register each of the moves, creating a corresponding fleet.
            for(var i=0; i<moves.length; i++){
                var move = moves[i];
                var source = game.map.V.get(move.source);
                if(source.ruler != socket.player){
                    continue;
                }

                var target = game.map.V.get(move.target);

                if((source !== undefined) && (target !== undefined) && (move.number < source.strength)){
                    var fleet = source.fleet.dispatch(move.number, target);
                    setup_fleet_events(game, fleet, socket);
                    game.map.travelling.add(fleet);
                    socket.emit('move confirmed', move);
                }
            }
            
            if(ready(game)){
                game.announce_new_round();

                var changed_systems = game.map.turns();
                game.kick_lost_players();

                changed_systems.forEach(changed_system => {
                    socket.to(game.id.toString()).emit('starsystem conquered', {
                        star_id: changed_system.star.id,
                        player: changed_system.survivor
                    });
                });
                console.log('the galaxy turned');

                game.send_player_maps();
                game.reset_clients_ready();
                game.reset_players_ready();

                var winner = game.map.winner();
                if(winner){
                    game.sockets.forEach(s => {
                        if(s.player == winner){
                            s.emit('You won.');
                        }
                    });
                }
            }
        }
    });
    
    socket.on('disconnect', () => {
        if(socket.player){
            players.delete(socket.player);
            socket.emit('players', Array.from(players));
            if(socket.game){
                socket.to(socket.game.id.toString()).broadcast.emit('players', Array.from(players));
            }
        }
        if(socket.game){
            var game = socket.game;
            // replace player's star with undefined stars
            game.map.V.forEach(s => {
                if(s.ruler == socket.player){
                    console.log(`star ${s.id} still belongs to ${socket.player._name}`);
                    s.ruler = undefined;
                    socket.to(game.id).broadcast.emit('star system conquered', {player: null, star_id: s.id});
                }
            })
            
            socket.game.map.remove_player(socket.player);
            socket.to(game.id).broadcast.emit('player left', socket.player.id);
            game.sockets.delete(socket);
        }
    });
});

Set.prototype.filter = function(predicate){
    var arr = [];
    for(var elem of this){
        if(predicate(elem)){
            arr.push(elem);
        }
    }
    return arr;
};