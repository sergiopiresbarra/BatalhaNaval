const express = require('express')
const WebSocket = require('ws');
const path = require('path')
//const http = require('http')
const PORT = process.env.PORT || 3000
////const socketio = require('socket.io')
const app = express()
//const server = http.createServer(app)
////const io = socketio(server)

// Set static folder
app.use(express.static(path.join(__dirname, "public")))

// Start server
//server.listen(PORT, () => console.log(`Server running on port ${PORT}`))
const server = app.listen(PORT, () => {
  console.log(`App Express is running!, port: ${PORT}`);
})

const wss = new WebSocket.Server({ server })


// Handle a socket connection request from web client
const connections = [null, null]

wss.on('connection', socket => {
  // console.log('New WS Connection')

  // Find an available player number
  let playerIndex = -1;
  for (const i in connections) {
    if (connections[i] === null) {
      playerIndex = i
      break
    }
  }

  // Tell the connecting client what player number they are
  //socket.send('player-number', playerIndex)
  socket.send(JSON.stringify({
    type: 'player-number',
    data: playerIndex,
  }))

  console.log(`Player ${playerIndex} has connected`)

  // Ignore player 3
  if (playerIndex === -1) return

  connections[playerIndex] = false

  // Tell eveyone what player number just connected
  //socket.broadcast.send('player-connection', playerIndex)
  /* socket.send(JSON.stringify({
    type: 'player-connection',
    data: playerIndex,
  })) */

  wss.clients.forEach(function each(client) {
    if (client !== socket && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'player-connection',
        data: playerIndex,
      }))
    }
  });

  // Handle Diconnect
  socket.on('close', () => {
    console.log(`Player ${playerIndex} disconnected`)
    connections[playerIndex] = null
    //Tell everyone what player numbe just disconnected
    //socket.broadcast.emit('player-connection', playerIndex)
    /* socket.send(JSON.stringify({
      type: 'player-connection',
      data: playerIndex,
    })) */

    wss.clients.forEach(function each(client) {
      if (client !== socket && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'player-connection',
          data: playerIndex,
        }))
      }
    });


  })

  // On Ready
  /*   socket.on('player-ready', () => {
      //socket.broadcast.send('enemy-ready', playerIndex)
      socket.send(JSON.stringify({
        type: 'enemy-ready', 
        data: playerIndex,
      }))
      connections[playerIndex] = true
    }) */
  socket.on("message", (data) => {
    const packet = JSON.parse(data);

    switch (packet.type) {
      case "player-ready":
        /* socket.send(JSON.stringify({
          type: 'enemy-ready',
          data: playerIndex,
        })) */
        wss.clients.forEach(function each(client) {
          if (client !== socket && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'enemy-ready',
              data: playerIndex,
            }))
          }
        });
        connections[playerIndex] = true
        break;
      case "check-players":
        const players = []
        for (const i in connections) {
          connections[i] === null ? players.push({ connected: false, ready: false }) : players.push({ connected: true, ready: connections[i] })
        }
        //socket.send('check-players', players)
        socket.send(JSON.stringify({
          type: 'check-players',
          data: players,
        }))
        break;
      case "fire":
        id = packet.data;
        console.log(`Shot fired from ${playerIndex}`, id)

        // Emit the move to the other player
        //socket.broadcast.send('fire', id)
        /* socket.send(JSON.stringify({
          type: 'fire',
          data: id,
        })) */
        wss.clients.forEach(function each(client) {
          if (client !== socket && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'fire',
              data: id,
            }))
          }
        });
        break;
      case "fire-reply":
        square = packet.data;
        console.log("fire-replay-servidor-square: ",square)
        // Forward the reply to the other player
        //socket.broadcast.send('fire-reply', square)
        /* socket.send(JSON.stringify({
          type: 'fire-reply',
          data: square,
        })) */
        wss.clients.forEach(function each(client) {
          if (client !== socket && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'fire-reply',
              data: square,
            }))
          }
        });
        break;
    }
  });

  // Check player connections
  /* socket.on('check-players', () => {
    const players = []
    for (const i in connections) {
      connections[i] === null ? players.push({connected: false, ready: false}) : players.push({connected: true, ready: connections[i]})
    }
    //socket.send('check-players', players)
    socket.send(JSON.stringify({
      type: 'check-players', 
      data: players,
    }))
  })

  // On Fire Received
  socket.on('fire', id => {
    console.log(`Shot fired from ${playerIndex}`, id)

    // Emit the move to the other player
    //socket.broadcast.send('fire', id)
    socket.send(JSON.stringify({
      type: 'fire', 
      data: id,
    }))
  })

  // on Fire Reply
  socket.on('fire-reply', square => {
    console.log(square)

    // Forward the reply to the other player
    //socket.broadcast.send('fire-reply', square)
    socket.send(JSON.stringify({
      type: 'fire-reply', 
      data: square,
    }))
  })
 */
  // Timeout connection
  setTimeout(() => {
    connections[playerIndex] = null
    //socket.send('timeout')
    socket.send(JSON.stringify({
      type: 'timeout',
      data: playerIndex,
    }))
    socket.close()
  }, 600000) // 10 minute limit per player
})