const express = require('express');
const bodyParser = require('body-parser');
const { handleDisconnect } = require('./db');
const ussdRoutes = require('./ussd');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));

// Establish DB connection
handleDisconnect();

// USSD Routes
app.use('/ussd', ussdRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
