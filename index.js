const Snap = require("./snap-discord/snap")

const client = new Snap({
    token: process.env.TOKEN,
    prefix: "!",
    commands: [
        require("./commands/help")(),
        require("./commands/roll")(),
        require("./commands/monster")(),
        require("./commands/spell")(),
        require("./commands/item")(),
        require("./commands/treasure")(),
    ]
})

require("./keepAlive")()

client.run()
