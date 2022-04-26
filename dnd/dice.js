function parseDiceNotation(notation) {
    // d6 -> { dice: 1, sides: 6, modifier: 0 }
    // 1d6 -> { dice: 1, sides: 6, modifier: 0 }
    // 1d6+1 -> { dice: 1, sides: 6, modifier: 1 }
    // 2d6 -> { dice: 2, sides: 6, modifier: 0 }
    // 2d8-5 -> { dice: 2, sides: 8, modifier: -5 }
    // 4d6*100 -> { dice: 4, sides: 6, modifier: 0, multiplier: 100 }
    const regex = /^(\d*)d(\d+)([+-]\d+)?(\*\d+)?$/;
    const match = regex.exec(notation.replace(/\s/g, ""));
    if (!match) {
        throw new Error(`Invalid dice notation: ${notation}`);
    }

    const dice = parseInt(match[1] || 1);
    const sides = parseInt(match[2]);
    const modifier = parseInt(match[3] || 0);
    const multiplier = parseInt((match[4] || "1").replace("*", ""));

    return { dice, sides, modifier, multiplier };
}

function rollDice({ dice = 1, sides, modifier = 0, multiplier = 1 }) {
    const rolls = [];
    for (let i = 0; i < dice; i++) {
        rolls.push(Math.floor(Math.random() * sides) + 1);
    }
    const total = rolls.reduce((a, b) => a + b, 0);
    const sum = (total + modifier) * multiplier;
    return { rolls, sum, modifier, multiplier };
}

function roll(notation) {
    return rollDice(parseDiceNotation(notation));
}

module.exports = {
    roll,
    rollDice,
    parseDiceNotation
}
