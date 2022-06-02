const uuid = require('uuid');

const SITUACAO_NOVA = 0;
const SITUACAO_ANDAMENTO = 1;
const SITUACAO_FINALIZADA = 2;


let partidas = {};

// quando tiver ok (2 jogadores entraram já)

let id  = uuid.v4();
partidas[id] = {
	jogador1: {
		nome: 'Pedro',
		websocket: 0,
		tabuleiro: [],
		tabuleiro_adversario: []
	},
	jogador2: {
		nome: 'Pedro',
		websocket: 0,
		tabuleiro: [],
		tabuleiro_adversario: []
	},
	situacao: SITUACAO_NOVA,
	vencedor: -1,
	vez: 0
}

on.message(ws, (data) => {
	if (partidas[data.partida_id] !== null) {
		// confiar no cidadão.
		//
	}
});
