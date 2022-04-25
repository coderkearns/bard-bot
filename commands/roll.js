const { roll } = require("../dnd/dice")

module.exports = function () {
    return {
        name: "roll",
        aliases: ["dice", "r", "d"],
        description: "Roll dice using dice notation (ex `d6` or `2d6+1` or `10d8-5`)",
        usage: "<dice expression>",
        shortDescription: "Roll dice using dice notation",
        execute(e) {
            try {
                const { sum, rolls, modifier, multiplier } = roll(e.args.join(" "))
                let mod = modifier > 0 ? ` (+ ${modifier})` : modifier < 0 ? ` (- ${Math.abs(modifier)})` : ""

                if (multiplier !== 1) {
                    e.send(`(${rolls.join(' + ')}${mod}) * ${multiplier} = ${sum}`)
                } else {
                    e.send(`${rolls.join(' + ')}${mod} = ${sum}`)
                }

            } catch (err) {
                e.send(`Uh oh @${e.author.username}, ${err.message}`)
            }
        },
    }
}
