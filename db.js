const mysql = require('mysql');

const dbConfig = {
    host: 'b7ibmjlhpgryifyzrsvl-mysql.services.clever-cloud.com',
    user: 'up5b9cvw7drc2qml',
    password: '0LVI2CGd3MQz4thSfXLp', 
    database: 'b7ibmjlhpgryifyzrsvl'
};

let db;

// Function to handle connection
function handleDisconnect() {
    db = mysql.createConnection(dbConfig);

    db.connect(err => {
        if (err) {
            console.error('Error connecting to database:', err.stack);
            setTimeout(handleDisconnect, 2000); // Reconnect after 2 seconds
        } else {
            console.log('Connected to database.');
        }
    });

    db.on('error', err => {
        console.error('Database error:', err.stack);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            handleDisconnect(); // Reconnect on connection loss
        } else {
            throw err;
        }
    });
}

// Retrieve candidates from database
function getCandidates(callback) {
    const query = 'SELECT name FROM candidates';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error retrieving candidates from database:', err.stack);
            callback([]);
        } else {
            const candidateNames = results.map(candidate => candidate.name);
            callback(candidateNames);
        }
    });
}

// Check if the phone number belongs to an admin and retrieve admin name
function isAdmin(phoneNumber, callback) {
    const query = 'SELECT name, phone_number FROM admin WHERE phone_number = ?';
    db.query(query, [phoneNumber], (err, results) => {
        if (err) {
            console.error('Error checking admin status:', err.stack);
            callback(false, null);
        } else if (results.length > 0) {
            callback(true, results[0].name);
        } else {
            callback(false, null);
        }
    });
}

module.exports = {
    handleDisconnect,
    getCandidates,
    isAdmin,
    db
};
