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
        name: "item",
        aliases: ["finditem"],
        description: "Find a item by name",
        usage: "[name]",
        async execute(e) {
            const item = await apiCall("magic-items", e.args.join(" "))

            if (!item) {
                e.send("I've never heard of that item!")
                return
            }

            const embed = {
                title: item.name,
                description: "",
                color: colors.item
            }

            let description = item.desc.join("\n\n")

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
                        color: colors.item,
                        footer: {
                            text: `Part ${i + 1} / ${chunks.length}`
                        },
                        title: `${item.name}`,
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
