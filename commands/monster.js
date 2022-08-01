const { splitMessage } = require("../snap-discord/snap").Discord.Util
const { colors } = require("../config")
const monsters = require("../data/monsters.json")


module.exports = function () {
    return {
        name: "monster",
        aliases: ["creature"],
        description: "Find a monster by name",
        usage: "<name>",
        async execute(e) {
            const monster = findMonster(e.args.join(" "))

            if (!monster) {
                e.send("I've never heard of that monster!")
                return
            }

            const embed = {
                title: monster.name,
                color: colors.monster,
                footer: {
                    text: renderSource(monster)
                }
            }

            let description = createDescription(monster)

            const chunks = splitMessage(description, { maxLength: 1024 })

            if (chunks.length <= 1) {
                embed.description = description
                e.message.channel.send({ embed })
            } else {
                embed.description = chunks.shift()
                e.message.channel.send({ embed })
                chunks.forEach((chunk, i) => e.message.channel.send({
                    embed: {
                        description: chunk,
                        color: colors.monster,
                        footer: {
                            text: `Part ${i + 1} / ${chunks.length}`
                        },
                        title: `${monster.name}`,
                    }
                }))
            }

        }
    }
}

function findMonster(name) {
    const monster = monsters.find(m => m.name.toLowerCase() === name.toLowerCase())
    if (monster) return monster
    return monsters.find(m => m.name.toLowerCase().includes(name.toLowerCase()))
}


function renderSource(monster) {
    return `${monster.source}, pg ${monster.page}`
}

function createDescription(monster) {
    let ret = `*${renderSize(monster.size)} ${renderType(monster.type)}, ${renderAlignment(monster.alignment)}*

    **Armor Class**: ${renderArmorClass(monster.ac)}
    **Hit Points**: ${renderHP(monster.hp)}
    **Speed**: ${renderSpeed(monster.speed)}

    **Ability Scores**: ${renderAbilityScores(monster)}

    **Skills**: ${renderSkills(monster.skill)}${renderVulnResistImmune(monster)}
    **Senses**: ${renderSenses(monster.senses)}
    **Languages**: ${renderLanguages(monster.languages)}
    **Challenge**: ${renderChallenge(monster.cr)}

    **Features**: ${renderFeatures(monster)}

    **Actions**: ${renderActions(monster)}
    `

    return ret
}


const allSizes = {
    "T": "Tiny",
    "S": "Small",
    "M": "Medium",
    "L": "Large",
    "H": "Huge",
    "G": "Gargantuan",
}
function renderSize(sizes) {
    return sizes.map(s => allSizes[s]).join(" or ")
}

function renderType(type) {
    if (typeof type == "string") return type
    let ret = type.type
    if (type.tags && type.tags.length > 0) {
        ret += ` (${type.tags.join(", ")})`
    }
    return ret
}

const allAlignments = {
    "U": "unaligned",
    "A": "any alignment",
    "L": "lawful",
    "N": "neutral",
    "C": "chaotic",
    "E": "evil",
    "G": "good",
}
function renderAlignment(alignments = []) {
    return alignments.map(a => allAlignments[a] || "unknown").join(" ") || "unaligned"
}


function renderArmorClass(ac = ["unknown"]) {
    ac = ac[0]
    if (["string", "number"].includes(typeof ac)) return ac

    if (typeof ac === "object") {
        return `${ac.ac}${ac.from ? ' ' + ac.from[0] : ''}`
    }

    return ac
}

function renderHP(hp) {
    if (["string", "number"].includes(typeof hp)) return hp

    if (typeof hp === "object") {
        return `${hp.average} (${hp.formula})`
    }

    return hp
}


function renderSpeed(speed) {
    // if the only key is "walk" then just return the value
    if (speed.length === 1 && Object.keys(speed)[0] === "walk") {
        return `${speed.walk} ft.`
    }

    return Object.entries(speed).map(([key, value]) => {
		if (typeof value === "object") value = `${value.number} ${value.condition}`
        return `${key} ${value} ft.`
    }).join(", ")
}

const abilityScores = ["str", "dex", "con", "int", "wis", "cha"]
function renderAbilityScores(monster) {
    return abilityScores.map(s => {
        return `**${s.toUpperCase()}**: ${monster[s]}`
    }).join("\n")
}

function renderSkills(skills) {
    if (!skills) return "None"

    return Object.entries(skills).map(([key, value]) => {
        return `${key} ${value}`
    }).join(", ")
}

function renderVulnResistImmune(monster) {
    if (!monster.vulnerable && !monster.resist && !monster.immune && !monster.conditionImmune) return ""
    let ret = "\n"
    if (monster.vulnerable) ret += `**Damage Vulnerabilities**: ${monster.vulnerable.join(', ')}\n`
    if (monster.resist) ret += `**Damage Resistances**: ${monster.resist.join(', ')}\n`
    if (monster.immune) ret += `**Damage Immunities**: ${monster.immune.join(', ')}\n`
    if (monster.conditionImmune) ret += `**Condition Immunities**: ${monster.conditionImmune.join(', ')}\n`
    return ret
}

function renderSenses(senses) {
    if (!senses) return "None"
    return senses.join(", ")
}

function renderLanguages(languages) {
    if (!languages) return "None"
    return languages.join(", ")
}

function renderChallenge(cr) {
    let num = 0

    if (["string", "number"].includes(typeof cr)) num = cr

    if (typeof cr === "object") {
        if (cr.xp) return `${cr.cr} (${cr.xp} XP)`
        num = parseInt(cr.cr)
    }

    const xp = calculateChallangeXP(num)

    return `${num} (${xp} XP)`
}

const crToXP = {
    0: 10,
    "1/8": 25,
    "1/4": 50,
    "1/2": 100,
    1: 200,
    2: 450,
    3: 700,
    4: 1100,
    5: 1800,
    6: 2300,
    7: 2900,
    8: 3900,
    9: 5000,
    10: 5900,
    11: 7200,
    12: 8400,
    13: 10000,
    14: 11500,
    15: 13000,
    16: 15000,
    17: 18000,
    18: 20000,
    19: 22000,
    20: 25000,
    21: 33000,
    22: 41000,
    23: 50000,
    24: 62000,
    25: 75000,
    26: 90000,
    27: 105000,
    28: 120000,
    29: 135000,
    30: 155000,
}
function calculateChallangeXP(cr = "unknown") {
    return crToXP[cr] || 0
}

function renderFeatures(monster) {
    let ret = []

    if (!monster.trait) return "None"

    ret.push("")
    for (let trait of monster.trait) {
        ret.push(`*${trait.name}*. ${trait.entries.map(renderEntry).join("\n")}`)
    }

    return ret.join("\n\n")
}

function renderEntry(entry) {
    if (typeof entry === "string") return entry
    if (entry.type === "entries") return `*${entry.name}*. ${entry.entries.join("\n")}`
    if (entry.type === "list") return entry.items.map(item => `- ${renderEntry(item)}`).join("\n")
    return renderObject(entry)
}

function renderObject(obj) {
	if (obj.type === "item") return `**${obj.name}** *${obj.entry}*`
	return JSON.stringify(obj)
}

function renderActions(monster) {
    let ret = []

    if (!monster.action) return "None"

    for (let action of monster.action) {
        ret.push(`*${action.name}*. ${action.entries.map(renderEntry).join("\n")}`)
    }

    if (monster.legendary && monster.legendary.length > 0) {
        ret.push(`\n**Legendary Actions**\n`)
        for (let action of monster.legendary) {
            ret.push(`*${action.name}*. ${action.entries.map(renderEntry).join("\n")}`)
        }
    }

    return ret.join("\n\n")
}
