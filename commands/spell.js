const { splitMessage } = require("../snap-discord/snap").Discord.Util
const { apiCall } = require("../dnd/apiCalls")
const { colors } = require("../config")


const toTitleCase = (str) => {
    if (!str) return ""
    if (typeof str == "object" && str.name) return toTitleCase(str.name)
    return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
}

module.exports = function () {
    return {
        name: "spell",
        aliases: ["findspell"],
        description: "Find a spell by name",
        usage: "[name]",
        async execute(e) {
            const spell = await apiCall("spells", e.args.join(" "))

            if (!spell) {
                e.send("I've never heard of that spell!")
                return
            }

            const embed = {
                title: spell.name,
                description: `*${numberify(spell.level)} ${spell.school.name} Spell*`,
                color: colors.spell
            }

            let description = `
            **Casting Time**: ${spell.casting_time}
            **Range**: ${spell.range}
            **Components**: ${renderComponents(spell.components, spell.material)}
            **Duration**: ${spell.duration}

            ${spell.desc}
            `

            if (spell.higher_level && spell.higher_level.length > 0) {
                description += `\n**At Higher Levels**:\n${spell.higher_level.join("\n")}`
            }

            const chunks = splitMessage(description, { maxLength: 1024 })

            if (chunks.length <= 1) {
                embed.description += description
                e.message.channel.send({ embed })
            } else {
                embed.description += "\n" + chunks.shift()
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

function renderComponents(components, material) {
    let ret = components.join(", ")
    if (material) ret += ` (${material})`
    return ret
}

// Turns 1 into 1st, 2 into 2nd, etc.
function numberify(number) {
    if (number == 0) return "Cantrip (0th-level)"
    if (number == 1) return "1st-level"
    if (number == 2) return "2nd-level"
    if (number == 3) return "3rd-level"
    return number + "th-level"
}
