class Card {
	constructor(suit, rank) {
		this.suit = suit;
		this.rank = rank;
	}

	isLeft(trump) {
		let leftSuit = 0;
		if (trump < 2) {
			leftSuit = 1 - trump;
		} else {
			leftSuit = 5 - trump;
		}
		if (this.suit == leftSuit && this.rank == 11) {
			return true;
		} else {
			return false;
		}
	}
	isRight(trump) {
		return this.suit == trump && this.rank == 11;
	}
	isBigger(opp, trump, startSuit) {
		//if me is right
		if (this.isRight(trump)) {
			return true;
		} else if (opp.isRight(trump)) {
			//if opp is right
			return false;
		} else if (this.isLeft(trump)) {
			//if me is left
			return true;
		} else if (opp.isLeft(trump)) {
			//if opp is left
			return false;
		}
		//if me is trump
		if (this.suit == trump) {
			if (opp.suit == trump) {
				//if opp is also trump
				return this.rank > opp.rank;
			} else {
				return true;
			}
		} else {
			//if me is not trump
			if (opp.suit == trump) {
				//if opp is trump
				return false;
			} else {
				//both are not trump
				if (this.suit == startSuit && opp.suit == startSuit) {
					//if both follow suit
					return this.rank > opp.rank;
				} else if (this.suit == startSuit) {
					return true;
				} else if (opp.suit == startSuit) {
					return false;
				} else {
					return true;
				}
			}
		}
	}
}

exports.Deck = class Deck {
	constructor() {
		this.cards = [];
		for (let i = 0; i < 4; i++) {
			for (let j = 9; j < 15; j++) {
				this.cards.push(new Card(i, j));
			}
		}
		for (let i = this.cards.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.cards[i], this.cards[j]] = [this.cards[j],this.cards[i]]
		}
	}
}

exports.Play = class Play {
	constructor(playerNames, playerSockets, dealer, io_, room) {
		this.playerNames = playerNames;
		this.playerSockets = playerSockets;
		this.dealer = dealer;
		this.deck = new exports.Deck();
		this.current = dealer;
		this.io = io_;
		this.room = room;
		this.trump = -1;
		this.currentRoundCards = [];
		this.starter = 1;
		this.tricks = [0, 0, 0, 0];
		this.scores = [0, 0];
		this.maker = -1;
		this.playerSockets[0].on("cardPlayed", data => {
			this.currentRoundCards.push(new Card(data.suit, data.rank));
			this.io.in(this.room).emit("cardsUpdate", {suit: data.suit, rank: data.rank, player: data.player});
			if (this.currentRoundCards.length == 4) {
				this.evaluate();
			} else {
				this.playerSockets[1].emit("play card");
			}
		});
		this.playerSockets[1].on("cardPlayed", data => {
			this.currentRoundCards.push(new Card(data.suit, data.rank));
			this.io.in(this.room).emit("cardsUpdate", {suit: data.suit, rank: data.rank, player: data.player});
			if (this.currentRoundCards.length == 4) {
				this.evaluate();
			} else {
				this.playerSockets[2].emit("play card");
			}
		});
		this.playerSockets[2].on("cardPlayed", data => {
			this.currentRoundCards.push(new Card(data.suit, data.rank));
			this.io.in(this.room).emit("cardsUpdate", {suit: data.suit, rank: data.rank, player: data.player});
			if (this.currentRoundCards.length == 4) {
				this.evaluate();
			} else {
				this.playerSockets[3].emit("play card");
			}
		});
		this.playerSockets[3].on("cardPlayed", data => {
			this.currentRoundCards.push(new Card(data.suit, data.rank));
			this.io.in(this.room).emit("cardsUpdate", {suit: data.suit, rank: data.rank, player: data.player});
			if (this.currentRoundCards.length == 4) {
				this.evaluate();
			} else {
				this.playerSockets[0].emit("play card");
			}
		});
	}

	evaluate() {
		//assume winner is starter
		let winner = 0;
		let startSuit = this.currentRoundCards[0].suit;
		for (let i = 1; i < 4; i++) {
			if (this.currentRoundCards[winner].isBigger(this.currentRoundCards[i], this.trump, startSuit) == false) {
				winner = i;
			}
		}
		winner = (this.starter + winner) % 4;
		this.tricks[winner] += 1;
		this.io.in(this.room).emit("trick", {player: this.playerNames[winner]}); //
		//if five tricks already
		if (this.tricks.reduce((a,b) => a + b, 0) == 5) {
			if (this.maker == 0 || this.maker == 2) {
				if (this.tricks[0] + this.tricks[2] == 5) {
					this.scores[0] += 2;
					this.io.in(this.room).emit("scoreUpdate", {teamOne : this.scores[0], teamTwo: this.scores[1], message: "Team One wins Two points!"});
				} else if (this.tricks[0] + this.tricks[2] >= 3) {
					this.scores[0] += 1;
					this.io.in(this.room).emit("scoreUpdate", {teamOne : this.scores[0], teamTwo: this.scores[1], message: "Team One wins One point!"});
				} else {
					// Team two upsets team one
					this.scores[1] += 2;
					this.io.in(this.room).emit("scoreUpdate", {teamOne : this.scores[0], teamTwo: this.scores[1], message: "Team Two upsets Team One and wins Two points!"});
				}
			} else {
				// team two made the trump
				if (this.tricks[1] + this.tricks[3] == 5) {
					this.scores[1] += 2;
					this.io.in(this.room).emit("scoreUpdate", {teamOne : this.scores[0], teamTwo: this.scores[1], message: "Team Two wins Two points!"});
				} else if (this.tricks[1] + this.tricks[3] >= 3) {
					this.scores[1] += 1;
					this.io.in(this.room).emit("scoreUpdate", {teamOne : this.scores[0], teamTwo: this.scores[1], message: "Team Two wins One point!"});
				} else {
					// Team two upsets team one
					this.scores[0] += 2;
					this.io.in(this.room).emit("scoreUpdate", {teamOne : this.scores[0], teamTwo: this.scores[1], message: "Team One upsets Team Two and wins Two points!"});
				}
			}
			if (this.scores[0] >= 10) {
				this.io.in(this.room).emit("gameOver", {winner: "Team One", player1: this.playerNames[0], player2: this.playerNames[2]});
			} else if (this.scores[1] >= 10) {
				this.io.in(this.room).emit("gameOver", {winner: "Team Two", player1: this.playerNames[1], player2: this.playerNames[3]});
			} else {
				// this play is over, but the game is still going
				this.playerSockets[this.dealer].removeAllListeners("changeCard");
				this.current = this.dealer;
				this.dealer = this.next();
				this.deck = new exports.Deck();
				if (this.dealer == 3) {
					this.starter = 0;
				} else {
					this.starter = this.dealer + 1;
				}
				this.tricks = [0, 0, 0, 0];
				this.currentRoundCards = [];
				this.chooseTrump();
			}
		} else {
			//this round is over, but this play is still going
			this.starter = winner;
			this.currentRoundCards = [];
			this.start();
		}
	}

	next() {
		if (this.current == 3) {
			this.current = 0;
			return 0;
		} else {
			this.current = this.current + 1;
			return this.current;
		}
	}

	//step 1
	chooseTrump() {
		//deal
		this.playerSockets[0].emit("deal", {cards: this.deck.cards.slice(0, 5), card: this.deck.cards[20], dealer: this.playerNames[this.dealer]});
		this.playerSockets[1].emit("deal", {cards: this.deck.cards.slice(5, 10), card: this.deck.cards[20], dealer: this.playerNames[this.dealer]});
		this.playerSockets[2].emit("deal", {cards: this.deck.cards.slice(10, 15), card: this.deck.cards[20], dealer: this.playerNames[this.dealer]});
		this.playerSockets[3].emit("deal", {cards: this.deck.cards.slice(15, 20), card: this.deck.cards[20], dealer: this.playerNames[this.dealer]});

		
		//dealer pick up
		this.playerSockets[this.dealer].on("changeCard", data => {
			console.log("change CArd");
			for (let i = 0; i < 5; i++) {
				let cardi = this.deck.cards[i];
				if (cardi.suit == data.suit && cardi.rank == data.rank) {
					console.log(this.deck.cards[i]);
					[this.deck.cards[i], this.deck.cards[20]] = [this.deck.cards[20], this.deck.cards[i]]
					console.log(this.deck.cards[i]);
					break;
				}
			}
			//this.start();
		})

		//dealer + 1
		console.log("dealer + 1" + this.current);
		this.playerSockets[this.next()].emit("order?");
		this.playerSockets[this.current].on("order.", data1 => {
			if (data1.result == true) {
				this.maker = this.current;
				this.io.in(this.room).emit("make trump", {player: data1.player, trump: data1.trump});
				this.trump = data1.trump;
				this.playerSockets[this.dealer].emit("pick up");
				this.playerSockets[this.current].removeAllListeners("order.");
				this.start();
			} else {
				//dealer + 2
				console.log("dealer + 2 " + this.current);
				this.playerSockets[this.next()].emit("order?");
				this.playerSockets[this.current].on("order.", data2 => {
					if (data2.result == true) {
						this.maker = this.current;
						this.io.in(this.room).emit("make trump", {player: data2.player, trump: data2.trump});
						this.trump = data2.trump;
						this.playerSockets[this.dealer].emit("pick up");
						this.start();
						this.playerSockets[this.current].removeAllListeners("order.");
					} else {
						//dealer + 3
						console.log("dealer + 3 " + this.current);
						this.playerSockets[this.next()].emit("order?");
						this.playerSockets[this.current].on("order.", data3 => {
							if (data3.result == true) {
								this.maker = this.current;
								this.io.in(this.room).emit("make trump", {player: data3.player, trump: data3.trump});
								this.trump = data3.trump;
								this.playerSockets[this.dealer].emit("pick up");
								this.start();
								this.playerSockets[this.current].removeAllListeners("order.");
							} else {
								//dealer
								console.log("dealer " + this.current);
								this.playerSockets[this.next()].emit("order?");
								this.playerSockets[this.current].on("order.", data4 => {
									if (data4.result == true) {
										this.maker = this.current;
										this.io.in(this.room).emit("make trump", {player: data4.player, trump: data4.trump});
										this.trump = data4.trump;
										this.playerSockets[this.dealer].emit("pick up");
										this.start();
										this.playerSockets[this.current].removeAllListeners("order.");
									} else {
										//dealer + 1 pick trump
										console.log("dealer + 1 " + this.current);
										this.playerSockets[this.next()].emit("pick trump suit");
										this.playerSockets[this.current].on("select suit", data5 => {
											if (data5.result == true) {
												this.maker = this.current;
												this.io.in(this.room).emit("make trump", {player: data5.player, trump: data5.trump});
												this.trump = data5.trump;
												this.start();
											} else {
												//dealer + 2 pick trump
												console.log("dealer + 2 " + this.current);
												this.playerSockets[this.next()].emit("pick trump suit");
												this.playerSockets[this.current].on("select suit", data6 => {
													if (data6.result == true) {
														this.maker = this.current;
														this.io.in(this.room).emit("make trump", {player: data6.player, trump: data6.trump});
														this.trump = data6.trump;
														this.start();
													} else {
														//dealer + 3 pick trump
														console.log("dealer + 3 " + this.current);
														this.playerSockets[this.next()].emit("pick trump suit");
														this.playerSockets[this.current].on("select suit", data7 => {
															if (data7.result == true) {
																this.maker = this.current;
																this.io.in(this.room).emit("make trump", {player: data7.player, trump: data7.trump});
																this.trump = data7.trump;
																this.start();
															} else {
																//dealer pick trump
																console.log("dealer " + this.current);
																this.playerSockets[this.next()].emit("pick trump suit");
																this.playerSockets[this.current].on("select suit", data8 => {
																	if (data8.result == true) {
																		this.maker = this.current;
																		this.io.in(this.room).emit("make trump", {player: data8.player, trump: data8.trump});
																		this.trump = data8.trump;
																		//this.playerSockets[this.current].removeAllListeners("pick trump suit");
																		this.start();
																	} else {
																		// start again
																		this.playerSockets[this.dealer].removeAllListeners("changeCard");
																		this.current = this.dealer;
																		this.dealer = this.next();
																		this.deck = new exports.Deck();
																		if (this.dealer == 3) {
																			this.starter = 0;
																		} else {
																			this.starter = this.dealer + 1;
																		}
																		this.tricks = [0, 0, 0, 0];
																		this.currentRoundCards = [];
																		for (let i = 0; i < 4; i++) {
																			this.playerSockets[i].removeAllListeners("order.");
																			this.playerSockets[i].removeAllListeners("select suit");
																		}
																		this.chooseTrump();
																	}
																})
															}
														})
													}
												})
											}
										})
									}
								})
				//
							}
						})
					}
				})
				// dealer + 2
			}
		})
	}

	//step 2
	start() {
		for (let i = 0; i < 4; i++) {
			this.playerSockets[i].removeAllListeners("order.");
			this.playerSockets[i].removeAllListeners("select suit");
		}
		console.log("play cards!!");
		this.playerSockets[this.starter].emit("play card");
	}
}
//
exports.Game = class Game {
	constructor() {
		this.playNum = 0;
		this.playerNames = [];
		this.playerSockets = [];
	}
}