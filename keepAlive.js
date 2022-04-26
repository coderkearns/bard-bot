const express = require("express")
const app = express()

app.get("/", (req,res) => {
	res.send("bard-bot is up!")
})

module.exports = function() {
	return app.listen()
}