const express = require('express');
const cors = require('cors');
const { connectToMongoDB } = require('./db');
const che_cloud_data = require('./routes/CHe_cloud_data');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use(async (req, res, next) => {
    try {
        req.db = await connectToMongoDB(); 
        next();
    } catch (error) {
        console.error(error);
        res.status(500).send('Error during the connection to the DB');
    }
});

app.use('/CHe_cloud_data',che_cloud_data);

app.listen(port,() => {
    console.log(`Server is running on port: ${port}`);
})