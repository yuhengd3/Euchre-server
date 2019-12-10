const express = require('express')
const app = express()
const http = require('http').createServer(app);
const port = 3000
var io = require('socket.io')(http);

const game_ = require('./game.js')

let room_num = 0;
var games = new Object();

io.on('connection', socket => {
	console.log(`socket is connected by ${socket.id}`);

	socket.on('createGame', data => {
		console.log("createGame");
		//let roomName = 'room-' + room_num++;
		let roomName = room_num + "";
		room_num++;
		socket.join(roomName);
		let game = new game_.Game();
		game.plaNum++;
		game.playerNames.push(data.name);
		game.playerSockets.push(socket);
		games[roomName] = game;
		socket.emit('gameCreated', {name: data.name, room: roomName})
		console.log(`new game ${roomName}`);
	})

	socket.on('joinGame', data => {
		console.log('joinGame');
		var room = io.nsps['/'].adapter.rooms[data.room];
		if (room && room.length < 4) {
			socket.join(data.room);
			let game = games[data.room];
			game.plaNum++;
			game.playerNames.push(data.name);
			game.playerSockets.push(socket);
			//console.log(game.playerNames);
			io.in(data.room).emit("newPlayer", {players: game.playerNames, room: data.room});
			//change the number to 4!!!!!!
			if (room.length == 4) {
				game.playerSockets[0].emit("gameStart", {myTeammate: game.playerNames[2], myTeam: "Team One"});
				game.playerSockets[1].emit("gameStart", {myTeammate: game.playerNames[3], myTeam: "Team Two"});
				game.playerSockets[2].emit("gameStart", {myTeammate: game.playerNames[0], myTeam: "Team One"});
				game.playerSockets[3].emit("gameStart", {myTeammate: game.playerNames[1], myTeam: "Team Two"});

				console.log("start");
				game.play = new game_.Play(game.playerNames, game.playerSockets, 0, io, data.room);
				setTimeout(() => {
					game.play.chooseTrump();
					console.log("deal");
				}, 1000);
			}
		} else {
			socket.emit('err', {message: 'This room is not available!'})
			console.log('error');
		}
	})

	socket.on('disconnect', () => console.log("disconnected"));
});

http.listen(port, () => console.log(`listening on port ${port}!`))