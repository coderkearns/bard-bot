const { splitMessage } = require("../snap-discord/snap").Discord.Util
const { colors } = require("../config")
const spells = require("../data/spells.json")


module.exports = function () {
    return {
        name: "spell",
        description: "Find a spell by name",
        usage: "<name>",
        async execute(e) {
            const spell = findSpell(e.args.join(" "))

            if (!spell) {
                e.send("I've never heard of that spell!")
                return
            }

            const embed = {
                title: spell.name,
                color: colors.spell,
                footer: {
                    text: renderSource(spell)
                }
            }

            let description = createDescription(spell)

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
                        color: colors.spell,
                        footer: {
                            text: `Part ${i + 1} / ${chunks.length}`
                        },
                        title: `${spell.name}`,
                    }
                }))
            }

        }
    }
}

function findSpell(name) {
    const spell = spells.find(spell => spell.name.toLowerCase() == name.toLowerCase())
    if (spell) return spell
    return spells.find(spell => spell.name.toLowerCase().includes(name.toLowerCase()))
}


function renderSource(spell) {
    return `${spell.source}, pg ${spell.page}`
}

function createDescription(spell) {
    let ret = `*${renderLevel(spell.level)} ${renderSchool(spell.school)} spell*

    **Casting Time:** ${renderTime(spell.time)}
    **Range:** ${renderRange(spell.range)}
    **Components:** ${renderComponents(spell.components)}
    **Duration:** ${renderDuration(spell.duration)}

    ${renderEntries(spell.entries, spell.entriesHigherLevel)}
    `

    return ret
}

// Turns 1 into 1st, 2 into 2nd, etc.
function renderLevel(number) {
    if (number == 0) return "Cantrip (0th-level)"
    if (number == 1) return "1st-level"
    if (number == 2) return "2nd-level"
    if (number == 3) return "3rd-level"
    return number + "th-level"
}


const schools = {
    "I": "Illusion",
    "V": "Evocation",
    "N": "Necromancy",
    "D": "Divination",
    "T": "Transmutation",
    "C": "Conjuration",
    "A": "Abjuration",
    "E": "Enchantment"
}

function renderSchool(schoolChar) {
    return schools[schoolChar] || `Unknown (${schoolChar})`
}

function renderTime(time) {
    return `${time[0].number} ${time[0].unit}`
}

function renderRange(range) {
    if (range.type === "touch") return "Touch"
    if (range.type === "point") {
        if (range.distance.type === "self") return "Self"
        return `${range.distance.amount} ${range.distance.type}`
    }
    return `Unknown (${range.type})`
}

function renderComponents(components) {
    const comp = []
    if (components.v) comp.push("V")
    if (components.s) comp.push("S")
    if (components.m) {
        if (typeof components.m === "string") return `M (${components.m})`
        if (typeof components.m === "object") return `M (${components.m.text})`
    }
    return comp.join(", ") || "None"
}

function renderDuration(duration) {
    if (Array.isArray(duration)) duration = duration[0]
    if (duration.type === "instant") return "Instantaneous"
    if (duration.type === "timed") {
        if (duration.concentration) return `Concentration, ${duration.duration.amount} ${duration.duration.type}`
        return `${duration.duration.amount} ${duration.duration.type}`
    }
    return `Unknown (${duration.type})`
}

function renderEntries(entries, entriesHigherLevel) {
    let ret = []

    for (let entry of entries) {
        ret.push(renderEntry(entry))
    }

    if (entriesHigherLevel) {
        for (let entry of entriesHigherLevel) {
            ret.push(renderEntry(entry))
        }
    }

    return ret.join("\n\n")
}

function renderEntry(entry) {
    if (typeof entry === "string") return entry
    if (entry.type === "entries") return `*${entry.name}*. ${entry.entries.join("\n")}`
    if (entry.type === "list") return entry.items.map(item => `- ${item}`).join("\n")
    return `Unknown (${entry.type})`
}
