const voters = new Set(); // Set to track phone numbers that have already voted
const userLanguages = {}; // Object to store the language preference of each user
const userNames = {}; // In-memory storage for user data

function userMenu(phoneNumber, userLanguages, res) {
    let response = userLanguages[phoneNumber] === 'en' ? 
        `CON Hello ${userNames[phoneNumber]}, choose an option:\n1. Vote Candidate\n2. My Information` : 
        `CON Muraho ${userNames[phoneNumber]}, Hitamo:\n1. Tora umukandida\n2. Umwirondoro wanjye`;
    res.send(response);
}

module.exports = {
    voters,
    userLanguages,
    userNames,
    userMenu
};
