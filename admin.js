function adminMenu(phoneNumber, adminName, userLanguages, res) {
    let response = userLanguages[phoneNumber] === 'en' ? 
        `CON Hello  ${adminName}, choose an option:\n1. View Votes\n2. My Information` : 
        `CON Muraho  ${adminName}, Hitamo:\n1. Reba amajwi\n2. Umwirondoro wanjye`;
    res.send(response);
}

module.exports = {
    adminMenu
};
