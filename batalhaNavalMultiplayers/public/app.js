const ws = new WebSocket("ws://" + location.host);
document.addEventListener('DOMContentLoaded', () => {
  const userGrid = document.querySelector('.grid-user')
  const computerGrid = document.querySelector('.grid-computer')
  const displayGrid = document.querySelector('.grid-display')
  const ships = document.querySelectorAll('.ship')
  const destroyer = document.querySelector('.destroyer-container')
  const submarine = document.querySelector('.submarine-container')
  const cruiser = document.querySelector('.cruiser-container')
  const battleship = document.querySelector('.battleship-container')
  const carrier = document.querySelector('.carrier-container')
  const startButton = document.querySelector('#start')
  const rotateButton = document.querySelector('#rotate')
  const turnDisplay = document.querySelector('#whose-go')
  const infoDisplay = document.querySelector('#info')
  const setupButtons = document.getElementById('setup-buttons')
  const userSquares = []
  const computerSquares = []
  let isHorizontal = true
  let isGameOver = false
  let currentPlayer = 'user'
  const width = 10
  let playerNum = 0
  let partidaUUID = ''
  let ready = false
  let enemyReady = false
  let allShipsPlaced = false
  let shotFired = -1
  let playersConectados = false
  //Ships
  const shipArray = [
    {
      name: 'destroyer',
      directions: [
        [0, 1],
        [0, width]
      ]
    },
    {
      name: 'submarine',
      directions: [
        [0, 1, 2],
        [0, width, width * 2]
      ]
    },
    {
      name: 'cruiser',
      directions: [
        [0, 1, 2],
        [0, width, width * 2]
      ]
    },
    {
      name: 'battleship',
      directions: [
        [0, 1, 2, 3],
        [0, width, width * 2, width * 3]
      ]
    },
    {
      name: 'carrier',
      directions: [
        [0, 1, 2, 3, 4],
        [0, width, width * 2, width * 3, width * 4]
      ]
    },
  ]

  createBoard(userGrid, userSquares)
  createBoard(computerGrid, computerSquares)

  startMultiPlayer()
  // Multiplayer
  let destroyerCount = 0
  let submarineCount = 0
  let cruiserCount = 0
  let battleshipCount = 0
  let carrierCount = 0

  function startMultiPlayer() {
    console.log("multiplayer iniciado!")

    ws.addEventListener("message", ({ data }) => {
      const packet = JSON.parse(data);

      if (packet.type == "player-number") {
        if (packet.data === -1) {
          infoDisplay.innerHTML = "Desculpe, aconteceu algo de errado."
        } else {
          playerNum = parseInt(packet.data)
          partidaUUID = packet.PID
          if (playerNum === 1) currentPlayer = "enemy"

          console.log("Seu playerNum: ", playerNum + 1)

          // Get other player status
          ws.send(JSON.stringify({
            type: 'check-players',
            data: '',
            PID: partidaUUID,
          }))
        }
      }
      if (partidaUUID == packet.PID) {
        switch (packet.type) {
          // Another player has connected or disconnected
          case "player-connection":
            console.log(`Player number ${packet.data} has connected or disconnected`)
            playerConnectedOrDisconnected(packet.data)
            break;
          // On enemy ready
          case "enemy-ready":
            enemyReady = true
            playerReady(packet.data)
            if (ready) {
              playGameMulti(ws)
              setupButtons.style.display = 'none'
            }
            break;
          // Check player status
          case "check-players":
            packet.data.forEach((p, i) => {
              if (p.connected) playerConnectedOrDisconnected(i)
              if (p.ready) {
                playerReady(i)
                if (i !== playerReady) enemyReady = true
              }
            })
            break;
          case "timeout":
            infoDisplay.innerHTML = 'Você atingiu o timeout de 10 minutos'
            break;
          case "fire":
            enemyGo(packet.data)
            const square = userSquares[packet.data]
            ws.send(JSON.stringify({
              type: 'fire-reply',
              data: square.classList,
              PID: partidaUUID,
            }))
            playGameMulti(ws)
            break;
          case "fire-reply":
            revealSquare(packet.data)
            playGameMulti(ws)
            break;
          case "vitoria-wo":
            wo()
            //console.log("entrou em WO!")
            break;
        }
      }
    });

    // Ready button click
    startButton.addEventListener('click', startButtonCheck)

    function startButtonCheck() {
      if (allShipsPlaced && playersConectados) { playGameMulti(ws); infoDisplay.innerHTML = "Jogadores conectados, Embarcações ok!" }
      else if (playersConectados == false && playerNum == 0) { infoDisplay.innerHTML = "Esperando outro jogador conectar..." }
      else { infoDisplay.innerHTML = "Por favor colocar as embarcaçoes!" }
    }

    // Setup event listeners for firing
    computerSquares.forEach(square => {
      square.addEventListener('click', () => {
        if (currentPlayer === 'user' && ready && enemyReady) {
          shotFired = square.dataset.id
          //socket.send('fire', shotFired)
          ws.send(JSON.stringify({
            type: 'fire',
            data: shotFired,
            PID: partidaUUID,
          }))
        }
      })
    })

    function playerConnectedOrDisconnected(num) {
      console.log("playerConnectDisconnectFunction: ", num);
      if (parseInt(num) == 1) { playersConectados = true }
      //if (playerNum == 0 && parseInt(num) == 1) { infoDisplay.innerHTML = "conectado!" }
      let player = `.p${parseInt(num) + 1}`
      document.querySelector(`${player} .connected`).classList.toggle('active')
      if (parseInt(num) === playerNum) document.querySelector(player).style.fontWeight = 'bold'
    }
  }

  //Create Board
  function createBoard(grid, squares) {
    for (let i = 0; i < width * width; i++) {
      const square = document.createElement('div')
      square.dataset.id = i
      grid.appendChild(square)
      squares.push(square)
    }
  }

  //Draw the computers ships in random locations
  function generate(ship) {
    let randomDirection = Math.floor(Math.random() * ship.directions.length)
    let current = ship.directions[randomDirection]
    if (randomDirection === 0) direction = 1
    if (randomDirection === 1) direction = 10
    let randomStart = Math.abs(Math.floor(Math.random() * computerSquares.length - (ship.directions[0].length * direction)))

    const isTaken = current.some(index => computerSquares[randomStart + index].classList.contains('taken'))
    const isAtRightEdge = current.some(index => (randomStart + index) % width === width - 1)
    const isAtLeftEdge = current.some(index => (randomStart + index) % width === 0)

    if (!isTaken && !isAtRightEdge && !isAtLeftEdge) current.forEach(index => computerSquares[randomStart + index].classList.add('taken', ship.name))

    else generate(ship)
  }

  //Rotate the ships
  function rotate() {
    if (isHorizontal) {
      destroyer.classList.toggle('destroyer-container-vertical')
      submarine.classList.toggle('submarine-container-vertical')
      cruiser.classList.toggle('cruiser-container-vertical')
      battleship.classList.toggle('battleship-container-vertical')
      carrier.classList.toggle('carrier-container-vertical')
      isHorizontal = false
      // console.log(isHorizontal)
      return
    }
    if (!isHorizontal) {
      destroyer.classList.toggle('destroyer-container-vertical')
      submarine.classList.toggle('submarine-container-vertical')
      cruiser.classList.toggle('cruiser-container-vertical')
      battleship.classList.toggle('battleship-container-vertical')
      carrier.classList.toggle('carrier-container-vertical')
      isHorizontal = true
      // console.log(isHorizontal)
      return
    }
  }
  rotateButton.addEventListener('click', rotate)

  //move around user ship
  ships.forEach(ship => ship.addEventListener('dragstart', dragStart))
  userSquares.forEach(square => square.addEventListener('dragstart', dragStart))
  userSquares.forEach(square => square.addEventListener('dragover', dragOver))
  userSquares.forEach(square => square.addEventListener('dragenter', dragEnter))
  userSquares.forEach(square => square.addEventListener('dragleave', dragLeave))
  userSquares.forEach(square => square.addEventListener('drop', dragDrop))
  userSquares.forEach(square => square.addEventListener('dragend', dragEnd))

  let selectedShipNameWithIndex
  let draggedShip
  let draggedShipLength

  ships.forEach(ship => ship.addEventListener('mousedown', (e) => {
    selectedShipNameWithIndex = e.target.id
    // console.log(selectedShipNameWithIndex)
  }))

  function dragStart() {
    draggedShip = this
    draggedShipLength = this.childNodes.length
    // console.log(draggedShip)
  }

  function dragOver(e) {
    e.preventDefault()
  }

  function dragEnter(e) {
    e.preventDefault()
  }

  function dragLeave() {
    // console.log('drag leave')
  }

  function dragDrop() {
    let shipNameWithLastId = draggedShip.lastChild.id
    let shipClass = shipNameWithLastId.slice(0, -2)
    // console.log(shipClass)
    let lastShipIndex = parseInt(shipNameWithLastId.substr(-1))
    let shipLastId = lastShipIndex + parseInt(this.dataset.id)
    // console.log(shipLastId)
    const notAllowedHorizontal = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 1, 11, 21, 31, 41, 51, 61, 71, 81, 91, 2, 22, 32, 42, 52, 62, 72, 82, 92, 3, 13, 23, 33, 43, 53, 63, 73, 83, 93]
    const notAllowedVertical = [99, 98, 97, 96, 95, 94, 93, 92, 91, 90, 89, 88, 87, 86, 85, 84, 83, 82, 81, 80, 79, 78, 77, 76, 75, 74, 73, 72, 71, 70, 69, 68, 67, 66, 65, 64, 63, 62, 61, 60]

    let newNotAllowedHorizontal = notAllowedHorizontal.splice(0, 10 * lastShipIndex)
    let newNotAllowedVertical = notAllowedVertical.splice(0, 10 * lastShipIndex)

    selectedShipIndex = parseInt(selectedShipNameWithIndex.substr(-1))

    shipLastId = shipLastId - selectedShipIndex
    // console.log(shipLastId)

    if (isHorizontal && !newNotAllowedHorizontal.includes(shipLastId)) {
      //console.log("entrou horizontal!")
      for (let i = 0; i < draggedShipLength; i++) {
        console.log(i)
        if (userSquares[parseInt(this.dataset.id) - selectedShipIndex + i] == undefined) { console.log("undefined!!!Horizontal"); return; }
      }
      for (let i = 0; i < draggedShipLength; i++) {
        let directionClass
        if (i === 0) directionClass = 'start'
        if (i === draggedShipLength - 1) directionClass = 'end'
        userSquares[parseInt(this.dataset.id) - selectedShipIndex + i].classList.add('taken', 'horizontal', directionClass, shipClass)
      }
      //As long as the index of the ship you are dragging is not in the newNotAllowedVertical array! This means that sometimes if you drag the ship by its
      //index-1 , index-2 and so on, the ship will rebound back to the displayGrid.
    } else if (!isHorizontal && !newNotAllowedVertical.includes(shipLastId)) {
      for (let i = 0; i < draggedShipLength; i++) {
        if (userSquares[parseInt(this.dataset.id) - selectedShipIndex + width * i] == undefined) { console.log("undefined!!!Vertical"); return; }
      }
      for (let i = 0; i < draggedShipLength; i++) {
        let directionClass
        if (i === 0) directionClass = 'start'
        if (i === draggedShipLength - 1) directionClass = 'end'
        console.log("directionClass:", directionClass)
        console.log("parseInt:", parseInt(this.dataset.id))
        console.log("selectedShip:", selectedShipIndex)
        console.log("classlist:", userSquares[parseInt(this.dataset.id) - selectedShipIndex + width * i])
        userSquares[parseInt(this.dataset.id) - selectedShipIndex + width * i].classList.add('taken', 'vertical', directionClass, shipClass)
      }
    } else return

    displayGrid.removeChild(draggedShip)
    if (!displayGrid.querySelector('.ship')) allShipsPlaced = true
  }

  function dragEnd() {
    // console.log('dragend')
  }

  // Game Logic for MultiPlayer
  function playGameMulti(socket) {
    setupButtons.style.display = 'none'
    if (isGameOver) return
    if (!ready) {
      socket.send(JSON.stringify({
        type: 'player-ready',
        data: true,
        PID: partidaUUID,
      }))
      ready = true
      playerReady(playerNum)
    }

    if (enemyReady) {
      if (currentPlayer === 'user') {
        turnDisplay.innerHTML = "Sua vez"
      }
      if (currentPlayer === 'enemy') {
        turnDisplay.innerHTML = "Vez do oponente"
      }
    }
  }

  function playerReady(num) {
    let player = `.p${parseInt(num) + 1}`
    document.querySelector(`${player} .ready`).classList.toggle('active')
  }

  function revealSquare(classList) {
    const enemySquare = computerGrid.querySelector(`div[data-id='${shotFired}']`)
    const obj = Object.values(classList)
    if (!enemySquare.classList.contains('boom') && currentPlayer === 'user' && !isGameOver) {
      if (obj.includes('destroyer')) ++destroyerCount
      if (obj.includes('submarine')) ++submarineCount
      if (obj.includes('cruiser')) ++cruiserCount
      if (obj.includes('battleship')) ++battleshipCount
      if (obj.includes('carrier')) ++carrierCount
    }
    if (obj.includes('taken')) {
      enemySquare.classList.add('boom')
    } else {
      enemySquare.classList.add('miss')
    }
    checkForWins()
    currentPlayer = 'enemy'
  }

  let cpuDestroyerCount = 0
  let cpuSubmarineCount = 0
  let cpuCruiserCount = 0
  let cpuBattleshipCount = 0
  let cpuCarrierCount = 0

  function enemyGo(square) {
    if (!userSquares[square].classList.contains('boom')) {
      const hit = userSquares[square].classList.contains('taken')
      userSquares[square].classList.add(hit ? 'boom' : 'miss')
      if (userSquares[square].classList.contains('destroyer')) ++cpuDestroyerCount
      if (userSquares[square].classList.contains('submarine')) ++cpuSubmarineCount
      if (userSquares[square].classList.contains('cruiser')) ++cpuCruiserCount
      if (userSquares[square].classList.contains('battleship')) ++cpuBattleshipCount
      if (userSquares[square].classList.contains('carrier')) ++cpuCarrierCount
      checkForWins()
    }
    currentPlayer = 'user'
    turnDisplay.innerHTML = 'Your Go'
  }

  function checkForWins() {
    let enemy = 'enemy'
    if (destroyerCount === 2) {
      //infoDisplay.innerHTML = `You sunk the ${enemy}'s destroyer`
      infoDisplay.innerHTML = `Você afundou o destroyer do oponente`
      destroyerCount = 10
    }
    if (submarineCount === 3) {
      infoDisplay.innerHTML = `Você afundou o submarino do oponente`
      submarineCount = 10
    }
    if (cruiserCount === 3) {
      infoDisplay.innerHTML = `Você afundou o crusador do oponente`
      cruiserCount = 10
    }
    if (battleshipCount === 4) {
      infoDisplay.innerHTML = `Você afundou o navio de batalha do oponente`
      battleshipCount = 10
    }
    if (carrierCount === 5) {
      infoDisplay.innerHTML = `Você afundou o porta-aviões do oponente`
      carrierCount = 10
    }
    if (cpuDestroyerCount === 2) {
      infoDisplay.innerHTML = `O oponente afundou seu destroyer`
      cpuDestroyerCount = 10
    }
    if (cpuSubmarineCount === 3) {
      infoDisplay.innerHTML = `O oponente afundou seu submarino`
      cpuSubmarineCount = 10
    }
    if (cpuCruiserCount === 3) {
      infoDisplay.innerHTML = `O oponente afundou seu crusador`
      cpuCruiserCount = 10
    }
    if (cpuBattleshipCount === 4) {
      infoDisplay.innerHTML = `O oponente afundou seu navio de batalha`
      cpuBattleshipCount = 10
    }
    if (cpuCarrierCount === 5) {
      infoDisplay.innerHTML = `O oponente afundou seu porta-aviões`
      cpuCarrierCount = 10
    }

    if ((destroyerCount + submarineCount + cruiserCount + battleshipCount + carrierCount) === 50) {
      infoDisplay.innerHTML = "Você venceu! (Atualize a página para jogar novamente)"
      gameOver()
    }
    if ((cpuDestroyerCount + cpuSubmarineCount + cpuCruiserCount + cpuBattleshipCount + cpuCarrierCount) === 50) {
      infoDisplay.innerHTML = `Você perdeu, mais sorte na próxima (Atualize a página para jogar novamente)`
      gameOver()
    }
  }

  function gameOver() {
    isGameOver = true
    finalizarPartida()
  }

  function finalizarPartida() {
    ws.send(JSON.stringify({
      type: 'finalize-partida',
      PID: partidaUUID,
    }))
  }

  function wo() {
    infoDisplay.innerHTML = "Você venceu por W.O. (Atualize a página para jogar novamente)"
    gameOver()
    
  }
})
