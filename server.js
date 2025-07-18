const express = require('express');

//serve static files



const app = express();
const path = require('path');
// Middleware to parse JSON
app.use(express.json());
app.use(express.static(__dirname));


// Define a basic route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});