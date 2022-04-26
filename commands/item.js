const { splitMessage } = require("../snap-discord/snap").Discord.Util
const { colors } = require("../config")
const items = require("../data/items.json")


module.exports = function () {
    return {
        name: "item",
        description: "Find a magic item by name",
        usage: "<name>",
        async execute(e) {
            const item = findItem(e.args.join(" "))

            if (!item) {
                e.send("I've never heard of that item!")
                return
            }

            const embed = {
                title: item.name,
                color: colors.item,
                footer: {
                    text: renderSource(item)
                }
            }

            let description = createDescription(item)

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

function findItem(name) {
    const item = items.find(i => i.name.toLowerCase() == name.toLowerCase())
    if (item) return item
    return items.find(i => i.name.toLowerCase().includes(name.toLowerCase()))
}


function renderSource(item) {
    return `${item.source}, pg ${item.page}`
}

function createDescription(item) {
    let ret = `*${toTitleCase(item.rarity)} ${item.wondrous ? "Wondrous" : "Magic"} Item*

    ${renderEntries(item.entries)}`

    return ret
}

function renderEntries(entries) {
    return entries.map(renderEntry).join("\n\n")
}

function renderEntry(entry) {
    if (typeof entry === "string") return entry
    if (entry.type === "entries") return `*${entry.name}*. ${entry.entries.join("\n")}`
    if (entry.type === "list") return entry.items.map(item => `- ${item}`).join("\n")
    return `Unknown (${entry.type})`
}

function toTitleCase(str) {
    return str.split(" ").map(s => s.slice(0, 1).toUpperCase() + s.slice(1)).join(" ")
}
