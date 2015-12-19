var Strategy = function(sn) {
	this.btn10 = document.getElementById("interval1");
	this.btn50 = document.getElementById("interval5");
	this.btnP1 = document.getElementById("player1");
	this.btnP2 = document.getElementById("player2");
	this.p1name = this.btnP1.getAttribute("value");
	this.p2name = this.btnP2.getAttribute("value");
	this.strategyName = sn;
	this.prediction = null;
	this.debug = true;
	this.levels = [[0, 1000, 0],  //between 0-1000 multiply flatAmount by 0; all-in
				   [1000, 10000, 1],  //between 1000-10000 multiply flatAmount by 1, etc down the way
				   [10000, 100000, 10],
				   [100000, 500000, 25],
				   [500000, 1000000, 100],
				   [1000000, 5000000, 250],
				   [5000000, 20000000, 300]];
};
Strategy.prototype.getBailout = function(tournament){
	var nameSpan = document.getElementsByTagName("h2")[0].children[2];
	var isIlluminati = false;
	try { // the html is different for illuminati??
		isIlluminati = nameSpan && nameSpan.children[0].classList && nameSpan.children[0].classList.contains("goldtext");
	} catch (e) { // this is how it is for non-illums:
		isIlluminati = nameSpan && nameSpan.classList && nameSpan.classList.contains("goldtext");
	}
	var level = 1;
	var rank = document.getElementById("rank");
	if (rank!=null){
		var re=/rank([0-9]{1,2})\.png/g;
		var match=re.exec(rank.childNodes[0].src);
		level=parseInt(match[1]);
	}

	if(isIlluminati)
		if (tournament)
			return 3000 + level*50;
		else
			return 2000 + level*50;
	else
		if (tournament)
			return 1000 + level*25;
		else
			return 100 + level*25;
};
Strategy.prototype.flatBet = function(balance, tournament, debug) {
	var flatAmount = 100;  //base bet amount
	var multiplierIndex = 2;  //index of levels[x[]] that holds the multiplier value
	var intendedBet = flatAmount * this.levels[this.level][multiplierIndex] * this.confidence;  //multiply flat amount based on salt total and confidence
	var bailout = this.getBailout(tournament)
	if (debug)
		console.log("- betting at level: " + this.level + ", confidence: " + (this.confidence * 100).toFixed(2));  //output betting scheme to console
	if (!tournament && intendedBet < bailout && 2*bailout > balance) {
		if (debug) console.log("- " + balance + " too close to bailout (" + bailout + "), betting " + bailout + " instead of " + intendedBet)
		intendedBet = bailout;
	}
	if (this.level == 0)
		return balance;  //all-in at level 0
	else
		return Math.ceil(intendedBet);  //returns bet rounded up to the nearest int
};
Strategy.prototype.adjustLevel = function(balance) {
	if (!this.level)
		this.level = 0;
	//this.levels = [[0, 1000, 0], [1000, 10000, 1], [10000, 100000, 10], [100000, 500000, 25], [500000, 1000000, 100], [1000000, 5000000, 250]];
	var valley = 0;  //minimum for current level
	var peak = 1;  //maximum for current level
	var maxLv = this.levels.length - 1;  //currently with a max of 20m, sets to 6 (levels.length = 7)
	var minLv = 0;  //minimum betting level
	var changed = false;
	do {
		changed = false;  //resets the loop when changed == true
		if (this.level + 1 <= maxLv && balance >= this.levels[this.level][peak]) {  //if not at max level and balance is greater than the maximum for current level
			this.level += 1;  //increase betting level
			changed = true;
			if (balance == this.levels[this.level][valley]) return;  //allow to stay in betting level at exact minimum for the level
		} else if (this.level - 1 >= minLv && balance <= this.levels[this.level][valley]) {  //if not at minimum level and balance is lower than minimum for current level
			this.level -= 1;  //lower betting level
			changed = true;
		}
	} while (changed);
};
Strategy.prototype.getWinner = function(ss) {
	return ss.getWinner();  //I don't understand a bit of what this does, actually.  it seems like it calls a loop onto itself, or just returns literally nothing?  idk.
};
Strategy.prototype.getBetAmount = function(balance, tournament, debug) {  //is this a deprecated function?
	if (!this.confidence)
		this.confidence = 1;  //make sure confidence exists and has a value

	var minimum = 100 + Math.round(Math.random() * 50);
	var amountToBet;
	var bailout = this.getBailout(tournament);

	if (tournament) {
		var allIn = balance <= 2*bailout || this.confidence > 0.9 || (1 - this.confidence) * balance <= bailout;
		amountToBet = (!allIn) ? Math.round(balance * (this.confidence || 0.5)) : balance;  //I need to figure out what this actually does and how these work with all the different operators and operands
		var bailoutMessage=0;
		if (amountToBet < bailout){
			bailoutMessage = amountToBet;
			amountToBet = bailout;  //makes sure to always bet at least bailout
		}
		if (amountToBet > balance)
        	amountToBet = balance;  //makes sure to never try to bet more than the current balance
		if (debug) {
			if (allIn)
				console.log("- ALL IN: " + balance);
			else if(bailoutMessage!=0)
				console.log("- amount is less than bailout ("+bailoutMessage+"), betting bailout: "+amountToBet);
			else if (this.confidence)
				console.log("- betting: " + balance + " x  cf(" + (this.confidence * 100).toFixed(2) + "%) = " + amountToBet);
			else
				console.log("- betting: " + balance + " x  50%) = " + amountToBet);
		}
	} else if (!(this.lowBet && this instanceof RatioConfidence)) {
		amountToBet = Math.round(balance * .1 * this.confidence);
		if (amountToBet > balance * .1)
			amountToBet = Math.round(balance * .1);
		if (amountToBet < bailout){
			if (debug)
				console.log("- amount is less than bailout ("+amountToBet+"), betting bailout: "+bailout);
			amountToBet = bailout;
		} else if (debug)
			console.log("- betting: " + balance + " x .10 =(" + (balance * .1) + ") x cf(" + (this.confidence * 100).toFixed(2) + "%) = " + amountToBet);
	} else {
		var p05 = Math.ceil(balance * .01);
		var cb = Math.ceil(balance * this.confidence);
		amountToBet = (p05 < cb) ? p05 : cb;
		if (amountToBet < bailout)
        	amountToBet = bailout;
		if (debug)
			console.log("- betting without confidence: " + amountToBet);
	}
	return amountToBet;
};

var CoinToss = function() {
	Strategy.call(this, "ct");
};
var formatString = function(s, len){
	while (s.length < len) {
		s+=" ";
	}
	return s.substring(0, len);
};
CoinToss.prototype = Object.create(Strategy.prototype);
CoinToss.prototype.execute = function(info) {
	var c1 = info.character1;
	var c2 = info.character2;
	this.prediction = (Math.random() > .5) ? c1.name : c2.name;
	return this.prediction;
};

var RatioConfidence = function() {
	Strategy.call(this, "rc");
	this.abstain = false;
};
RatioConfidence.prototype = Object.create(Strategy.prototype);
RatioConfidence.prototype.execute = function(info) {
	var self = this;
	var c1 = info.character1;  //sets to character1 object
	var c2 = info.character2;
	var c1TotalMatches = c1.wins.length + c1.losses.length;
	var c2TotalMatches = c2.wins.length + c2.losses.length;
	var p;

	if (c1TotalMatches < 3 || c2TotalMatches < 3) {
		if (this.debug)
			console.log("- Cowboy has insufficient information, W:L(P1)(P2)->  (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + ")");
		self.abstain = true;
		self.lowBet = true;
		return null;
	}
	var c1Ratio = (c1TotalMatches) ? c1.wins.length / c1TotalMatches : 0;  //if c1TotalMatches == true (greater than 0), then set to wins / matches, otherwise set to 0
	var c2Ratio = (c2TotalMatches) ? c2.wins.length / c2TotalMatches : 0;

	if (c1Ratio != c2Ratio) {
		c1.ratio = c1Ratio;
		c2.ratio = c2Ratio;
		var pChar = (c1.ratio > c2.ratio) ? c1 : c2;
		var npChar = (c1.ratio < c2.ratio) ? c1 : c2;
		//confidence score
		self.confidence = (pChar.name == c1.name) ? c1Ratio - c2Ratio : c2Ratio - c1Ratio;
		self.confidence += 0.5;
		if (self.confidence>1)self.confidence=1;
		if (self.confidence < 0.6) {
			if (this.debug)
				console.log("- Cowboy has insufficient confidence (confidence: " + self.confidence.toFixed(2) + "), W:L(P1)(P2)-> (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + ")");
			self.abstain = true;
			self.lowBet = true;
			return null;
		}
		if (pChar.ratio <= 0.5 || (npChar.ratio == 0.5 && (npChar.wins.length + npChar.losses.length == 2))) {
			if (this.debug)
				console.log("- Cowboy discourages betting on or against <51% (" + (c1Ratio * 100).toFixed(2) + "% : " + (c2Ratio * 100).toFixed(2) + "%)");
			self.abstain = true;
			self.lowBet = true;
			return null;
		}
		p = pChar.name;
		if (this.debug)
			console.log("- " + p + " has a better win percentage (" + (c1Ratio * 100).toFixed(2) + "% : " + (c2Ratio * 100).toFixed(2) + "%); RB betting " + p + " confidence: " + self.confidence.toFixed(2));
		self.prediction = p;
		return p;
	} else if (c1Ratio == c2Ratio) {
		if (this.debug)
			console.log("- Cowboy has insufficient information (" + (c1Ratio * 100).toFixed(2) + "% : " + (c2Ratio * 100).toFixed(2) + "%)");
		self.abstain = true;
		self.lowBet = true;
		return null;
	}
};

var Chromosome = function() {
	// confidence weights
	this.crowdFavorWeight = 1;
	this.illumFavorWeight = 1;
	// tier scoring
	this.wX = 5;
	this.wS = 4;
	this.wA = 3;
	this.wB = 2;
	this.wP = 1;
	this.wU = 0.5;
	this.lX = 2.5;
	this.lS = 2;
	this.lA = 1.5;
	this.lB = 1;
	this.lP = .5;
	this.lU = 0.25;
	// win% weights
	this.wpX = 3;
	this.wpS = 5;
	this.wpA = 4;
	this.wpB = 2;
	this.wpP = 1;
	this.wpU = .5;
	// odds weights
	this.oX = 5;
	this.oS = 4;
	this.oA = 3;
	this.oB = 2;
	this.oP = 1;
	this.oU = 0.5;
	// times weights
	this.wtX = 5;
	this.wtS = 4;
	this.wtA = 3;
	this.wtB = 2;
	this.wtP = 1;
	this.wtU = 0.5;
	this.ltX = 2.5;
	this.ltS = 2;
	this.ltA = 1.5;
	this.ltB = 1;
	this.ltP = 0.5;
	this.ltU = 0.25;
	return this;
};
Chromosome.prototype.loadFromJSON = function(json) {
	var copy = JSON.parse(json);
	for (var i in copy) {
		this[i] = parseFloat(copy[i]);
	}
	return this;
};
Chromosome.prototype.loadFromObject = function(obj) {
	for (var i in obj) {
		this[i] = parseFloat(obj[i]);
	}
	return this;
};
Chromosome.prototype.toDisplayString = function() {
	var results = "-\nchromosome:";
	for (var i in this) {
		if ( typeof this[i] != "function")
			results += "\n" + i + " : " + this[i];
	}
	return results;
};
Chromosome.prototype.mate = function(other) {
	var offspring = new Chromosome();
	for (var i in offspring) {
		if ( typeof offspring[i] != "function") {
			offspring[i] = (Math.random() > 0.5) ? this[i] : other[i];
			// 20% chance of mutation
			if (Math.random() < 0.2 && offspring[i] != null)
				var radiation = Math.random() + Math.random(); // Calculate radiation only when we are going to mutate
				radiation *= radiation;
				offspring[i] *= radiation;
		}
	}
	return offspring;
};
Chromosome.prototype.equals = function(other) {
	var anyDifference = false;
	for (var i in other) {
		if ( typeof other[i] != "function")
			if (this[i] != other[i])
				anyDifference = true;
	}
	return !anyDifference;
};
var CSStats = function(cObj, chromosome) {
	var oddsSum = 0;
	var oddsCount = 0;
	var winTimesTotal = 0;
	var winTimesTotalRaw = 0; // "Raw" for display message, unweighted
	var lossTimesTotal = 0;
	var lossTimesTotalRaw = 0;
	var timedWonMatchesCount = 0;
	var timedLostMatchesCount = 0;
	this.wins = 0;
	this.losses = 0;
	this.averageOdds = null;
	this.averageWinTime = null;
	this.averageWinTimeRaw = null;
	this.averageLossTime = null;
	this.averageLossTimeRaw = null;
	this.cfPercent = null;
	this.ifPercent = null;
	//added these to accurately track total wins/losses
	this.totalWins = cObj.wins.length;
	this.totalLosses = cObj.losses.length;
	this.charTier = ["", "", "", "", "", ""];
	this.charRecentTierWin = "";
	this.charRecentTierLoss = "";

	var wint = 0;
	var losst = 0;
	while (wint < cObj.wins.length) {
		switch (cObj.wins[wint]) {
			case "U":
				this.charTier[5] += "U";
				break;
			case "P":
				this.charTier[4] += "P";
				break;
			case "B":
				this.charTier[3] += "B";
				break;
			case "A":
				this.charTier[2] += "A";
				break;
			case "S":
				this.charTier[1] += "S";
				break;
			case "X":
				this.charTier[0] += "X";
				break;
		}
		if (wint == (cObj.wins.length - 1)) {
			this.charRecentTierWin = cObj.wins[wint];
		}
		wint++;
	}
	while (losst < cObj.losses.length) {
		switch (cObj.losses[losst]) {
			case "U":
				this.charTier[5] += "U";
				break;
			case "P":
				this.charTier[4] += "P";
				break;
			case "B":
				this.charTier[3] += "B";
				break;
			case "A":
				this.charTier[2] += "A";
				break;
			case "S":
				this.charTier[1] += "S";
				break;
			case "X":
				this.charTier[0] += "X";
				break;
		}
		if (losst == (cObj.losses.length - 1)) {
			this.charRecentTierLoss = cObj.losses[losst];
		}
		losst++;
	}
	this.charTier.sort(function(a, b){return b.length>a.length});  //sort according to longest length- get most common tier of recorded matches
	if (this.charTier[0].length == 0) {  //make sure there is at least something there, Unknown tier if nothing else found in wins or losses- prevents exceptions and lessens handling needed later
		this.charTier[0] += "U";
	}

	for (var jj = 0; jj < cObj.wins.length; jj++)
		this.wins += chromosome["w" + cObj.wins[jj]];  //sets wins to the int value of the chromosome weight of win "w" + tier of character win (cObj.wins[jj] returns string of tier it won in, ex: "A", "B", "S")

	for (var kk = 0; kk < cObj.losses.length; kk++)  //same for losses
		this.losses += chromosome["l" + cObj.losses[kk]];

	for (var i = 0; i < cObj.odds.length; i++) {
		if (cObj.odds[i] != -1) {
			oddsSum += cObj.odds[i] * chromosome["o" + cObj.tiers[i]];
			oddsCount += 1;
		}
	}
	this.averageOdds = (oddsCount != 0) ? oddsSum / oddsCount : null;  //if there are odds recorded, set to sum / count, otherwise null
	//
	for (var j = 0; j < cObj.winTimes.length; j++) {  //this is to do with the WIN times
		if (cObj.winTimes[j] != 0) {
			winTimesTotal += cObj.winTimes[j] * chromosome["wt" + cObj.wins[j]];
			winTimesTotalRaw += cObj.winTimes[j];
			timedWonMatchesCount += 1;
		}
	}
	this.averageWinTime = (winTimesTotal != 0) ? winTimesTotal / timedWonMatchesCount : null;
	this.averageWinTimeRaw = (winTimesTotal != 0) ? winTimesTotalRaw / timedWonMatchesCount : null;

	for (var k = 0; k < cObj.lossTimes.length; k++) {  //this is to do with the LOSS times
		if (cObj.winTimes[k] != 0) {
			lossTimesTotal += cObj.lossTimes[k] * chromosome["lt" + cObj.losses[k]];
			lossTimesTotalRaw += cObj.lossTimes[k];
			timedLostMatchesCount += 1;
		}
	}
	this.averageLossTime = (lossTimesTotal != 0) ? lossTimesTotal / timedLostMatchesCount : null;
	this.averageLossTimeRaw = (lossTimesTotal != 0) ? lossTimesTotalRaw / timedLostMatchesCount : null;

	//debug testing area

	// expert opinion section
	if (cObj.crowdFavor.length > 0) {
		var cfSum = 0;
		for (var l = 0; l < cObj.crowdFavor.length; l++) {
			cfSum += cObj.crowdFavor[l];
		}
		this.cfPercent = cfSum / cObj.cf.length;
	}
	if (cObj.illumFavor.length > 0) {
		var ifSum = 0;
		for (var m = 0; m < cObj.illumFavor.length; m++) {
			cfSum += cObj.illumFavor[m];
		}
		this.ifPercent = ifSum / cObj.illumFavor.length;
	}
};
var ConfidenceScore = function(chromosome, level, lastMatchCumulativeBetTotal) {  //begin SCIENTIST strategy section
	Strategy.call(this, "cs");
	this.abstain = false;
	this.confidence = null;
	this.possibleConfidence = 0;
	this.chromosome = chromosome;
	this.level = level;
	this.lastMatchCumulativeBetTotal = lastMatchCumulativeBetTotal;
};
ConfidenceScore.prototype = Object.create(Strategy.prototype);
ConfidenceScore.prototype.__super__ = Strategy;
ConfidenceScore.prototype.getBetAmount = function(balance, tournament, debug) {  //takes arguments, returns bet
	if (tournament)  //if tournament mode
		return this.__super__.prototype.getBetAmount.call(this, balance, tournament, debug);  //return value of function call on getBetAmount using arguments  (tournament betting schema)
	return this.__super__.prototype.flatBet.call(this, balance, tournament, debug);  //otherwise return value of function call on flatBet (normal betting)
};
ConfidenceScore.prototype.execute = function(info) {
	//mirror data from info
	var c1 = info.character1;
	var c2 = info.character2;
	var matches = info.matches;
	//mirror data from chromosome
	var crowdFavorWeight = this.chromosome.crowdFavorWeight;
	var illumFavorWeight = this.chromosome.illumFavorWeight;

	// messages
	var oddsMessage = null;
	var timeMessage = null;
	var winsMessage = null;
	var crwdMessage = null;
	var ilumMessage = null;
	var messagelength = 15;

	// the weights come in from the chromosome
  var c1Score = 0;
  var c2Score = 0;

	//


	//
	var c1Stats = new CSStats(c1, this.chromosome);  //creates a new CSStats using c1 data and current chromosome
	var c2Stats = new CSStats(c2, this.chromosome);

	if (c1Stats.averageOdds != null && c2Stats.averageOdds != null) {
		var lesserOdds = (c1Stats.averageOdds < c2Stats.averageOdds) ? c1Stats.averageOdds : c2Stats.averageOdds;  //determines which character has lower average odds
		this.oddsConfidence = [(c1Stats.averageOdds / lesserOdds), (c2Stats.averageOdds / lesserOdds)];  //lower odds are guaranteed to be 1
		if (this.debug) oddsMessage = "predicted odds -> ("+formatString(""+(this.oddsConfidence[0]).toFixed(2)+" : "+(this.oddsConfidence[1]).toFixed(2), messagelength)+")"
	} else {
		this.oddsConfidence = null;
	}

	//testing variables area
	var c1WinsTotal = (c1Stats.totalWins != null) ? c1Stats.totalWins : 0;
	var c2WinsTotal = (c2Stats.totalWins != null) ? c2Stats.totalWins : 0;
	var c1LossesTotal = (c1Stats.totalLosses != null) ? c1Stats.totalLosses : 0;
	var c2LossesTotal = (c2Stats.totalLosses != null) ? c2Stats.totalLosses : 0;


	var c1WT = c1WinsTotal + c1LossesTotal;  //char 1 total matches; THIS AND THINGS BELOW IT WERE PREVIOUSLY USING CHROMOSOME-WEIGHTED TOTALS (which is cute, but WRONG)
	var c2WT = c2WinsTotal + c2LossesTotal;
	var c1WP = (c1WT != 0) ? c1WinsTotal / c1WT : 0; //determines char 1 win %
	var c2WP = (c2WT != 0) ? c2WinsTotal / c2WT : 0;

	var wpTotal = c1WinsTotal + c2WinsTotal;  //total wins between both characters
	var c1WPDisplay = wpTotal > 0 ? c1WinsTotal / wpTotal : 0;  //percentage of combined wins that belong to char 1  (I NEED TO POTENTIALLY WEIGHT THIS AGAINST ACTUAL # OF MATCHES IF THIS GETS USED [which it isn't])
	var c2WPDisplay = wpTotal > 0 ? c2WinsTotal / wpTotal : 0;
	if (this.debug) winsMessage = "\xBB WINS/LOSSES:     " + "unweighted totals as % (red:blue) -> (" + (c1WP * 100).toFixed(0) + " : " + (c2WP * 100).toFixed(0) + ")" +"  weighted totals as % (red:blue) -> ("+(c1WPDisplay*100).toFixed(0)+" : "+(c2WPDisplay*100).toFixed(0)+")"+
				  "  ::  unweighted (red W:L)(blue W:L) -> ("+ c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length+")"+
				  "  ::  details (red W:L)(blue W:L) -> (" + c1.wins.toString().replace(/,/g, '') + ":" + c1.losses.toString().replace(/,/g, '') + ")" +
				                                  "(" + c2.wins.toString().replace(/,/g, '') + ":" + c2.losses.toString().replace(/,/g, '') + ")";

	//debug testing area
	var charTiers = ["U", "P", "B", "A", "S", "X"];
	var matchTier;
	var c1t = c1Stats.charTier[0].slice(0, 1);
	var c1rw = (c1Stats.charRecentTierWin != "") ? c1Stats.charRecentTierWin : c1t;
	var c1rl = (c1Stats.charRecentTierLoss != "") ? c1Stats.charRecentTierLoss : c1t;
	var c2t = c2Stats.charTier[0].slice(0, 1);
	var c2rw = (c2Stats.charRecentTierWin != "") ? c2Stats.charRecentTierWin : c2t;
	var c2rl = (c2Stats.charRecentTierLoss != "") ? c2Stats.charRecentTierLoss : c2t;

	if ((c1t == c2t) && (c1rw == c2rw) && (c1rl == c2rl)) {
		matchTier = c1t;
	}
	else if ((c1t != c2t) && (c1rw == c2rw) && (c1rl == c2rl)) {
		matchTier = c1rw;
	}
	else if ((c1t != c2t) && (c1rw != c2rw) && (c1rl == c2rl)) {
		matchTier = c1rl;
	}
	else if ((c1t == c2t) && (c1rw != c2rw) && (c1rl != c2rl)) {
		matchTier = (charTiers.indexOf(c1t) > charTiers.indexOf(c2t)) ? c1t : c2t;
	}
	else if ((c1t != "U") & (c2t == "U")) {
		matchTier = c1t;
	}
	else if ((c1t == "U") & (c2t != "U")) {
		matchTier = c2t;
	}
	else {
		matchTier = "U";
	}

	//adds each character's win/loss scores to their score, weighted for the lower number of total matches between the two characters
	var zValueWeighting = 0;
	if (c1WT == 0 || c2WT == 0) {
		zValueWeighting = 1;
	}
	else if (c1WT != null || c2WT != null) {
		zValueWeighting = (c1WT > c2WT) ? (c1WT / c2WT) : (c2WT / c1WT)  //makes a weighting value that extrapolates the matchup data to the character with more recorded matches so less data doesn't result in unfair weighting
	}
	else {
		zValueWeighting = 1;
	}

	c1ScoreValue = 0;
	c2ScoreValue = 0;

	if ((c1WT > c2WT) && (c1WT != null) && (c2WT != null)) {
		c1ScoreValue += (c1Stats.wins + c1Stats.losses);
		c2ScoreValue += ((c2Stats.wins + c2Stats.losses) * zValueWeighting);  //character with less recorded data gets a modifier for their score to make it like both characters had the same amount of data
		if ((matchTier != null) && (charTiers.indexOf(matchTier) >= 0)) {
			c1Score += ((this.chromosome["w" + matchTier]) * (c1ScoreValue / (c1ScoreValue + c2ScoreValue)))
			c2Score += ((this.chromosome["w" + matchTier]) * (c2ScoreValue / (c1ScoreValue + c2ScoreValue)))
		}
	}
	else if ((c1WT < c2WT) && (c1WT != null) && (c2WT != null)) {
		c1ScoreValue += ((c1Stats.wins + c1Stats.losses) * zValueWeighting);  //character with less recorded data gets a modifier for their score to make it like both characters had the same amount of data
		c2ScoreValue += (c2Stats.wins + c2Stats.losses);
		if ((matchTier != null) && (charTiers.indexOf(matchTier) >= 0)) {
			c1Score += ((this.chromosome["w" + matchTier]) * (c1ScoreValue / (c1ScoreValue + c2ScoreValue)))
			c2Score += ((this.chromosome["w" + matchTier]) * (c2ScoreValue / (c1ScoreValue + c2ScoreValue)))
		}
	}

	//adds win percentage weighting to whichever character's win% is higher's score
	if ((c1WP != null) && (c2WP != null) && (matchTier != null) && (charTiers.indexOf(matchTier) >=0)) {
		c1Score += ((this.chromosome["wp" + matchTier]) * (c1WP / (c1WP + c2WP)));
		c2Score += ((this.chromosome["wp" + matchTier]) * (c2WP / (c2WP + c1WP)));
	}
	//and now we do the same for odds weighting
	if ((c1Stats.averageOdds != null) && (c2Stats.averageOdds != null) && (matchTier != null) && (charTiers.indexOf(matchTier) >=0)) {
		c1Score += ((this.chromosome["o" + matchTier]) * (c1Stats.averageOdds / (c1Stats.averageOdds + c2Stats.averageOdds)));
		c2Score += ((this.chromosome["o" + matchTier]) * (c2Stats.averageOdds / (c1Stats.averageOdds + c2Stats.averageOdds)));
	}

	//and then win time weighting
	if ((c1Stats.averageWinTime != null) && (c2Stats.averageWinTime != null) && (matchTier != null) && (charTiers.indexOf(matchTier) >=0)) {
    c1Score += ((this.chromosome["wt" + matchTier]) * (1 - (c1Stats.averageWinTime / (c1Stats.averageWinTime + c2Stats.averageWinTime))));
		c2Score += ((this.chromosome["wt" + matchTier]) * (1 - (c2Stats.averageWinTime / (c1Stats.averageWinTime + c2Stats.averageWinTime))));
		if (this.debug) timeMessage = "avg win time (red:blue) -> ("+formatString(c1Stats.averageWinTimeRaw.toFixed(0)+" : "+c2Stats.averageWinTimeRaw.toFixed(0), messagelength)+")";
	}

	//and then loss time weighting
	if ((c1Stats.averageLossTime != null) && (c2Stats.averageLossTime != null) && (matchTier != null) && (charTiers.indexOf(matchTier) >=0)) {
		c1Score += ((this.chromosome["lt" + matchTier]) * (c1Stats.averageLossTime / (c1Stats.averageLossTime + c2Stats.averageLossTime)));
		c2Score += ((this.chromosome["lt" + matchTier]) * (c2Stats.averageLossTime / (c1Stats.averageLossTime + c2Stats.averageLossTime)));
		if (this.debug) {
			var msg = "  ::  avg loss time (red:blue) -> ("+formatString(c1Stats.averageLossTimeRaw.toFixed(0)+" : "+c2Stats.averageLossTimeRaw.toFixed(0), messagelength)+")";
			if (timeMessage)
				timeMessage += msg;
			else
				timeMessage = msg;
		}
	}

	//and uh, crowd favor weighting?
	if (c1Stats.cfPercent != null && c2Stats.cfPercent != null) {
		if (c1Stats.cfPercent != c2Stats.cfPercent) {
			c1Score += (crowdFavorWeight * (c1Stats.cfPercent / (c1Stats.cfPercent + c2Stats.cfPercent)));
			c2Score += (crowdFavorWeight * (c2Stats.cfPercent / (c1Stats.cfPercent + c2Stats.cfPercent)));
		}
		var cfPercentTotal = c1Stats.cfPercent + c2Stats.cfPercent;
		if (this.debug) crwdMessage = "crowd favor (red:blue) -> ("+formatString((c1Stats.cfPercent/cfPercentTotal*100).toFixed(0)+
							 " : "+(c2Stats.cfPercent/cfPercentTotal*100).toFixed(0), messagelength)+")";
	}

	//and the last bs stat
	if (c1Stats.ifPercent != null && c2Stats.ifPercent != null) {
		if (c1Stats.ifPercent != c2Stats.ifPercent) {
			c1Score += (illumFavorWeight * (c1Stats.ifPercent / (c1Stats.ifPercent + c2Stats.ifPercent)));
			c2Score += (illumFavorWeight * (c2Stats.ifPercent / (c1Stats.ifPercent + c2Stats.ifPercent)));
		}
		var ifPercentTotal = c1Stats.ifPercent + c2Stats.ifPercent;
		if (this.debug) ilumMessage = "illuminati favor (red:blue) -> ("+formatString((c1Stats.ifPercent/ifPercentTotal*100).toFixed(0)+
        							 " : "+(c2Stats.ifPercent/ifPercentTotal*100).toFixed(0), messagelength)+")";
	}

	if (this.debug){
		console.log("\n");
		console.log("\xBB PREDICTION STATS for ("+c1.name+" VS "+c2.name+") \xBB");
		console.log(winsMessage);
		var line2 = "\xBB ";
		if (oddsMessage) line2 += oddsMessage;
		if (timeMessage) line2 += "  ::  " + timeMessage;
		if (line2.length>2) console.log(line2);
		var line3 = "\xBB ";
		if (crwdMessage) line3 += crwdMessage;
		if (ilumMessage) line3 += "  ::  " + ilumMessage;
		if (line3.length>2) console.log(line3);
		console.log("\n");
	}

	// final decision THIS IS WHERE THE MAGIC HAPPENS

	// figure out prediction, confidence

	this.prediction = (c1Score > c2Score) ? c1.name : c2.name;

	var winnerPoints = (this.prediction == c1.name) ? c1Score : c2Score;
	var totalAvailablePoints = c1Score + c2Score;
	this.confidence = parseFloat((winnerPoints / totalAvailablePoints));  //NOW TAKES INTO ACCOUNT DYNAMIC WEIGHTING I IMPLEMENTED

	/*---------------------------------------------------------------------------------------------------*/
	// CONFIDENCE ADJUSTMENT SECTION
	/*---------------------------------------------------------------------------------------------------*/

	// var unconfident = false;
	var nerfAmount = 0;
	var nerfMsg = "-- PROBLEMS:";
	if ((c1Score == c2Score) || c1.wins.length + c1.losses.length <= 3 || c2.wins.length + c2.losses.length <= 3) {
		nerfAmount += .3;
		nerfMsg += "\n- insufficient information (scores: " + c1Score.toFixed(2) + ":" + c2Score.toFixed(2) + "), W:L(P1)(P2)-> (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + "), ";
	}

	// nerf the confidence if there is a reason
	if (nerfAmount != 0) {
		if (this.debug)
			console.log(nerfMsg + "\n--> dropping confidence by " + (nerfAmount * 100).toFixed(0) + "%");
		this.confidence *= 1 - nerfAmount;
	}

	// make sure something gets bet
	if (this.confidence < 0)
		this.confidence = .01;

	return this.prediction;
};

var ChromosomeIPU = function() {
	Strategy.call(this);
	this.baseBettingTier = 1500;
};
ChromosomeIPU.prototype = Object.create(Chromosome.prototype);
;
var InternetPotentialUpset = function(cipu, level) {
	Strategy.call(this, "ipu");
	this.debug = true;
	this.ct = new CoinToss();
	this.chromosome = cipu;
	// even though it doesn't use it, it needs confidence so as to be marked as new
	this.confidence = 1;
	this.level = level;
};
InternetPotentialUpset.prototype = Object.create(Strategy.prototype);
InternetPotentialUpset.prototype.__super__ = Strategy;
InternetPotentialUpset.prototype.execute = function(info) {
	this.prediction = this.ct.execute(info);
	if (this.debug)
		console.log("- Lunatic is 50% confident, bBT: " + this.chromosome.baseBettingTier);
	return this.prediction;
};
InternetPotentialUpset.prototype.getBetAmount = function(balance, tournament, debug) {
	if (tournament)
		return this.__super__.prototype.getBetAmount.call(this, balance, tournament, debug);
	return this.__super__.prototype.flatBet.call(this, balance, tournament, debug);
};

var Observer = function() {
	Strategy.call(this, "obs");
	this.abstain = true;
};
Observer.prototype = Object.create(Strategy.prototype);
Observer.prototype.execute = function(info) {
	if (this.debug)
		console.log("- Monk does not bet");
	this.abstain = true;
	return null;
};
