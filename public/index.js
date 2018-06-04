/*
  index.js
  GraphQuest v0.5
  Joshua Marshall Moore
  February 19th, 2018
*/

var server_id_to_client_vertex = new Map();
var client_vertex_to_server_id = new Map();
var server_edge_to_client_edge = new Map();
var client_edge_to_server_edge = new Map();
var name = undefined;
var moves = [];
var CUBE_SIZE = 5;

var fourd = new FourD();
fourd.init('#stuff', {
    width: window.innerWidth, 
    height: window.innerHeight, 
    //background: 'public/Su_Song_Star_Map_1.JPG'
});
fourd._internals.camera.position.z = -25;

var socket = io();

var choice = function(l){
    return l[Math.floor(Math.random() * l.length)];
};


socket.on('name?', function(){
    console.log('asked for name...');
    name = prompt('What would you like to be called?') || "Stranger";
    $('.header').text(`Hello, ${name}`);
    socket.emit('name:', name);
});

socket.emit('games?');

socket.on('games:', games => {
    console.log('games', games);
    $('.game').remove();
    for(var i=0; i<games.length; i++){
        $('#games').append(`<li class="game" id="game-${games[i].id}"><a href="javascript:join_game(${games[i].id})">${games[i].name}</a></li>`);
    }
});

socket.on('battle', battle_info => {
    $('#notifications').append(`<li>Battle between ${battle_info.attacking._name} and ${battle.info.defending._name} at ${battle_info.star.id}...M/li>`);
    $('#notifications').append(`<li>${battle_info.rule_change ? 
        battle_info.defending._name + ' holds ' + battle_info.star.id : 
        battle_info.attacking._name + ' wins ' + battle_info.star.id}.</li>`);
    });

socket.on('You lost.', function(){
    $('#notifications').append('<li>You lost.</li>');
});

socket.on('You won.', function(){
    $('#notifications').append(`<li>You won.</li>`);
})

socket.on('player defeated', player => {
    $('#notifications').append(`${player._name} defeated.`);
});

/*
    Lists all of the players currently online. 
*/
socket.on('players', players => {
    console.log('players', players);
    $('.player').remove();
    for(var i=0; i<players.length; i++){
        $('#players').append(`<li x-player-id="${players[i].id}" class="player" style="color: ${players[i].color};">${players[i]._name}</li>`);
    }
});

/*
    Removes a player from the lsit of players. 
*/
socket.on('player left', player_id => {
    $(`[x-player-id=${player_id}]`).remove();
});

/*
    game map:
    This event triggers a redrawing of the map. 
    
    TODO: Work a diff in there 
*/
socket.on('game map', map => {
    console.log('game map', map);
    map = JSON.parse(map);
    
      fourd.clear();
    
    for(var i=0; i<map.V.length; i++){
        var vertex_options = map.V[i].ruler ? {
            cube: {
                size: CUBE_SIZE,
                color: map.V[i].ruler.color
            }
        } : {
            cube: {
                size: CUBE_SIZE,
                texture: choice(['star.jpg', 'double-star.jpg', 'supernova.jpg'])
            }
        };
        var vertex = fourd.graph.add_vertex(vertex_options);
        
        server_id_to_client_vertex.set(map.V[i].id, vertex);
        client_vertex_to_server_id.set(vertex, map.V[i].id);
        vertex.server_vertex = map.V[i];
    }
    
    for(var i=0; i<map.E.length; i++){
        var edge = fourd.graph.add_edge(
            server_id_to_client_vertex.get(map.E[i].source),
            server_id_to_client_vertex.get(map.E[i].target)
        );
        
        server_edge_to_client_edge.set(map.E[i], edge);
        client_edge_to_server_edge.set(edge, map.E[i]);
    }
});

socket.on('check-in', event => {
    $('#notifications').append($(``))
});

/*
    Star System Conquered
    Gets called when a star changes ownership. 
*/
socket.on('star system conquered', event => {
    console.log('star system conquered', event);
    // identify display vertex from event.star
    var old_vertex = server_id_to_client_vertex.get(event.star_id);
    
    // replace the cube with another cube
    var options = event.player ? {cube: {
        size: CUBE_SIZE,
        color: event.player.color
    }} : {cube: {
        size: CUBE_SIZE,
        texture: choice(['star.jpg', 'double-star.jpg', 'supernova.jpg'])
    }};
    console.log('changing cube');
    old_vertex.replace_cube(options);
});

socket.on('color', color => {
    console.log('color', '0x' + parseInt(color).toString(16));
    $('.header').css({'color': '#' + parseInt(color).toString(16)});
}); 

socket.on('game full', () => {
    alert('game full');
});

$('#ready').click(function(){
    $('#ready').prop('disabled', true);
    console.log('clicked ready');
    socket.emit('ready', moves);
    console.log('moves sent...');
    moves = [];
});

socket.on('new round', round => {
    $('#ready').prop('disabled', false);
    $('#notifications').append(`<li>Round ${round} begins...</li>`);
});

socket.on('move confirmed', move => {
    $('#notifications').append(`<li>Sending ${move.number} ships from ${move.source} to ${move.target}.</li>`);
});

$('#submit-move').prop('disabled', true);
$('#cancel-moves').prop('disabled', true);

var source_id, target_id;
var source, target;
fourd.on_mouse_down = (vertex) => {
    console.log('click');
    if(vertex){
        own = vertex.server_vertex.hasOwnProperty('ruler');
        if(source_id === undefined && own){
            source_id = client_vertex_to_server_id.get(vertex);
            source = vertex.server_vertex;
            $('#source-id').text(source_id);
            $('#ships').prop('disabled', false);
            $('#ships').attr({max: vertex.server_vertex.strength}).val(vertex.server_vertex.strength-1);
            return;
        }

        if(source_id !== undefined){
            target_id = client_vertex_to_server_id.get(vertex);
            target = vertex.server_vertex;
            $('#target-id').text(target_id);
            $('#ships').prop('disabled', false);
            $('#submit-move').prop('disabled', false);
            return;
        }
    }else{
        source_id = undefined;
        target_id = undefined;
        source = undefined;
        target = undefined;
        $('#source-id').text('Select a star system of your color...');
        $('#target-id').text('Select an enemy star system...');
        $('#ships').prop('disabled', true);
        $('#submit-move').prop('disabled', true);
        return;
    }
    
    // fourd.select(cube.vertex);
};

$('#submit-move').click(function(){
    var number = $('#ships').val();
    moves.push({
        source: source_id, 
        target: target_id, 
        number: number
    });
    source.strength -= number;
    
    $('#ships').val(source.strength-1);
    
    source_id = undefined;
    target_id = undefined;
    source = undefined;
    target = undefined;
    $('#source-id').text('');
    $('#target-id').text('');
    $('#ships').prop('disabled', true);
    $('#submit-move').prop('disabled', true);
    $('#cancel-moves').prop('disabled', false);
});

$('#cancel-moves').click(function(){
    
    for(var i=0; i<moves.length; i++){
        var client_vertex = server_id_to_client_vertex.get(moves.source_id);
        client_vertex.strength += moves[i].number;
    }
    moves = [];

});

function create_game(){

  var cancelButton = document.querySelector('#cancel');
  var okButton = document.querySelector('#ok');
  var dialog = document.querySelector('#dialog');
  
  if(dialog.showModal){
    dialog.showModal();
  }else{
    dialog.setAttribute('open', '');
  }
  cancelButton.addEventListener('click', () => {
    if(dialog.showModal){
      dialog.close();
    }else{
      dialog.removeAttribute('open');
    }
  });
  
  okButton.addEventListener('click', event => {
    var game_options = {
      name: document.querySelector('#game-name').value,
      players: parseInt(document.querySelector('#num-players').value),
      stars: parseInt(document.querySelector('#num-stars').value),
      wormholes: parseInt(document.querySelector('#num-wormholes').value)
    };
    
    socket.emit('new game', game_options);
 
    if(dialog.showModal){
      dialog.close();
    }else{
      dialog.removeAttribute('open');
    }
  });
  
  /*
  var name = prompt("A name for this game: ");
  if(!name){
      return;
  }

  var players = parseInt(prompt("Number of players: "));
  if(!players){
      return;
  }
  
  var stars = parseInt(prompt('Number of stars'));
  if(!stars){
      return;
  }
  
  var additional_wormholes = parseInt(prompt("Number of additional wormholes: "));
  
  console.log('new game', players, stars, additional_wormholes);
  socket.emit('new game', {
      name: name,
      players: players,
      stars: stars,
      wormholes: additional_wormholes
  });*/
  console.log('new game');
  
  /*
  socket.emit('new game', {
    name: 'Battle Royale',
    players: 2,
    stars: 10,
    wormholes: 20
  });
  */
}

$('#game-ui').hide();
function join_game(id){
    console.log('joining game', id);
    socket.emit('join game:', id);
    $('#games').hide();
    $('#game-ui').show();
}
