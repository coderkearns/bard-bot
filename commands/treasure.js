const { roll } = require("../dnd/dice")
const { colors } = require("../config")

// Loot tables:
// https://dungeonmastertools.github.io/treasure.html

// Magic item tables:
// https://dungeonmastertools.github.io/

function isHoard(str = "") {
    if (["yes", "true", "1", "hoard"].includes(str.toLowerCase()) || str.toLowerCase()[0] === "y") return true
    return false
}


module.exports = function () {
    return {
        name: "treasure",
        aliases: ["loot"],
        description: "Randomly generate how much treasure you'll find from a monster's CR. Hoards can also contain magic items and treasure, unlike individual loot. Remember that magic items are suggestions, feel free to replace them with others of the same or even different rarities.",
        usage: "<monster CR> [is hoard (yes/no)]",
        shortDescription: "Randomly generate treasure.",
        async execute(e) {
            // Make sure the user entered a number between 0 and 30 (make sure to allow 1/4 and 1/2)
            let cr = e.args[0]
            if (cr === "1/2") cr = 0.25
            if (cr === "1/4") cr = 0.125
            if (typeof cr == "string") {
                cr = parseFloat(cr)
            }

            if (isNaN(cr) || cr < 0 || cr > 30) {
                e.send("Please enter a CR between 0 and 30.")
                return
            }

            const isHoardLoot = isHoard(e.args[1])

            if (isHoardLoot) {
                await generateTreasureHoard(e, cr)
            } else {
                await generateTreasureIndividual(e, cr)
            }
        },
    }
}

const individualTreasureTables = [
    {
        // CR 0-4
        "0-30": { cp: "5d6" },
        "31-60": { sp: "4d6" },
        "61-70": { ep: "3d6" },
        "71-95": { gp: "3d6" },
        "96-100": { pp: "1d6" },
    },
    {
        // CR 5-10
        "0-30": { cp: "4d6*100", ep: "1d6*10" },
        "31-60": { sp: "6d6*10", gp: "2d6*10" },
        "61-70": { ep: "1d6*100", gp: "2d6*10" },
        "71-95": { gp: "4d6*10" },
        "96-100": { gp: "2d6*10", pp: "3d6" },
    },
    {
        // CR 11-16
        "0-30": { cp: "4d6*100", gp: "1d6*10" },
        "21-35": { ep: "1d6*100", gp: "1d6*100" },
        "36-75": { gp: "2d6*100", pp: "1d6*10" },
        "76-100": { gp: "2d6*100", pp: "2d6*10" },
    },
    {
        // CR 17+
        "0-15": { ep: "2d6*1000", gp: "8d6*100" },
        "16-55": { gp: "1d6*1000", pp: "1d6*100" },
        "56-100": { gp: "1d6*1000", pp: "2d6*100" },
    }
]

function getCr(crTableSet) {
    const roll = Math.floor(Math.random() * 100) + 1
    for ([rollNum, table] of Object.entries(crTableSet)) {
        let [min, max] = rollNum.split("-")
        min = parseInt(min)
        max = parseInt(max)
        if (roll >= min && roll <= max) {
            return table
        }
    }
    throw new Error("Couldn't find a CR table for the roll.")
}

function rollForTable(table) {
    const amounts = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }
    for (let [key, value] of Object.entries(table)) {
        amounts[key] = roll(value).sum
    }
    return amounts
}

function displayTreasure(e, amounts) {
    let amountRets = Object.keys(amounts).filter(key => amounts[key] > 0).map(key => amounts[key] > 0 ? `**${amounts[key]}** ${key}` : '')
    const embed = {
        title: "You found some treasure!",
        description: `You found ${amountRets.join(', ')}!`,
        color: colors.treasure,
    }
    e.send({ embed })
}

async function generateTreasureIndividual(e, cr) {
    // 4 sections: 0-4, 5-10, 11-16, 17+
    let table = {}
    if (cr <= 4) table = getCr(individualTreasureTables[0])
    else if (cr <= 10) table = getCr(individualTreasureTables[1])
    else if (cr <= 16) table = getCr(individualTreasureTables[2])
    else table = getCr(individualTreasureTables[3])

    const amounts = rollForTable(table)
    displayTreasure(e, amounts)
}

function displayHoard(e, [coins, items]) {
    let amountRets = Object.keys(coins).filter(key => coins[key] > 0).map(key => coins[key] > 0 ? `**${coins[key]}** ${key}` : '').join(', ')
    const embed = {
        title: `You found a hoard!`,
        description: `For coins, you found ${amountRets}!\n\nFor treasure, you found ${items}!`,
        color: colors.treasure,
    }
    e.send({ embed })
}

async function generateTreasureHoard(e, cr) {
    // 4 sections: 0-4, 5-10, 11-16, 17+
    let roll = Math.floor(Math.random() * 100) + 1

    let hoard = []
    if (cr <= 4) hoard = generateHoardSmall(roll)
    else if (cr <= 10) hoard = generateHoardMedium(roll)
    else if (cr <= 16) hoard = generateHoardLarge(roll)
    else hoard = generateHoardHuge(roll)

    displayHoard(e, hoard)
}

function repeat(times, fn) {
    if (times == 0) return ''
    if (times == 1) return fn()
    return new Array(times).fill(null).map(fn).join(', ')
}

function generateHoardSmall(d100roll) {
    // 6d6*100 cp, 3d6*100 sp,2d6*10 gp
    const coins = rollForTable({ cp: "6d6*100", sp: "3d6*100", gp: "2d6*10" })
    // 1-6, 7-16, 16-26, 27-36, 37-44, 45-52, 53-60, 61-65, 66-70, 71-75, 76-78, 79-80, 81-85, 86-92, 93-97, 98-99, 100
    if (d100roll <= 7) return [coins, `nothing`]
    if (d100roll <= 16) return [coins, `${roll('2d6').sum} 10gp gems`]
    if (d100roll <= 26) return [coins, `${roll('2d4').sum} 25gp art objects`]
    if (d100roll <= 36) return [coins, `${roll('2d6').sum} 50gp gems`]
    if (d100roll <= 44) return [coins, `${roll('2d6').sum} 10gp gems and ${repeat(roll('1d6').sum, magicItemTableA)}`]
    if (d100roll <= 52) return [coins, `${roll('2d4').sum} 25gp art objects and ${repeat(roll('1d6').sum, magicItemTableA)}`]
    if (d100roll <= 60) return [coins, `${roll('2d6').sum} 50gp gems and ${repeat(roll('1d6').sum, magicItemTableA)}`]
    if (d100roll <= 65) return [coins, `${roll('2d6').sum} 10gp gems and ${repeat(roll('1d4').sum, magicItemTableB)}`]
    if (d100roll <= 70) return [coins, `${roll('2d4').sum} 25gp art objects and ${repeat(roll('1d4').sum, magicItemTableB)}`]
    if (d100roll <= 75) return [coins, `${roll('2d6').sum} 50gp gems and ${repeat(roll('1d4').sum, magicItemTableB)}`]
    if (d100roll <= 78) return [coins, `${roll('2d6').sum} 10gp gems and ${repeat(roll('1d4').sum, magicItemTableC)}`]
    if (d100roll <= 80) return [coins, `${roll('2d4').sum} 25gp art objects and ${repeat(roll('1d4').sum, magicItemTableC)}`]
    if (d100roll <= 85) return [coins, `${roll('2d6').sum} 50gp gems and ${repeat(roll('1d4').sum, magicItemTableC)}`]
    if (d100roll <= 92) return [coins, `${roll('2d4').sum} 25gp art objects and ${repeat(roll('1d4').sum, magicItemTableF)}`]
    if (d100roll <= 97) return [coins, `${roll('2d6').sum} 50gp gems and ${repeat(roll('1d4').sum, magicItemTableF)}`]
    if (d100roll <= 99) return [coins, `${roll('2d4').sum} 25gp art objects and ${magicItemTableG()}`]
    return [coins, `${roll('2d6').sum} 50gp gems and ${magicItemTableG()}`]
}

function generateHoardMedium(d100roll) {
    // 2d6*100 cp, 2d6*1000 sp, 6d6*100 gp, 3d6*10 pp
    const coins = rollForTable({ cp: "2d6*100", sp: "2d6*1000", gp: "6d6*100", pp: "3d6*10" })
    // 1-4, 5-10, 11-16, 17-22, 23-28, 29-32, 33-36, 37-40, 41-44, 45-49, 50-54, 55-59, 60-63, 64-66, 67-69, 70-72, 73-74, 75-76, 77-78, 79, 80, 81-84, 85-88, 89-91, 92-94, 95-96, 97-98, 99, 100
    if (d100roll <= 4) return [coins, `nothing`]
    if (d100roll <= 10) return [coins, `${roll('2d4').sum} 25gp art objects`]
    if (d100roll <= 16) return [coins, `${roll('3d6').sum} 50gp gems`]
    if (d100roll <= 22) return [coins, `${roll('3d6').sum} 100gp gems`]
    if (d100roll <= 28) return [coins, `${roll('2d4').sum} 25gp art objects`]
    if (d100roll <= 32) return [coins, `${roll('2d4').sum} 25gp art objects and ${repeat(roll('1d6').sum, magicItemTableA)}`]
    if (d100roll <= 36) return [coins, `${roll('3d6').sum} 50gp gems and ${repeat(roll('1d6').sum, magicItemTableA)}`]
    if (d100roll <= 40) return [coins, `${roll('3d6').sum} 100gp gems and ${repeat(roll('1d6').sum, magicItemTableA)}`]
    if (d100roll <= 44) return [coins, `${roll('2d4').sum} 25gp art objects and ${repeat(roll('1d6').sum, magicItemTableA)}`]
    if (d100roll <= 49) return [coins, `${roll('2d4').sum} 25gp art objects and ${repeat(roll('1d4').sum, magicItemTableB)}`]
    if (d100roll <= 54) return [coins, `${roll('3d6').sum} 50gp gems and ${repeat(roll('1d4').sum, magicItemTableB)}`]
    if (d100roll <= 59) return [coins, `${roll('3d6').sum} 100gp gems and ${repeat(roll('1d4').sum, magicItemTableB)}`]
    if (d100roll <= 63) return [coins, `${roll('2d4').sum} 25gp art objects and ${repeat(roll('1d4').sum, magicItemTableB)}`]
    if (d100roll <= 66) return [coins, `${roll('2d4').sum} 25gp art objects and ${repeat(roll('1d4').sum, magicItemTableC)}`]
    if (d100roll <= 69) return [coins, `${roll('3d6').sum} 50gp gems and ${repeat(roll('1d4').sum, magicItemTableC)}`]
    if (d100roll <= 72) return [coins, `${roll('3d6').sum} 100gp gems and ${repeat(roll('1d4').sum, magicItemTableC)}`]
    if (d100roll <= 74) return [coins, `${roll('2d4').sum} 25gp art objects and ${repeat(roll('1d4').sum, magicItemTableC)}`]
    if (d100roll <= 76) return [coins, `${roll('2d4').sum} 25gp art objects and ${magicItemTableD()}`]
    if (d100roll <= 78) return [coins, `${roll('3d6').sum} 50gp gems and ${magicItemTableD()}`]
    if (d100roll <= 80) return [coins, `${roll('2d4').sum} 250gp art objects and ${magicItemTableD()}`]
    if (d100roll <= 84) return [coins, `${roll('2d4').sum} 25gp art objects and ${repeat(roll('1d4').sum, magicItemTableF)}`]
    if (d100roll <= 88) return [coins, `${roll('3d6').sum} 50gp gems and ${repeat(roll('1d4').sum, magicItemTableF)}`]
    if (d100roll <= 91) return [coins, `${roll('3d6').sum} 100gp gems and ${repeat(roll('1d4').sum, magicItemTableF)}`]
    if (d100roll <= 94) return [coins, `${roll('2d4').sum} 250gp art objects and ${repeat(roll('1d4').sum, magicItemTableF)}`]
    if (d100roll <= 96) return [coins, `${roll('3d6').sum} 50gp gems and ${repeat(roll('1d4').sum, magicItemTableG)}`]
    if (d100roll <= 98) return [coins, `${roll('2d4').sum} 250gp art objects and ${repeat(roll('1d6').sum, magicItemTableG)}`]
    if (d100roll <= 99) return [coins, `${roll('3d6').sum} 100gp gems and ${magicItemTableH()}`]
    return [coins, `${roll('2d4').sum} 250gp art objects and ${magicItemTableH()}`]
}

function generateHoardLarge(d100roll) {
    // 4d6*1000 gp, 5d6*100 pp
    const coins = rollForTable({ gp: "4d6*1000", pp: "5d6*100" })
    // 1-3, 4-6, 7-10, 11-12, 13-15, 16-19, 20-23, 24-26, 27-29, 30-35, 36-40, 41-45, 46-50, 51-54, 59-62, 53-66, 67-68, 69-70, 71-72, 73-74, 75-76, 77-78, 79-80, 81-82, 83-85, 86-88, 89-90, 91-92, 93-94, 95-96, 97-98, 99-100
    if (d100roll <= 3) return [coins, `nothing`]
    if (d100roll <= 6) return [coins, `${roll('2d4').sum} 250gp art objects`]
    if (d100roll <= 10) return [coins, `${roll('2d4').sum} 750gp art objects`]
    if (d100roll <= 12) return [coins, `${roll('3d6').sum} 500gp gems`]
    if (d100roll <= 15) return [coins, `${roll('3d6').sum} 1000gp gems`]
    if (d100roll <= 19) return [coins, `${roll('2d4').sum} 250gp art objects and ${repeat(roll('1d4').sum, magicItemTableA)}, ${repeat(roll('1d6').sum, magicItemTableB)}`]
    if (d100roll <= 23) return [coins, `${roll('2d4').sum} 750gp art objects and ${repeat(roll('1d4').sum, magicItemTableA)}, ${repeat(roll('1d6').sum, magicItemTableB)}`]
    if (d100roll <= 26) return [coins, `${roll('3d6').sum} 500gp gems and ${repeat(roll('1d4').sum, magicItemTableA)}, ${repeat(roll('1d6').sum, magicItemTableB)}`]
    if (d100roll <= 29) return [coins, `${roll('3d6').sum} 1000gp gems and ${repeat(roll('1d4').sum, magicItemTableA)}, ${repeat(roll('1d6').sum, magicItemTableB)}`]
    if (d100roll <= 35) return [coins, `${roll('2d4').sum} 250gp art objects and ${repeat(roll('1d6').sum, magicItemTableC)}`]
    if (d100roll <= 40) return [coins, `${roll('2d4').sum} 750gp art objects and ${repeat(roll('1d6').sum, magicItemTableC)}`]
    if (d100roll <= 45) return [coins, `${roll('3d6').sum} 500gp gems and ${repeat(roll('1d6').sum, magicItemTableC)}`]
    if (d100roll <= 50) return [coins, `${roll('3d6').sum} 1000gp gems and ${repeat(roll('1d6').sum, magicItemTableC)}`]
    if (d100roll <= 54) return [coins, `${roll('2d4').sum} 250gp art objects and ${repeat(roll('1d4').sum, magicItemTableD)}`]
    if (d100roll <= 59) return [coins, `${roll('2d4').sum} 750gp art objects and ${repeat(roll('1d4').sum, magicItemTableD)}`]
    if (d100roll <= 62) return [coins, `${roll('3d6').sum} 500gp gems and ${repeat(roll('1d4').sum, magicItemTableD)}`]
    if (d100roll <= 66) return [coins, `${roll('3d6').sum} 1000gp gems and ${repeat(roll('1d4').sum, magicItemTableD)}`]
    if (d100roll <= 68) return [coins, `${roll('2d4').sum} 250gp art objects and ${magicItemTableE()}`]
    if (d100roll <= 70) return [coins, `${roll('2d4').sum} 750gp art objects and ${magicItemTableE()}`]
    if (d100roll <= 72) return [coins, `${roll('3d6').sum} 500gp gems and ${magicItemTableE()}`]
    if (d100roll <= 74) return [coins, `${roll('3d6').sum} 1000gp gems and ${magicItemTableE()}`]
    if (d100roll <= 76) return [coins, `${roll('2d4').sum} 250gp art objects and ${magicItemTableF()}, ${repeat(roll('1d4').sum, magicItemTableG)}`]
    if (d100roll <= 78) return [coins, `${roll('2d4').sum} 750gp art objects and ${magicItemTableF()}, ${repeat(roll('1d4').sum, magicItemTableG)}`]
    if (d100roll <= 80) return [coins, `${roll('3d6').sum} 500gp gems and ${magicItemTableF()}, ${repeat(roll('1d4').sum, magicItemTableG)}`]
    if (d100roll <= 82) return [coins, `${roll('3d6').sum} 1000gp gems and ${magicItemTableF()}, ${repeat(roll('1d4').sum, magicItemTableG)}`]
    if (d100roll <= 85) return [coins, `${roll('2d4').sum} 250gp art objects and ${repeat(roll('1d4').sum, magicItemTableH)}`]
    if (d100roll <= 88) return [coins, `${roll('2d4').sum} 750gp art objects and ${repeat(roll('1d4').sum, magicItemTableH)}`]
    if (d100roll <= 90) return [coins, `${roll('3d6').sum} 500gp gems and ${repeat(roll('1d4').sum, magicItemTableH)}`]
    if (d100roll <= 92) return [coins, `${roll('3d6').sum} 1000gp gems and ${repeat(roll('1d4').sum, magicItemTableH)}`]
    if (d100roll <= 94) return [coins, `${roll('2d4').sum} 250gp art objects and ${magicItemTableI()}`]
    if (d100roll <= 96) return [coins, `${roll('2d4').sum} 750gp art objects and ${magicItemTableI()}`]
    if (d100roll <= 98) return [coins, `${roll('3d6').sum} 500gp gems and ${magicItemTableI()}`]
    if (d100roll <= 100) return [coins, `${roll('3d6').sum} 1000gp gems and ${magicItemTableI()}`]
}

function generateHoardHuge(d100roll) {
    // 12d6*1000 gp, 8d6*1000 pp
    const coins = rollForTable({ gp: "12d6*1000", pp: "8d6*1000" })
    // 1-2, 3-5, 6-8, 9-11, 12-14, 15-22, 23-30,31-38, 39-46, 47-52, 53-58, 59-63, 64-68, 69, 70, 71, 72, 73-74, 75-76, 77-78, 79-80, 81-85, 86-90, 91-95, 96-100
    if (d100roll <= 2) return [coins, `nothing`]
    if (d100roll <= 5) return [coins, `${roll('3d6').sum} 1000gp gems and ${repeat(roll('1d8').sum, magicItemTableC)}`]
    if (d100roll <= 8) return [coins, `${roll('1d10').sum} 2500gp art objects and ${repeat(roll('1d8').sum, magicItemTableC)}`]
    if (d100roll <= 11) return [coins, `${roll('1d4').sum} 7500gp art objects and ${repeat(roll('1d8').sum, magicItemTableC)}`]
    if (d100roll <= 14) return [coins, `${roll('1d8').sum} 5000gp gems and ${repeat(roll('1d8').sum, magicItemTableC)}`]
    if (d100roll <= 22) return [coins, `${roll('3d6').sum} 1000gp gems and ${repeat(roll('1d6').sum, magicItemTableD)}`]
    if (d100roll <= 30) return [coins, `${roll('1d10').sum} 2500gp art objects and ${repeat(roll('1d6').sum, magicItemTableD)}`]
    if (d100roll <= 38) return [coins, `${roll('1d4').sum} 7500gp art objects and ${repeat(roll('1d6').sum, magicItemTableD)}`]
    if (d100roll <= 46) return [coins, `${roll('1d8').sum} 5000gp gems and ${repeat(roll('1d6').sum, magicItemTableD)}`]
    if (d100roll <= 52) return [coins, `${roll('3d6').sum} 1000gp gems and ${repeat(roll('1d6').sum, magicItemTableE)}`]
    if (d100roll <= 58) return [coins, `${roll('1d10').sum} 2500gp art objects and ${repeat(roll('1d6').sum, magicItemTableE)}`]
    if (d100roll <= 63) return [coins, `${roll('1d4').sum} 7500gp art objects and ${repeat(roll('1d6').sum, magicItemTableE)}`]
    if (d100roll <= 68) return [coins, `${roll('1d8').sum} 5000gp gems and ${repeat(roll('1d6').sum, magicItemTableE)}`]
    if (d100roll === 69) return [coins, `${roll('3d6').sum} 1000gp gems and ${repeat(roll('1d4').sum, magicItemTableG)}`]
    if (d100roll === 70) return [coins, `${roll('1d10').sum} 2500gp art objects and ${repeat(roll('1d4').sum, magicItemTableG)}`]
    if (d100roll === 71) return [coins, `${roll('1d4').sum} 7500gp art objects and ${repeat(roll('1d4').sum, magicItemTableG)}`]
    if (d100roll === 72) return [coins, `${roll('1d8').sum} 5000gp gems and ${repeat(roll('1d4').sum, magicItemTableG)}`]
    if (d100roll <= 74) return [coins, `${roll('3d6').sum} 1000gp gems and ${repeat(roll('1d4').sum, magicItemTableH)}`]
    if (d100roll <= 76) return [coins, `${roll('1d10').sum} 2500gp art objects and ${repeat(roll('1d4').sum, magicItemTableH)}`]
    if (d100roll <= 78) return [coins, `${roll('1d4').sum} 7500gp art objects and ${repeat(roll('1d4').sum, magicItemTableH)}`]
    if (d100roll <= 80) return [coins, `${roll('1d8').sum} 5000gp gems and ${repeat(roll('1d4').sum, magicItemTableH)}`]
    if (d100roll <= 85) return [coins, `${roll('3d6').sum} 1000gp gems and ${repeat(roll('1d4').sum, magicItemTableI)}`]
    if (d100roll <= 90) return [coins, `${roll('1d10').sum} 2500gp art objects and ${repeat(roll('1d4').sum, magicItemTableI)}`]
    if (d100roll <= 95) return [coins, `${roll('1d4').sum} 7500gp art objects and ${magicItemTableF}, ${repeat(roll('1d4').sum, magicItemTableG)}`]
    if (d100roll <= 100) return [coins, `${roll('1d8').sum} 5000gp gems and ${repeat(roll('1d4').sum, magicItemTableI)}`]
}

function magicItemTableA() {
    const d100roll = Math.floor(Math.random() * 100) + 1
    /*
    01–50	Potion of healing
    51–60	Spell scroll (cantrip)
    61–70	Potion of climbing
    71–90	Spell scroll (1st level)
    91–94	Spell scroll (2nd level)
    95–98	Potion of greater healing
    99	Bag of holding
    100	Driftglobe
    */
    if (d100roll <= 50) return `a potion of healing`
    if (d100roll <= 60) return `a 0th level (cantrip) spell scroll`
    if (d100roll <= 70) return `a potion of climbing`
    if (d100roll <= 90) return `a 1st level spell scroll`
    if (d100roll <= 94) return `a 2nd level spell scroll`
    if (d100roll <= 98) return `a potion of greater healing`
    if (d100roll === 99) return `a bag of holding`
    if (d100roll === 100) return `a driftglobe`
}

function magicItemTableB() {
    const d100roll = Math.floor(Math.random() * 100) + 1
    /*
    01–15	Potion of greater healing
    16–22	Potion of fire breath
    23–29	Potion of resistance
    30–34	Ammunition, +1
    35–39	Potion of animal friendship
    40–44	Potion of hill giant strength
    45–49	Potion of growth
    50–54	Potion of water breathing
    55–59	Spell scroll (2nd level)
    60–64	Spell scroll (3rd level)
    65–67	Bag of holding
    68–70	Keoghtom's ointment
    71–73	Oil of slipperiness
    74–75	Dust of disappearance
    76–77	Dust of dryness
    78–79	Dust of sneezing and choking
    80–81	Elemental gem
    82–83	Philter of love
    84	Alchemy jug
    85	Cap of water breathing
    86	Cloak of the manta ray
    87	Driftglobe
    88	Goggles of night
    89	Helm of comprehending languages
    90	Immovable rod
    91	Lantern of revealing
    92	Mariner's armor
    93	Mithral armor
    94	Potion of poison
    95	Ring of swimming
    96	Robe of useful items
    97	Rope of climbing
    98	Saddle of the cavalier
    99	Wand of magic detection
    100	Wand of secrets
    */
    if (d100roll <= 15) return `a potion of greater healing`
    if (d100roll <= 22) return `a potion of fire breath`
    if (d100roll <= 29) return `a potion of resistance`
    if (d100roll <= 34) return `an ammunition with +1`
    if (d100roll <= 39) return `a potion of animal friendship`
    if (d100roll <= 44) return `a potion of hill giant strength`
    if (d100roll <= 49) return `a potion of growth`
    if (d100roll <= 54) return `a potion of water breathing`
    if (d100roll <= 59) return `a 2nd level spell scroll`
    if (d100roll <= 64) return `a 3rd level spell scroll`
    if (d100roll <= 67) return `a bag of holding`
    if (d100roll <= 70) return `a keoghtom's ointment`
    if (d100roll <= 73) return `an oil of slipperiness`
    if (d100roll <= 75) return `a dust of disappearance`
    if (d100roll <= 77) return `a dust of dryness`
    if (d100roll <= 79) return `a dust of sneezing and choking`
    if (d100roll <= 81) return `an elemental gem`
    if (d100roll <= 83) return `a philter of love`
    if (d100roll === 84) return `an alchemy jug`
    if (d100roll === 85) return `a cap of water breathing`
    if (d100roll === 86) return `a cloak of the manta ray`
    if (d100roll === 87) return `a driftglobe`
    if (d100roll === 88) return `goggles of night`
    if (d100roll === 89) return `a helm of comprehending languages`
    if (d100roll === 90) return `an immovable rod`
    if (d100roll === 91) return `a lantern of revealing`
    if (d100roll === 92) return `a mariner's armor`
    if (d100roll === 93) return `mithral armor`
    if (d100roll <= 94) return `a potion of poison`
    if (d100roll <= 95) return `a ring of swimming`
    if (d100roll <= 96) return `a robe of useful items`
    if (d100roll <= 97) return `a rope of climbing`
    if (d100roll <= 98) return `a saddle of the cavalier`
    if (d100roll === 99) return `a wand of magic detection`
    if (d100roll === 100) return `a wand of secrets`
}

function magicItemTableC() {
    const d100roll = Math.floor(Math.random() * 100) + 1
    /*
    01–15	Potion of superior healing
    16–22	Spell scroll (4thlevel)
    23–27	Ammunition, +2
    28–32	Potion of clairvoyance
    33–37	Potion of diminution
    38–42	Potion of gaseous form
    43–47	Potion of frost giant strength
    48–52	Potion of stone giant strength
    53–57	Potion of heroism
    58–62	Potion of invulnerability
    63–67	Potion of mind reading
    68–72	Spell scroll (5thlevel)
    73–75	Elixir of health
    76–78	Oil of etherealness
    79–81	Potion of fire giant strength
    82–84	Quaal's feather token
    85–87	Scroll of protection
    88–89	Bag of beans
    90-91	Bead of force
    92	Chime of opening
    93	Decanter of endless water
    94	Eyes of minute seeing
    95	Folding boat
    96	Heward's handy haversack
    97	Horseshoes of speed
    98	Necklace of fireballs
    99	Periapt of health
    100	Sending Stones
    */
    if (d100roll <= 15) return `a potion of superior healing`
    if (d100roll <= 22) return `a 4th level spell scroll`
    if (d100roll <= 27) return `an ammunition with +2`
    if (d100roll <= 32) return `a potion of clairvoyance`
    if (d100roll <= 37) return `a potion of diminution`
    if (d100roll <= 42) return `a potion of gaseous form`
    if (d100roll <= 47) return `a potion of frost giant strength`
    if (d100roll <= 52) return `a potion of stone giant strength`
    if (d100roll <= 57) return `a potion of heroism`
    if (d100roll <= 62) return `a potion of invulnerability`
    if (d100roll <= 67) return `a potion of mind reading`
    if (d100roll <= 72) return `a 5th level spell scroll`
    if (d100roll <= 75) return `an elixir of health`
    if (d100roll <= 78) return `an oil of etherealness`
    if (d100roll <= 81) return `a potion of fire giant strength`
    if (d100roll <= 84) return `a quaal's feather token`
    if (d100roll <= 87) return `a scroll of protection`
    if (d100roll <= 89) return `a bag of beans`
    if (d100roll <= 91) return `a bead of force`
    if (d100roll === 92) return `a chime of opening`
    if (d100roll === 93) return `a decanter of endless water`
    if (d100roll === 94) return `eyes of minute seeing`
    if (d100roll === 95) return `a folding boat`
    if (d100roll === 96) return `a heward's handy haversack`
    if (d100roll === 97) return `horseshoes of speed`
    if (d100roll === 98) return `a necklace of fireballs`
    if (d100roll === 99) return `a periapt of health`
    if (d100roll === 100) return `sending stones`
}

function magicItemTableD() {
    const d100roll = Math.floor(Math.random() * 100) + 1
    /*
    01–20	Potion of supreme healing
    21–30	Potion of invisibility
    31–40	Potion of speed
    41–50	Spell scroll (6thlevel)
    51–57	Spell scroll (7thlevel)
    58–62	Ammunition, +3
    63–67	Oil of sharpness
    68–72	Potion of flying
    73–77	Potion of cloud giant strength
    78–82	Potion of longevity
    83–87	Potion of vitality
    88–92	Spell scroll (8thlevel)
    93–95	Horseshoes of a zephyr
    96–98	Nolzur's marvelous pigments
    99	Bag of devouring
    100	Portable hole
    */
    if (d100roll <= 20) return `a potion of supreme healing`
    if (d100roll <= 30) return `a potion of invisibility`
    if (d100roll <= 40) return `a potion of speed`
    if (d100roll <= 50) return `a 6th level spell scroll`
    if (d100roll <= 57) return `a 7th level spell scroll`
    if (d100roll <= 62) return `an ammunition with +3`
    if (d100roll <= 67) return `an oil of sharpness`
    if (d100roll <= 72) return `a potion of flying`
    if (d100roll <= 77) return `a potion of cloud giant strength`
    if (d100roll <= 82) return `a potion of longevity`
    if (d100roll <= 87) return `a potion of vitality`
    if (d100roll <= 92) return `a 8th level spell scroll`
    if (d100roll <= 95) return `horseshoes of a zephyr`
    if (d100roll <= 98) return `nolzur's marvelous pigments`
    if (d100roll === 99) return `a bag of devouring`
    if (d100roll === 100) return `a bag of devouring`
}

function magicItemTableE() {
    const d100roll = Math.floor(Math.random() * 100) + 1
    /*
    01–30	Spell scroll (8thlevel)
    31–55	Potion of storm giant strength
    56–70	Poti on of supreme healing
    71–85	Spell scroll (9st level)
    86–93	Universal solvent
    94–98	Arrow of slaying
    99-100	Sovereign glue
    */
    if (d100roll <= 30) return `a spell scroll (8th level)`
    if (d100roll <= 55) return `a potion of storm giant strength`
    if (d100roll <= 70) return `a potion of superior healing`
    if (d100roll <= 85) return `a 9th level spell scroll`
    if (d100roll <= 93) return `a universal solvent`
    if (d100roll <= 98) return `an arrow of slaying`
    if (d100roll <= 100) return `a sovereign glue`
}

function magicItemTableF() {
    const d100roll = Math.floor(Math.random() * 100) + 1
    /*
    01–15	Weapon, +1
    16–18	Shield,+ 1
    19–21	Sentinel shield
    22–23	Amulet of proof against detection and location
    24–25	Boots of elvenkind
    26–27	Boots of striding and springing
    27–29	Bracers of archery
    30–31	Brooch of shielding
    32–33	Broom of flying
    34–35	Cloak of elvenkind
    36–37	Cloak of protection
    38–39	Gauntlets of ogre power
    40–41	Hat of disguise
    42–43	Javelin of lightning
    44–45	Pearl of power
    46–47	Rod of the pact keeper, + 1
    48–49	Slippers of spider climbing
    50–51	Staff of the adder
    52-53	Staff of the python
    54-55	Sword of vengeance
    56–57	Trident of fish command
    58–59	Wand of magic missiles
    60–61	Wand of the war mage, + 1
    62–63	Wand of web
    64-65	Weapon of warning
    66	Adamantine armor (chain mail)
    67	Adamantine armor (chain shirt)
    68	Adamantine armor (scale mail)
    69	Bag of tricks (gray)
    70	Bag of tricks (rust)
    71	Bag of tricks (tan)
    72	Boots of the winterlands
    73	Circlet of blasting
    74	Deck of illusions
    75	Eversmoking bottle
    76	Eyes of charming
    77	Eyes of the eagle
    78	Figurine of wondrous power (silver raven)
    79	Gem of brightness
    80	Gloves of missile snaring
    81	Gloves of swimming and climbing
    82	Gloves of thievery
    83	Headband of intellect
    84	Helm of telepathy
    85	Instrument of the bards (Doss lute)
    86	Instrument of the bards (Fochlucan bandore)
    87	Instrument of the bards (Mac-Fuimidh cittern)
    88	Medallion of thoughts
    89	Necklace of adaptation
    90	Periapt of wound closure
    91	Pipes of haunting
    92	Pipes of the sewers
    93	Ring of jumping
    94	Ring of mind shielding
    95	Ring of warmth
    96	Ring of water walking
    97	Quiver of Ehlonna
    98	Stone of good luck
    99	Wind fan
    100	Winged boots
    */
    if (d100roll <= 15) return `a weapon with +1`
    if (d100roll <= 18) return `a shield with +1`
    if (d100roll <= 21) return `a sentinel shield`
    if (d100roll <= 23) return `an amulet of proof against detection and location`
    if (d100roll <= 25) return `boots of elvenkind`
    if (d100roll <= 27) return `boots of striding and springing`
    if (d100roll <= 29) return `bracers of archery`
    if (d100roll <= 31) return `a brooch of shielding`
    if (d100roll <= 33) return `a broom of flying`
    if (d100roll <= 35) return `a cloak of elvenkind`
    if (d100roll <= 37) return `a cloak of protection`
    if (d100roll <= 39) return `gauntlets of ogre power`
    if (d100roll <= 41) return `a hat of disguise`
    if (d100roll <= 43) return `a javelin of lightning`
    if (d100roll <= 45) return `a pearl of power`
    if (d100roll <= 47) return `a rod of the pact keeper with +1`
    if (d100roll <= 49) return `slippers of spider climbing`
    if (d100roll <= 51) return `a staff of the adder`
    if (d100roll <= 53) return `a staff of the python`
    if (d100roll <= 55) return `a sword of vengeance`
    if (d100roll <= 57) return `a trident of fish command`
    if (d100roll <= 59) return `a wand of magic missiles`
    if (d100roll <= 61) return `a wand of the war mage with +1`
    if (d100roll <= 63) return `a wand of web`
    if (d100roll <= 65) return `a weapon of warning`
    if (d100roll === 66) return `adamantine chain mail`
    if (d100roll === 67) return `adamantine chain shirt`
    if (d100roll === 68) return `adamantine scale mail`
    if (d100roll === 69) return `a bag of tricks - gray`
    if (d100roll === 70) return `a bag of tricks - rust`
    if (d100roll === 71) return `a bag of tricks - tan`
    if (d100roll === 72) return `boots of the winterlands`
    if (d100roll === 73) return `a circlet of blasting`
    if (d100roll === 74) return `a deck of illusions`
    if (d100roll === 75) return `an eversmoking bottle`
    if (d100roll === 76) return `eyes of charming`
    if (d100roll === 77) return `eyes of the eagle`
    if (d100roll === 78) return `a figurine of wondrous power - silver raven`
    if (d100roll === 79) return `a gem of brightness`
    if (d100roll === 80) return `gloves of missile snaring`
    if (d100roll === 81) return `gloves of swimming and climbing`
    if (d100roll === 82) return `gloves of thievery`
    if (d100roll === 83) return `a headband of intellect`
    if (d100roll === 84) return `a helm of telepathy`
    if (d100roll === 85) return `an instrument of the bards - doss lute`
    if (d100roll === 86) return `an instrument of the bards - fochlucan bandore`
    if (d100roll === 87) return `an instrument of the bards - mac-fuimidh cittern`
    if (d100roll === 88) return `a medallion of thoughts`
    if (d100roll === 89) return `a necklace of adaptation`
    if (d100roll === 90) return `a periapt of wound closure`
    if (d100roll === 91) return `pipes of haunting`
    if (d100roll === 92) return `pipes of the sewers`
    if (d100roll === 93) return `a ring of jumping`
    if (d100roll === 94) return `a ring of mind shielding`
    if (d100roll === 95) return `a ring of warmth`
    if (d100roll === 96) return `a ring of water walking`
    if (d100roll === 97) return `a quiver of ehlonna`
    if (d100roll === 98) return `a stone of good luck`
    if (d100roll === 99) return `a wind fan`
    if (d100roll === 100) return `a winged boots`
}

function magicItemTableG() {
    const d100roll = Math.floor(Math.random() * 100) + 1
    /*
    01–11	Weapon, +2
    12–14	Figurine of wondrous power
    15	Adamantine armor (breastplate)
    16	Adamantine armor (splint)
    17	Amulet of health
    18	Armor of vulnerability
    19	Arrow-catching shield
    20	Belt of dwarvenkind
    21	Belt of hill giant strength
    22	Berserker axe
    23	Boots of levitation
    24	Boots of speed
    25	Bowl of commanding water elementals
    26	Bracers of defense
    27	Brazier of commanding fire elementals
    28	Cape of the mountebank
    29	Censer of controlling air elementals
    30	Armor, +1 chain mail
    31	Armor of resistance (chain mail)
    32	Armor of resistance (chain shirt)
    33	Armor,+ 1 chain shirt
    34	Cloak of displacement
    35	Cloak of the bat
    36	Cube of force
    37	Daern's instant fortress
    38	Dagger of venom
    39	Dimensional shackles
    40	Dragon slayer
    41	Elven chain
    42	Flame tongue
    43	Gem of seeing
    44	Giant slayer
    45	Clamoured studded leather
    46	Helm of teleportation
    47	Horn of blasting
    48	Horn of Valhalla (silver or brass)
    49	Instrument of the bards (Canaithmandolin)
    50	Instrument ofthe bards (Cii lyre)
    51	loun stone (awareness)
    52	loun stone (protection)
    53	loun stone (reserve)
    54	loun stone (sustenance)
    55	Iron bands of Bilarro
    56	Armor, + 1 leather
    57	Armor of resistance (leather)
    58	Mace of disruption
    59	Mace of smiting
    60	Mace of terror
    61	Mantle of spell resistance
    62	Necklace of prayer beads
    63	Periapt of proof against poison
    64	Ring of animal influence
    65	Ring of evasion
    66	Ring of feather falling
    67	Ring of free action
    68	Ring of protection
    69	Ring of resistance
    70	Ring of spell storing
    71	Ring of the ram
    72	Ring of X-ray vision
    73	Robe of eyes
    74	Rod of rulership
    75	Rod of the pact keeper, +2
    76	Rope of entanglement
    77	Armor, +1 scale mail
    78	Armor of resistance (scale mail)
    79	Shield, +2
    80	Shield of missile attraction
    81	Staff of charming
    82	Staff of healing
    83	Staff of swarming insects
    84	Staff of the woodlands
    85	Staff of withering
    86	Stone of controlling earthelementals
    87	Sun blade
    88	Sword of life stealing
    89	Sword of wounding
    90	Tentacle rod
    91	Vicious weapon
    92	Wand of binding
    93	Wand of enemy detection
    94	Wand of fear
    95	Wand of fireballs
    96	Wand of lightning bolts
    97	Wand of paralysis
    98	Wand of the war mage, +2
    99	Wand of wonder
    100	Wings of flying
    */
    if (d100roll <= 11) return `a weapon with +2`
    if (d100roll <= 14) return `a figurine of wondrous power`
    if (d100roll === 15) return `an adamantine breastplate`
    if (d100roll === 16) return `an adamantine splint`
    if (d100roll === 17) return `an amulet of health`
    if (d100roll === 18) return `an armor of vulnerability`
    if (d100roll === 19) return `an arrow-catching shield`
    if (d100roll === 20) return `a belt of dwarvenkind`
    if (d100roll === 21) return `a belt of hill giant strength`
    if (d100roll === 22) return `a berserker axe`
    if (d100roll === 23) return `boots of levitation`
    if (d100roll === 24) return `boots of speed`
    if (d100roll === 25) return `a bowl of commanding water elementals`
    if (d100roll === 26) return `bracers of defense`
    if (d100roll === 27) return `a brazier of commanding fire elementals`
    if (d100roll === 28) return `a cape of the mountebank`
    if (d100roll === 29) return `a censer of controlling air elementals`
    if (d100roll === 30) return `a chain mail armor with +1`
    if (d100roll === 31) return `a chain mail armor of resistance`
    if (d100roll === 32) return `a chain shirt armor of resistance`
    if (d100roll === 33) return `a chain shirt with +1`
    if (d100roll === 34) return `a cloak of displacement`
    if (d100roll === 35) return `a cloak of the bat`
    if (d100roll === 36) return `a cube of force`
    if (d100roll === 37) return `Daern's instant fortress`
    if (d100roll === 38) return `a dagger of venom`
    if (d100roll === 39) return `dimensional shackles`
    if (d100roll === 40) return `a dragon slayer`
    if (d100roll === 41) return `an elven chain`
    if (d100roll === 42) return `a flame tongue`
    if (d100roll === 43) return `a gem of seeing`
    if (d100roll === 44) return `a giant slayer`
    if (d100roll === 45) return `clamoured studded leather`
    if (d100roll === 46) return `a helm of teleportation`
    if (d100roll === 47) return `a horn of blasting`
    if (d100roll === 48) return `a horn of valhalla - silver or brass`
    if (d100roll === 49) return `an instrument of the bards - Canaithmandolin`
    if (d100roll === 50) return `an instrument of the bards - Cii lyre`
    if (d100roll === 51) return `a loun stone - awareness`
    if (d100roll === 52) return `a loun stone - protection`
    if (d100roll === 53) return `a loun stone - reserve`
    if (d100roll === 54) return `a loun stone - sustenance`
    if (d100roll === 55) return `iron bands of Bilarro`
    if (d100roll === 56) return `a leather armor with +1`
    if (d100roll === 57) return `a leather armor of resistance`
    if (d100roll === 58) return `a mace of disruption`
    if (d100roll === 59) return `a mace of smiting`
    if (d100roll === 60) return `a mace of terror`
    if (d100roll === 61) return `a mantle of spell resistance`
    if (d100roll === 62) return `a necklace of prayer beads`
    if (d100roll === 63) return `a periapt of proof against poison`
    if (d100roll === 64) return `a ring of animal influence`
    if (d100roll === 65) return `a ring of evasion`
    if (d100roll === 66) return `a ring of feather falling`
    if (d100roll === 67) return `a ring of free action`
    if (d100roll === 68) return `a ring of protection`
    if (d100roll === 69) return `a ring of resistance`
    if (d100roll === 70) return `a ring of spell storing`
    if (d100roll === 71) return `a ring of the ram`
    if (d100roll === 72) return `a ring of X-ray vision`
    if (d100roll === 73) return `a robe of eyes`
    if (d100roll === 74) return `a rod of rulership`
    if (d100roll === 75) return `a rod of the pact keeper with +2`
    if (d100roll === 76) return `a rope of entanglement`
    if (d100roll === 77) return `a scale mail armor with +1`
    if (d100roll === 78) return `a scale mail armor of resistance`
    if (d100roll === 79) return `a shield with +2`
    if (d100roll === 80) return `a shield of missile attraction`
    if (d100roll === 81) return `a staff of charming`
    if (d100roll === 82) return `a staff of healing`
    if (d100roll === 83) return `a staff of swarming insects`
    if (d100roll === 84) return `a staff of the woodlands`
    if (d100roll === 85) return `a staff of withering`
    if (d100roll === 86) return `a stone of controlling earthelements`
    if (d100roll === 87) return `a sun blade`
    if (d100roll === 88) return `a sword of life stealing`
    if (d100roll === 89) return `a sword of wounding`
    if (d100roll === 90) return `a tentacle rod`
    if (d100roll === 91) return `a vicious weapon`
    if (d100roll === 92) return `a wand of binding`
    if (d100roll === 93) return `a wand of enemy detection`
    if (d100roll === 94) return `a wand of fear`
    if (d100roll === 95) return `a wand of fireballs`
    if (d100roll === 96) return `a wand of lightning bolts`
    if (d100roll === 97) return `a wand of paralysis`
    if (d100roll === 98) return `a wand of the war mage with +2`
    if (d100roll === 99) return `a wand of wonder`
    if (d100roll === 100) return `a wand of flying`
}

function magicItemTableH() {
    const d100roll = Math.floor(Math.random() * 100) + 1
    /*
    01–10	Weapon, +3
    11–12	Amulet of the planes
    13–14	Carpet of flying
    15–16	Crystal ball (very rare version)
    17–18	Ring of regeneration
    19–20	Ring of shooting stars
    21–22	Ring of telekinesis
    23–24	Robe of scintillating colors
    25–26	Robe of stars
    27–28	Rod of absorption
    29–30	Rod of alertness
    31–32	Rod of security
    33–34	Rod of the pact keeper, +3
    35–36	Scimitar of speed
    37–38	Shield, +3
    39–40	Staff of fire
    41–42	Staff of frost
    43–44	Staff of power
    45-46	Staff of striking
    47-48	Staff of thunder and lightning
    49–50	Sword of sharpnes
    51–52	Wand of polymorph
    53–54	Wand of the war mage, + 3
    55	Adamantine armor (half plate)
    56	Adamantine armor (plate)
    57	Animated shield
    58	Belt of fire giant strength
    59	Belt of frost (or stone) giant strength
    60	Armor, + 1 breastplate
    61	Armor of resistance (breastplate)
    62	Candle of invocation
    63	Armor, +2 chain mail
    64	Armor, +2 chain shirt
    65	Cloak of arachnida
    66	Dancing sword
    67	Demon armor
    68	Dragon scale mail
    69	Dwarven plate
    70	Dwarven thrower
    71	Efreeti bottle
    72	Figurine of wondrous power (obsidian steed)
    73	Frost brand
    74	Helm of brilliance
    75	Horn ofValhalla (bronze)
    76	Instrument of the bards (Anstruthharp)
    77	loun stone (absorption)
    78	loun stone (agility)
    79	loun stone (fortitude)
    80	loun stone (insight)
    81	loun stone (intellect)
    82	loun stone (leadership)
    83	loun stone (strength)
    84	Armor, +2 leather
    85	Manual of bodily health
    86	Manual of gainful exercise
    87	Manual of golems
    88	Manual of quickness of action
    89	Mirror of life trapping
    90	Nine lives stealer
    91	Oathbow
    92	Armor, +2 scale mail
    93	Spellguard shield
    94	Armor, + 1 splint
    95	Armor of resistance (splint)
    96	Armor, + 1 studded leather
    97	Armor of resistance (studded leather)
    98	Tome of clear thought
    99	Tome of leadership and influence
    100	Tome of understanding
    */
    if (d100roll <= 10) return `a weapon with +3`
    if (d100roll <= 12) return `an amulet of the planes`
    if (d100roll <= 14) return `a carpet of flying`
    if (d100roll <= 16) return `a crystal ball - very rare version`
    if (d100roll <= 18) return `a ring of regeneration`
    if (d100roll <= 20) return `a ring of shooting stars`
    if (d100roll <= 22) return `a ring of telekinesis`
    if (d100roll <= 24) return `a robe of scintillating colors`
    if (d100roll <= 26) return `a robe of stars`
    if (d100roll <= 28) return `a rod of absorption`
    if (d100roll <= 30) return `a rod of alertness`
    if (d100roll <= 32) return `a rod of security`
    if (d100roll <= 34) return `a rod of the pact keeper with +3`
    if (d100roll <= 36) return `a scimitar of speed`
    if (d100roll <= 38) return `a shield with +3`
    if (d100roll <= 40) return `a staff of fire`
    if (d100roll <= 42) return `a staff of frost`
    if (d100roll <= 44) return `a staff of power`
    if (d100roll <= 46) return `a staff of striking`
    if (d100roll <= 48) return `a staff of thunder and lightning`
    if (d100roll <= 50) return `a sword of sharpness`
    if (d100roll <= 52) return `a wand of polymorph`
    if (d100roll <= 54) return `a wand of the war mage with +3`
    if (d100roll <= 55) return `adamantine half plate armor`
    if (d100roll <= 56) return `adamantine plate armor`
    if (d100roll <= 57) return `an animated shield`
    if (d100roll <= 58) return `a belt of fire giant strength`
    if (d100roll <= 59) return `a belt of frost (or stone) giant strength`
    if (d100roll <= 60) return `breastplate armor with +1`
    if (d100roll <= 61) return `breastplate armor of resistance`
    if (d100roll <= 62) return `a candle of invocation`
    if (d100roll <= 63) return `chain mail armor with +2`
    if (d100roll <= 64) return `chain shirt armor with +2`
    if (d100roll <= 65) return `a cloak of arachnida`
    if (d100roll <= 66) return `a dancing sword`
    if (d100roll <= 67) return `demon armor`
    if (d100roll <= 68) return `dragon scale mail`
    if (d100roll <= 69) return `dwarven plate`
    if (d100roll <= 70) return `dwarven thrower`
    if (d100roll <= 71) return `an efreeti bottle`
    if (d100roll <= 72) return `a figurine of wondrous power`
    if (d100roll <= 73) return `a frost brand`
    if (d100roll <= 74) return `a helm of brilliance`
    if (d100roll <= 75) return `a horn of valhalla`
    if (d100roll <= 76) return `an instrument of the bards - anstruthharp`
    if (d100roll <= 77) return `an absorption loun stone`
    if (d100roll <= 78) return `an agility loun stone`
    if (d100roll <= 79) return `a fortitude loun stone`
    if (d100roll <= 80) return `an insight loun stone`
    if (d100roll <= 81) return `an intellect loun stone`
    if (d100roll <= 82) return `a leadership loun stone`
    if (d100roll <= 83) return `a strength loun stone`
    if (d100roll <= 84) return `leather armor with +2`
    if (d100roll <= 85) return `a manual of bodily health`
    if (d100roll <= 86) return `a manual of gainful exercise`
    if (d100roll <= 87) return `a manual of golems`
    if (d100roll <= 88) return `a manual of quickness of action`
    if (d100roll <= 89) return `a mirror of life trapping`
    if (d100roll <= 90) return `a nine lives stealer`
    if (d100roll <= 91) return `an oathbow`
    if (d100roll <= 92) return `scale mail armor with +2`
    if (d100roll <= 93) return `a spellguard shield`
    if (d100roll <= 94) return `splint armor with +1`
    if (d100roll <= 95) return `a splint armor of resistance`
    if (d100roll <= 96) return `studded leather armor with +1`
    if (d100roll <= 97) return `a studded leather armor of resistance`
    if (d100roll <= 98) return `a tome of clear thought`
    if (d100roll <= 99) return `a tome of leadership and influence`
    if (d100roll <= 100) return `a tome of understanding`
}

function magicItemTableI() {
    const d100roll = Math.floor(Math.random() * 100) + 1
    /*
    01–05	Defender
    06–10	Hammer of thunderbolts
    11–15	Luck Blade
    16–20	Sword of answering
    21–23	Holy avenger
    24–26	Ring of djinni summoning
    27–29	Ring of invisibility
    30–32	Ring of spell turning
    36–38	Rod of lordly might
    39–41	Vorpal sword
    42–43	Belt of cloud giant strength
    44–45	Armor, +2 breastplate
    46–47	Armor, +3 chain mail
    48–49	Armor, +3 chain shirt
    50–51	Cloak of invisibility
    52–53	Crystal ball (legendary version)
    54-55	Armor, + 1 half plate
    56-57	Iron flask
    58-59	Armor, +3 leather
    60-61	Armor, +1 plate
    62-63	Robe of the archmagi
    64-65	Rod of resurrection
    66-67	Armor, +1 scale mail
    68-69	Scarab of protection
    70-71	Armor, +2 splint
    72-73	Armor, +2 studded leather
    74-75	Well of many worlds
    76	Armor, +3 plate
    77	Apparatus of Kwalish
    78	Armor of invulnerability
    79	Belt of storm giant strength
    80	Cubic gate
    81	Deck of many things
    82	Efreeti chain
    83	Armor of resistance (half plate)
    84	Horn ofValhalla (iron)
    85	Instrument of the bards (OIIamh harp)
    86	loun stone (greater absorption)
    87	loun stone (mastery)
    88	loun stone (regeneration)
    89	Plate armor of etherealness
    90	Plate armor of resistance
    91	Ring of air elemental command
    92	Ring of earthelemental command
    93	Ring of fire elemental command
    94	Ring of three wishes
    95	Ring of water elemental command
    96	Sphere of annihilation
    97	Talisman of pure good
    98	Talisman of the sphere
    99	Talisman of ultimate evil
    100	Tome of the stilled tongue
    */
    if (d100roll <= 5) return `a defender`
    if (d100roll <= 10) return `a hammer of thunderbolts`
    if (d100roll <= 15) return `a luck blade`
    if (d100roll <= 20) return `a sword of answering`
    if (d100roll <= 23) return `a holy avenger`
    if (d100roll <= 26) return `a ring of djinni summoning`
    if (d100roll <= 29) return `a ring of invisibility`
    if (d100roll <= 32) return `a ring of spell turning`
    if (d100roll <= 38) return `a rod of lordly might`
    if (d100roll <= 41) return `a vorpal sword`
    if (d100roll <= 43) return `a belt of cloud giant strength`
    if (d100roll <= 45) return `+2 breastplate armor`
    if (d100roll <= 47) return `+3 chain mail armor`
    if (d100roll <= 49) return `+3 chain shirt armor`
    if (d100roll <= 51) return `a cloak of invisibility`
    if (d100roll <= 53) return `a crystal ball - legendary version`
    if (d100roll <= 55) return `+1 half plate armor`
    if (d100roll <= 57) return `an iron flask`
    if (d100roll <= 59) return `+3 leather armor`
    if (d100roll <= 61) return `+1 plate armor`
    if (d100roll <= 63) return `a robe of the archmagi`
    if (d100roll <= 65) return `a rod of resurrection`
    if (d100roll <= 67) return `+1 scale mail armor`
    if (d100roll <= 69) return `a scarab of protection`
    if (d100roll <= 71) return `+2 splint armor`
    if (d100roll <= 73) return `+2 studded leather armor`
    if (d100roll <= 75) return `a well of many worlds`
    if (d100roll <= 76) return `+3 plate armor`
    if (d100roll <= 77) return `apparatus of Kwalish`
    if (d100roll <= 78) return `armor of invulnerability`
    if (d100roll <= 79) return `a belt of storm giant strength`
    if (d100roll <= 80) return `a cubic gate`
    if (d100roll <= 81) return `a deck of many things`
    if (d100roll <= 82) return `an efreeti chain`
    if (d100roll <= 83) return `half plate armor of resistance`
    if (d100roll <= 84) return `an iron horn of valhalla`
    if (d100roll <= 85) return `an instrument of the bards - OIIamh harp`
    if (d100roll <= 86) return `a loun stone - greater absorption`
    if (d100roll <= 87) return `a loun stone - mastery`
    if (d100roll <= 88) return `a loun stone - regeneration`
    if (d100roll <= 89) return `plate armor of etherealness`
    if (d100roll <= 90) return `plate armor of resistance`
    if (d100roll <= 91) return `a ring of air elemental command`
    if (d100roll <= 92) return `a ring of earth elemental command`
    if (d100roll <= 93) return `a ring of fire elemental command`
    if (d100roll <= 94) return `a ring of three wishes`
    if (d100roll <= 95) return `a ring of water elemental command`
    if (d100roll <= 96) return `a sphere of annihilation`
    if (d100roll <= 97) return `a talisman of pure good`
    if (d100roll <= 98) return `a talisman of the sphere`
    if (d100roll <= 99) return `a talisman of ultimate evil`
    if (d100roll <= 100) return `a tome of the stilled tongue`
}
