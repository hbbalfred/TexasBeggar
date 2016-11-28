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
	return this[i];
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
Player.prototype.bet = function(coin) {
	if (this.coin < coin) {
		console.warn(this.name +' has no enough coin');
		return;
	}

	this.coin -= coin;
};
Player.prototype.addHandCard = function(card) {
	this.handcards.push(card);
};
Player.prototype.fold = function() {
	this.status = Player.FOLD;
};



function Game() {
	this.card = new Card();
	this.flopCards = [];

	this.players = {};
	this.orders = [];

	this.playing = false;

	this.idxMang = -1;
	this.bigMang = null;
	this.smallMang = null;
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
Game.prototype.newRound = function() {
	if (!this.players._length || this.players._length < 2) {
		console.warn('no enough players');
		return;
	}
	if (this.playing) {
		console.warn('game is playing');
		// return;
	}

	this.playing = true;

	this.flopCards.length = 0;
	this.card.shuffle();
	this.card.shuffle();

	var orders = this.orders = [];
	for (var name in this.players) {
		this.players[name].ready();
		orders.push(this.players[name]);
	}

	orders.sort(function (a, b) {
		if (a.name > b.name) return 1;
		if (a.name < b.name) return -1;
		return 0;
	});

	++this.idxMang;
	this.bigMang = orders.cycle(this.idxMang);
	this.smallMang = orders.cycle(this.idxMang + 1);
	orders.shuffle();

	for (var i = 0; i < orders.length; ++i) {
		orders[i].addHandCard(this.card.next());
	}
	for (var i = 0; i < orders.length; ++i) {
		orders[i].addHandCard(this.card.next());
	}
};
Game.prototype.flop = function(n) {
	for (var i = 0; i < n; ++i) {
		this.flopCards.push(this.card.next());
	}
};
Game.prototype.bet = function(name, coin) {
	this.players[name].bet(coin);
};
Game.prototype.fold = function(name) {
	this.players[name].fold();
};

Game.prototype.printPublic = function() {
	var msg = '桌上牌面: {flops}\n';
	msg += '桌上筹码: {allbet}\n';
	msg += '玩家情况:\n{infos}';

	var flops = this.flopCards.map(function (card) {
		return this.card.toRead(card);
	}, this);
	

	var allbet = 0;
	var infos = this.orders.map(function (player) {
		var info = player.name;
		if (this.bigMang === player) {
			info += '（大盲）'
		} else if (this.smallMang === player) {
			info += '（小盲）'
		}

		var bet = player.roundStartCoin - player.coin;
		allbet += bet;

		info += '\n拥有筹码: ' + player.coin;
		info += '\n当前押注: ' + (player.status === Player.FOLD ? '（已弃牌）' : bet);
		return info;
	}, this);

	msg = msg.replace('{flops}', flops.join('  '));
	msg = msg.replace('{allbet}', allbet);
	msg = msg.replace('{infos}', infos.join('\n'));
	return msg;
};
Game.prototype.printPlayer = function(name) {
	var player = this.players[name];
	var info = player.name;
	if (this.bigMang === player) {
		info += '（大盲）'
	} else if (this.smallMang === player) {
		info += '（小盲）'
	}

	var handcards = player.handcards.map(function (card) {
		return this.card.toRead(card);
	}, this);

	info += '\n筹码: ' + player.coin;
	info += '\n手卡: ' + handcards.join('  ');
	return info;
};
var game = new Game();