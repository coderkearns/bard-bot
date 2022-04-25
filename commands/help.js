const { colors } = require("../config")


module.exports = function () {
    return {
        name: "help",
        description: "Get help about commands.",
        usage: "[command]",
        async execute(e) {

            const commandToGet = e.args[0]
            if (commandToGet) return await singleCommand(e, commandToGet)

            await allCommands(e)
        }
    }
}

async function singleCommand(e, commandName) {
    const commands = e.snap.client.commands
    const command = commands.get(commandName) || commands.find(c => c.aliases && c.aliases.includes(commandName))
    if (!command) return e.message.channel.send(`Command \`${commandName}\` not found.`)

    const embed = {
        title: `\`${e.snap.config.prefix}${command.name}\``,
        description: command.description,
        color: colors.main,
        fields: []
    }

    if (command.usage) {
        embed.fields.push({
            name: "Usage",
            value: `\`${e.snap.config.prefix}${command.name} ${command.usage}\``
        })
    }

    if (command.aliases) {
        embed.fields.push({
            name: "Aliases", value: command.aliases.map(a => `\`${e.snap.config.prefix}${a}\``).join(", ")
        })
    }

    e.send({ embed })
}

async function allCommands(e) {
    const commands = e.snap.client.commands.filter(command => !command.hidden && command.name !== "help")
    const embed = {
        title: "Commands",
        fields: [],
        color: colors.main,
        description: "Use `!help <command>` to get more info about a command."
    }

    for (let command of commands.values()) {
        embed.fields.push({
            name: `\`${e.snap.config.prefix}${command.name}${command.usage ? ' ' + command.usage : ''}\``,
            value: command.shortDescription || command.description || "No description provided.",
        })
    }

    e.send({ embed })
}
