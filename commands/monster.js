const { splitMessage } = require("../snap-discord/snap").Discord.Util
const { apiCall } = require("../dnd/apiCalls")
const { colors } = require("../config")

const abilityNames = {
    "strength": "STR",
    "dexterity": "DEX",
    "constitution": "CON",
    "intelligence": "INT",
    "wisdom": "WIS",
    "charisma": "CHA"
}

const toTitleCase = (str) => {
    if (!str) return ""
    if (typeof str == "object" && str.name) return toTitleCase(str.name)
    return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
}

module.exports = function () {
    return {
        name: "monster",
        aliases: ["findmonster"],
        description: "Find a monster by name",
        usage: "[name]",
        async execute(e) {
            const monster = await apiCall("monsters", e.args.join(" "))

            if (!monster) {
                e.send("I've never heard of that monster!")
                return
            }

            const embed = {
                title: monster.name,
                description: `*${toTitleCase(monster.alignment)} ${monster.size} ${toTitleCase(monster.type)}*`,
                color: colors.monster
            }

            let description = `
            **Hit Points**: ${monster.hit_points} (${monster.hit_dice} hit dice)
            **CR**: ${monster.challenge_rating} (${monster.xp} XP)
            **Armor Class**: ${monster.armor_class}
            **Speeds**: ${Object.keys(monster.speed).map(key => `${toTitleCase(key)}: ${monster.speed[key]}`).join(", ")}
            **Ability Scores**:\n${Object.keys(abilityNames).map(key => `*${abilityNames[key]}*: ${monster[key]}`).join("\n")}

            **Proficiency Bonus**: ${monster.proficiency_bonus}
            **Proficiencies**:\n${monster.proficiencies.map(prof => `${prof.proficiency.name} (${prof.value})`).join("\n")}

            **Senses**: ${Object.keys(monster.senses).map(key => `${toTitleCase(key.replace('_', ' '))}: ${monster.senses[key]}`).join(", ")}
            **Languages**: ${monster.languages || "None"}
            **Damage Immunities**: ${monster.damage_immunities.map(name => `${toTitleCase(name)}`).join(", ")}
            **Damage Vulnerabilities**: ${monster.damage_vulnerabilities.map(name => `${toTitleCase(name)}`).join(", ")}
            **Damage Resistances**: ${monster.damage_resistances.map(name => `${toTitleCase(name)}`).join(", ")}
            **Condition Immunities**: ${monster.condition_immunities.map(name => `${toTitleCase(name)}`).join(", ")}
            **Features**:\n${monster.special_abilities.map(ability => `*${ability.name}*. ${ability.desc}`).join("\n")}

            **Actions**:\n${monster.actions.map(action => `*${action.name}*. ${action.desc}`).join("\n")}
            `
            if (monster.legendary_actions && monster.legendary_actions.length > 0) {
                description += `\n**Legendary Actions**:\n${monster.legendary_actions.map(action => `*${action.name}*. ${action.desc}`).join("\n")}`
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
