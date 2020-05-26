
// imports
var fs = require('fs');
var express = require('express');
var app = express();
var https = require('https');

// setup http server
app.use(express.static('web'));
var privateKey = fs.readFileSync('ssl/6963065-192.168.10.101.key', 'utf8');
var certificate = fs.readFileSync('ssl/6963065-192.168.10.101.cert', 'utf8');
var credentials = {key: privateKey, cert: certificate};

var httpsServer = https.createServer(credentials, app);
httpsServer.listen(3000, function () {
	console.log('Server listening at https://'+httpsServer.address().address+':'+httpsServer.address().port);
});

// setup websocket
var io = require('socket.io')(httpsServer);

var activeSockets = [];

io.on('connection', (socket) => {
	addnewuser(socket);
});

function addnewuser(socket) {
	console.log('user connected '+socket.id);
	var existingSocket = activeSockets.find( existingSocket => existingSocket === socket.id );
	if (existingSocket) {
		return;
	}

	activeSockets.push(socket.id);
	io.sockets.emit("user-list", activeSockets); // update all clients

	// sent by one client, target a specific other client, request RTC offer
	socket.on("request-offer", data => {
		console.log('request-offer from '+socket.id +' to '+data.targetsocketid);
		socket.to(data.targetsocketid).emit("request-offer", {
			requestingsocketid: socket.id
		});
	});

	// part two of the offer negotiation, the other client sends back an offer
	socket.on("relay-offer", data => {
		console.log('relay-offer from '+socket.id +' to '+data.targetsocketid);
		socket.to(data.targetsocketid).emit("relay-offer", {
			sourcesocketid: socket.id,
			offer: data.offer
		});
	});

	// sent by source client, target a specific other client, send ICE candidate
	socket.on("send-ice-candidate", data => {
		console.log('send-ice-candidate from '+socket.id +' to '+data.targetsocketid);
		socket.to(data.targetsocketid).emit("send-ice-candidate", {
			sourcesocketid: socket.id,
			icecandidate: data.icecandidate
		});
	});

	socket.on('disconnect', () => {
		console.log("socket disconnected "+socket.id);
		activeSockets.splice(activeSockets.indexOf(socket.id),1);
		io.sockets.emit("user-list", activeSockets); // update all clients
	});
}


