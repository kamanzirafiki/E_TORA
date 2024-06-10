const express = require('express');
const { getCandidates, isAdmin, db } = require('./db');
const { adminMenu } = require('./admin');
const { userMenu, voters, userLanguages, userNames } = require('./user');

const router = express.Router();

router.post('/', (req, res) => {
    let response = '';

    // Extract USSD input
    const { sessionId, serviceCode, phoneNumber, text } = req.body;

    // Parse user input
    const userInput = text.split('*').map(option => option.trim());

    // Determine next action based on user input
    if (userInput.length === 1 && userInput[0] === '') {
        // First level menu: Language selection
        response = `CON Welcome to E-voting portal\n`;
        response += `1. English\n`;
        response += `2. Kinyarwanda`;
    } else if (userInput.length === 1 && userInput[0] !== '') {
        // Validate language selection
        if (userInput[0] === '1' || userInput[0] === '2') {
            // Save user's language choice and check if the user is an admin
            userLanguages[phoneNumber] = userInput[0] === '1' ? 'en' : 'rw';

            isAdmin(phoneNumber, (isAdmin, adminName) => {
                if (isAdmin) {
                    adminMenu(phoneNumber, adminName, userLanguages, res);
                } else {
                    // Prompt user to enter their name
                    response = userLanguages[phoneNumber] === 'en' ? 
                        `CON Enter your name:` : 
                        `CON Uzuza umwirondoro: \n Amazina yawe:`;
                    res.send(response);
                }
            });
            return; // Return to wait for async callback
        } else {
            // Invalid language selection
            response = `END Invalid selection. Please try again.` + 
                       `\nIbyo muhisemo Ntago aribyo. Ongera ugerageze.`;
        }
    } else if (userInput.length === 2) {
        if (userLanguages[phoneNumber] && !userNames[phoneNumber]) {
            // Save user's name
            userNames[phoneNumber] = userInput[1];
        }

        // Check if the user is an admin
        isAdmin(phoneNumber, (isAdmin, adminName) => {
            if (isAdmin) {
                adminMenu(phoneNumber, adminName, userLanguages, res);
            } else {
                userMenu(phoneNumber, userLanguages, res);
            }
        });
        return; // Return to wait for async callback
    } else if (userInput.length === 3) {
        if (userInput[2] === '1' || userInput[2] === '2') {
            isAdmin(phoneNumber, (isAdmin, adminName) => {
                if (userInput[2] === '1') {
                    if (isAdmin) {
                        // Admin viewing votes
                        const totalVotesQuery = 'SELECT COUNT(*) as total_votes FROM votes';
                        db.query(totalVotesQuery, (err, totalResults) => {
                            if (err) {
                                console.error('Error retrieving total votes from database:', err.stack);
                                response = `END Error retrieving votes.`;
                                res.send(response);
                                return;
                            }
                            const totalVotes = totalResults[0].total_votes;

                            const votesQuery = 'SELECT voted_candidate, COUNT(*) as vote_count FROM votes GROUP BY voted_candidate';
                            db.query(votesQuery, (err, results) => {
                                if (err) {
                                    console.error('Error retrieving votes from database:', err.stack);
                                    response = `END Error retrieving votes.`;
                                } else {
                                    response = `END Votes:\n`;
                                    results.forEach(row => {
                                        const percentage = ((row.vote_count / totalVotes) * 100).toFixed(2);
                                        response += `${row.voted_candidate}: ${row.vote_count} votes (${percentage}%)\n`;
                                    });
                                }
                                res.send(response);
                            });
                        });
                        return;
                    } else {
                        // Check if the phone number has already voted
                        if (voters.has(phoneNumber)) {
                            response = userLanguages[phoneNumber] === 'en' ? 
                                `END You have already voted. Thank you!` : 
                                `END Waratoye. Murakoze!`;
                        } else {
                            // Retrieve candidates from database
                            getCandidates(candidateNames => {
                                response = userLanguages[phoneNumber] === 'en' ? 
                                    `CON Select a candidate:\n` : 
                                    `CON Hitamo umukandida:\n`;

                                candidateNames.forEach((candidate, index) => {
                                    response += `${index + 1}. ${candidate}\n`;
                                });

                                res.send(response);
                            });
                            return; // Return to wait for async callback
                        }
                    }
                } else if (userInput[2] === '2') {
                    // View information option selected
                    const query = 'SELECT name, phone_number FROM admin WHERE phone_number = ?';
                    db.query(query, [phoneNumber], (err, results) => {
                        if (err) {
                            console.error('Error retrieving admin information from database:', err.stack);
                            response = userLanguages[phoneNumber] === 'en' ? 
                                `END Error retrieving admin information.` : 
                                `END Umwirondoro ntago abonetse.`;
                            res.send(response);
                        } else if (results.length > 0) {
                            const { name, phone_number } = results[0];
                            response = userLanguages[phoneNumber] === 'en' ? 
                                `END Your Information:\nName: ${name}\nPhone: ${phone_number}` : 
                                `END Umwirondoro:\nIzina: ${name}\nTelefone: ${phone_number}`;
                            res.send(response);
                        } else {
                            response = userLanguages[phoneNumber] === 'en' ? 
                                `END  information not found.` : 
                                `END Amakuru ntago abonetse.`;
                            res.send(response);
                        }
                    });
                    return; // Return to wait for async callback
                }
            });
            return; // Return to wait for async callback
        } else {
            // Invalid main menu selection
            response = userLanguages[phoneNumber] === 'en' ? 
                `END Invalid selection. Please try again.` : 
                `END Ibyo muhisemo Ntago aribyo. Ongera ugerageze.`;
        }
    } else if (userInput.length === 4) {
        // Fourth level menu: Voting confirmation
        let candidateIndex = parseInt(userInput[3]) - 1;

        getCandidates(candidateNames => {
            if (candidateIndex >= 0 && candidateIndex < candidateNames.length) {
                const selectedCandidate = candidateNames[candidateIndex];
                voters.add(phoneNumber); // Mark this phone number as having voted
                response = userLanguages[phoneNumber] === 'en' ? 
                    `END Thank you for voting ${selectedCandidate}!` : 
                    `END Murakoze gutora, Mutoye ${selectedCandidate}!`;

                // Insert voting record into the database
                const timestamp = new Date();
                const voteData = {
                    session_id: sessionId,
                    phone_number: phoneNumber,
                    user_name: userNames[phoneNumber],
                    language_used: userLanguages[phoneNumber],
                    voted_candidate: selectedCandidate,
                    voted_time: timestamp
                };

                const query = 'INSERT INTO votes SET ?';
                db.query(query, voteData, (err, result) => {
                    if (err) {
                        console.error('Error inserting data into database:', err.stack);
                    }
                });

                res.send(response);
            } else {
                response = userLanguages[phoneNumber] === 'en' ? 
                    `END Invalid selection. Please try again.` : 
                    `END Ibyo muhisemo Ntago aribyo. Ongera ugerageze.`;
                res.send(response);
            }
        });
        return; // Return to wait for async callback
    } else {
        // Catch-all for any other invalid input
        response = userLanguages[phoneNumber] === 'en' ? 
            `END Invalid selection. Please try again.` : 
            `END Ibyo muhisemo Ntago aribyo. Ongera ugerageze.`;
    }

    res.send(response);
});

module.exports = router;
