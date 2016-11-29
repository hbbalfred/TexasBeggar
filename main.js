Array.prototype.shuffle = function() {
	if (this.length < 2) {
		return this;
	}

	var n = this.length, t, i;
	while (n) {
		i = (Math.random() * n--) >> 0;

		t = this[n];
		this[n] = this[i];
		this[i] = t;
	}
	return this;
};
Array.prototype.cycle = function(i) {
	if (i < 0) {
		throw new Error('Array.cycle not supports negative index');
	}
	if (this.length === 0) {
		return null;
	}
	if (this.length === 1) {
		return this[0];
	}
	var idx = i % this.length;
	return this[idx];
};



function Card() {
	this.cards = [];
	this.index = -1;
	this.create();
}

Card.prototype.NUM_CARD_TYPE = 4;
Card.prototype.NUM_CARD_NUMBER = 13;
Card.prototype.MAP_CARD_TYPE = ['\u2660','\u2663','\u2665','\u2666'];
Card.prototype.MAP_CARD_NUMBER = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
Card.prototype.WORD_MAP = {};

Card.prototype.create = function() {
	for (var i = 0; i < this.NUM_CARD_TYPE; ++i) {
		for (var j = 0; j < this.NUM_CARD_NUMBER; ++j) {
			var id = i << 8 | j;
			this.cards.push(id);
			this.WORD_MAP[id] = this.MAP_CARD_TYPE[i] + this.MAP_CARD_NUMBER[j];
		}
	}
}
Card.prototype.shuffle = function() {
	this.cards.shuffle();
	this.index = -1;
}
Card.prototype.next = function() {
	var card = this.cards.cycle(++this.index);

	if (this.index >= this.cards.length) {
		console.warn('no cards');
	}

	return card;
};
Card.prototype.toRead = function(card) {
	return this.WORD_MAP[card];
};




function Player(name) {
	this.name = name;
	this.coin = 0;
	this.status = Player.PENDING;
	this.handcards = [];
	this.roundStartCoin = 0;
}
Player.PENDING = 0;
Player.PLAYING = 1;
Player.FOLD = 2;
Player.prototype.ready = function() {
	this.status = Player.PLAYING;
	this.handcards.length = 0;
	this.roundStartCoin = this.coin;
};
Player.prototype.addCoin = function(coin) {
	this.coin += Math.abs(coin);
};
Player.prototype.addHandCard = function(card) {
	this.handcards.push(card);
};
Player.prototype.bet = function(coin) {
	if (this.coin < coin) {
		console.warn(this.name +' has no enough coin');
		return;
	}

	this.coin -= coin;
};
Player.prototype.fold = function() {
	this.status = Player.FOLD;
};




function Room() {
	this.card = new Card();
	this.orders = [];
	this._playerMap = null;
	this.playing = false;

	this.flops = [];
	this.bankerIndex = -1;
	this.betIndex = -1;
}
Room.prototype.init = function(players) {
	this._playerMap = {};
	for (var name in players) {
		this.orders.push(players[name]);
		this._playerMap[name] = players[name];
	}
	this.orders.shuffle();
};
Room.prototype.newRound = function() {
	if (this.playing) {
		console.warn('room playing');
		return;
	}

	this.playing = true;

	this.flops.length = 0;
	this.card.shuffle();
	this.card.shuffle();

	this.orders.forEach(function (player) {
		player.ready();
	}, this);

	++this.bankerIndex;
	this.betIndex = this.bankerIndex + 2;

	var draw = function (player) {
		player.addHandCard(this.card.next());
	};
	this.orders.forEach(draw, this);
	this.orders.forEach(draw, this);
};
Room.prototype.endRound = function() {
	this.playing = false;
};
Room.prototype.flop = function(n) {
	n = n || 1;
	for (var i = 0; i < n; ++i) {
		this.flops.push(this.card.next());
	}
};
Room.prototype.fold = function() {
	if (this.betIndex === -1) {
		console.warn('no player bet');
		return;
	}

	this.orders.cycle(this.betIndex).fold();

	this.__nextBet();
};
Room.prototype.bet = function(coin) {
	if (this.betIndex === -1) {
		console.warn('no player bet');
		return;
	}

	this.orders.cycle(this.betIndex).bet(coin);

	this.__nextBet();
};
Room.prototype.__nextBet = function() {
	for (var i = 0; i < this.orders.length; ++i) {
		var player = this.orders.cycle(this.betIndex + i + 1);
		if (player.status !== Player.FOLD) {
			this.betIndex = this.betIndex + i + 1;
			return;
		}
	}

	this.betIndex = -1;
};
Room.prototype.getPlayer = function(name) {
	return this._playerMap[name];
};
Room.prototype.IsPlayerBanker = function(name) {
	var player = this.orders.cycle(this.bankerIndex);
	return player === this._playerMap[name];
};
Room.prototype.IsPlayerBigMang = function(name) {
	var player = this.orders.cycle(this.bankerIndex + 1);
	return player === this._playerMap[name];
};
Room.prototype.IsPlayerSmallMang = function(name) {
	var player = this.orders.cycle(this.bankerIndex + 2);
	return player === this._playerMap[name];
};
Room.prototype.IsPlayerBetNow = function(name) {
	var player = this.orders.cycle(this.betIndex);
	return player === this._playerMap[name];
};
Room.prototype.printPublic = function(verbose) {
	var msg = '桌上牌面: {flops}\n';
	msg += '桌上筹码: {allbet}\n';
	msg += '轮到下注: {whobet}\n';

	if (verbose) {
		msg += '玩家情况:\n{infos}';	
	}
	

	var flops = this.flops.map(function (card) {
		return this.card.toRead(card);
	}, this);

	var whobet;
	var allbet = 0;
	var infos = this.orders.map(function (player) {
		var info = player.name;
		if (this.IsPlayerBanker(player.name)) {
			info += '（庄）';
		} else if (this.IsPlayerBigMang(player.name)) {
			info += '（大）';
		} else if (this.IsPlayerSmallMang(player.name)) {
			info += '（小）';
		}

		if (this.IsPlayerBetNow(player.name)) {
			whobet = player.name;
		}

		var bet = player.roundStartCoin - player.coin;
		allbet += bet;

		info += '\n拥有筹码: ' + player.coin;
		info += '\n当前押注: ' + (player.status === Player.FOLD ? '（已弃牌）' : bet);
		return info;
	}, this);

	msg = msg.replace('{flops}', flops.join('  '));
	msg = msg.replace('{allbet}', allbet);
	msg = msg.replace('{whobet}', whobet);
	if (verbose) {
		msg = msg.replace('{infos}', infos.join('\n'));	
	}
	console.log(msg);
};
Room.prototype.printPlayer = function(name) {
	var player = this._playerMap[name];
	var info = player.name;
	if (this.IsPlayerBanker(player.name)) {
		info += '（庄）';
	} else if (this.IsPlayerBigMang(player.name)) {
		info += '（大）';
	} else if (this.IsPlayerSmallMang(player.name)) {
		info += '（小）';
	}

	var handcards = player.handcards.map(function (card) {
		return this.card.toRead(card);
	}, this);

	info += '\n筹码: ' + player.coin;
	info += '\n手牌: ' + handcards.join('  ');
	console.log(info);
};
Room.prototype.printEnd = function() {
	var msg = '桌上牌面: {flops}\n';
	msg += '桌上筹码: {allbet}\n';
	msg += '玩家情况:\n{infos}';

	var flops = this.flops.map(function (card) {
		return this.card.toRead(card);
	}, this);

	var allbet = 0;

	var infos = this.orders.map(function (player) {
		var info = player.name;

		if (player.status !== Player.FOLD) {
			var handcards = player.handcards.map(function (card) {
				return this.card.toRead(card);
			}, this);

			handcards = handcards.concat(flops);

			info += ' ：' + handcards.join('  ');
		} else {
			info += ' ：（已弃牌）';
		}

		var bet = player.roundStartCoin - player.coin;
		allbet += bet;
		
		return info;
	}, this);

	msg = msg.replace('{flops}', flops.join('  '));
	msg = msg.replace('{allbet}', allbet);
	msg = msg.replace('{infos}', infos.join('\n'));

	console.log(msg);
};






function Game() {
	this.players = {};
	this.rooms = [];
}
Game.prototype.addPlayer = function (name, coin) {
	if (this.players[name]) {
		console.warn(name + ' has already join the game');
		return;
	}

	this.players[name] = new Player(name);
	this.players[name].addCoin(coin);

	if (!this.players._length) {
		this.players._length = 1;
	} else {
		++this.players._length;
	}
	Object.defineProperty(this.players, '_length', {enumerable:false});
}
Game.prototype.removePlayer = function(name) {
	if (!this.players[name]) {
		console.warn(name + ' has not join in the game yet');
		return;
	}

	delete this.players[name];
	--this.players._length;
};
Game.prototype.createRoom = function() {
	var tmp = this.rooms[0] = new Room();
	tmp.init(this.players);
	console.log('Room created');
};


Game.prototype.newRound = function() {
	this.rooms[0].newRound();
	for (var i = 0; i < this.rooms[0].orders.length; ++i) {
		this.rooms[0].printPlayer(this.rooms[0].orders[i].name);
	}
};
Game.prototype.flop = function(n) {
	this.rooms[0].flop(n);
	this.rooms[0].printPublic();
};
Game.prototype.bet = function(coin) {
	this.rooms[0].bet(coin);
	this.rooms[0].printPublic();
};
Game.prototype.fold = function() {
	this.rooms[0].fold();
	this.rooms[0].printPublic();
};
Game.prototype.endRound = function() {
	this.rooms[0].endRound();
	this.rooms[0].printEnd();
};
Game.prototype.printRoom = function() {
	this.rooms[0].printPublic();
};


var game = new Game();


game.addPlayer('colin', 1000);
game.addPlayer('tom', 1000);
game.addPlayer('hbb', 1000);

game.createRoom();
game.newRound();

game.bet(50);