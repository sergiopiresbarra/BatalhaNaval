const express = require('express')
const WebSocket = require('ws');
const uuid = require('uuid');
const path = require('path')
const PORT = process.env.PORT || 3000
const app = express()

// Set static folder
app.use(express.static(path.join(__dirname, "public")))

// Start server
const server = app.listen(PORT, () => {
  console.log(`App Express is running!, port: ${PORT}`);
})

const wss = new WebSocket.Server({ server })

let partidas = {}
const clients = []
var partidasID = uuid.v4()
var size = Object.keys(partidas).length;

wss.on('connection', socket => {
  let playerIndex = -1;
  //[websocketAtual, isReady]
  const jogador = [socket, null]
  clients.push(jogador);
  const index = clients.indexOf(jogador);
  playerIndex = index;

  // Tell the connecting client what player number they are
  socket.send(JSON.stringify({
    type: 'player-number',
    data: playerIndex,
    PID: partidasID,
  }))

  console.log(`Player ${playerIndex} has connected`)

  if (playerIndex === -1) {
    console.log("error: player index -1!")
    return
  }

  clients[playerIndex][1] = false
  console.log('playerindex:' + playerIndex)
  clients.forEach(e => {
    console.log(['ws', e[1]])
  });

  // Tell eveyone what player number just connected
  wss.clients.forEach(function each(client) {
    if (client !== socket && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'player-connection',
        data: playerIndex,
        PID: partidasID,
      }))
    }
  });
  console.log("vetor clientes", clients.length)
  const pp = partidasID;
  if (clients.length >= 2) {
    partidas[partidasID] = {
      jogador1: clients[0],
      jogador2: clients[1]
    }
    clients.splice(0, 2);
    partidasID = uuid.v4();
    size = Object.keys(partidas).length;
    console.log("qtd Elementos partidas: ", size)
  }

  // Handle Diconnect
  socket.on('close', () => {
    if (partidas[pp] !== undefined) {
      wss.clients.forEach(function each(client) {
        if (client !== socket && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'vitoria-wo',
            PID: pp,
          }))
        }
      });
      delete partidas[pp];
    }
    else {
      const index = clients.indexOf(jogador);
      if (index > -1) {
        clients.splice(index, 1);
      }
    }

    //Desconexão

    /* const index = clients.indexOf(jogador);
    if (index > -1) {
        clients.splice(index, 1);
    } */

    console.log(`Player ${playerIndex} disconnected`)
    //clients[playerIndex] = null

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
          PID: pp,
        }))
      }
    });

    console.log('playerindex:' + playerIndex)
    clients.forEach(e => {
      console.log(['ws', e[1]])
    });
  })

  // On Ready
  socket.on("message", (data) => {
    let t = false
    const packet = JSON.parse(data);
    let cli = []
    size = Object.keys(partidas).length;
    if (clients.length == 1) { size = 0 }
    if (partidas[packet.PID] !== undefined && size > 0) {
      console.log("enviado pro jogador de PID:", packet.PID)
      cli = [partidas[packet.PID].jogador1, partidas[packet.PID].jogador2]
      console.log(cli[0][1], cli[1][1])
      t = true
    }

    if (cli.length < 1) {
      cli[0] = clients[0]
    }
    if (packet.type == "check-players") {
      const players = []
      for (const i in cli) {
        console.log("vetor cli", cli[i][1])
        cli[i][1] === null ? players.push({ connected: false, ready: false }) : players.push({ connected: true, ready: cli[i][1] })
      }

      socket.send(JSON.stringify({
        type: 'check-players',
        data: players,
        PID: packet.PID,
      }))
    }

    if(packet.type == "finalize-partida"){
          //finaliza
          socket.close()
    }

    size = Object.keys(partidas).length;
    if (size > 0 && t == true) {
      t = false;

      switch (packet.type) {
        case "player-ready":
          wss.clients.forEach(function each(client) {
            if (client !== socket && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'enemy-ready',
                data: playerIndex,
                PID: packet.PID,
              }))
            }
          });
          cli[playerIndex][1] = true
          break;
        case "fire":
          id = packet.data;
          console.log(`Shot fired from ${playerIndex}`, id)

          // Emit the move to the other player
          wss.clients.forEach(function each(client) {
            if (client !== socket && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'fire',
                data: id,
                PID: packet.PID,
              }))
            }
          });
          break;
        case "fire-reply":
          square = packet.data;
          console.log("fire-replay-servidor-square: ", square)
          // Forward the reply to the other player
          wss.clients.forEach(function each(client) {
            if (client !== socket && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'fire-reply',
                data: square,
                PID: packet.PID,
              }))
            }
          });
          break;
      }
    }
  });

  // Timeout connection
  setTimeout(() => {
    /* const index = clients.indexOf(jogador);
    if (index > -1) {
        clients.splice(index, 1);
    } */
    //clients[playerIndex] = null
    //socket.send('timeout')
    socket.send(JSON.stringify({
      type: 'timeout',
      data: playerIndex,
    }))
    socket.close()
  }, 600000) // 10 minute limit per player
})