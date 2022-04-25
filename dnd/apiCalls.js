const fetch = require('node-fetch');

const baseApi = "https://www.dnd5eapi.co/api/"

// EX apiCall("spells", "Acid Arrow") returns the json of https://www.dnd5eapi.co/api/spells/acid-arrow or null if not found
async function apiCall(path, nameSearch) {
    const nameSearchUrl = nameSearch.replaceAll(" ", "-").toLowerCase()
    const url = baseApi + path + "/" + nameSearchUrl
    const response = await fetch(url)
    if (response.status === 404) {
        return null
    }
    return await response.json()
}

module.exports = {
    apiCall,
    baseApi
}
