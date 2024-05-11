const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT;
app.use(bodyParser.json());

const { authMiddleware } = require('./middleware/authMiddleWare.js');

//const databasePath = "mongodb+srv://songuser:songuser@prabu.fiuigwk.mongodb.net/";

const databasePath = process.env.MONGO_URI;

const databaseName = "SongDetails";
const collectionName = "Song";


app.use(cors());

const authRoutes = require('./routes/auth.js');
app.use('/api/auth', authRoutes);

app.get('/getSongByNo',authMiddleware, async(req, res) => {
    const client = new MongoClient(databasePath);
    const number = parseInt(req.query.number);

    try{
        console.log(number);

        await client.connect();
        const db = client.db(databaseName);

        const collection = db.collection(collectionName);

        const [result] = await collection.find({ 'Sno' : number }, { "_id" : -1 }).toArray();

        console.log(result);

        res.json(result);
    }
    catch(err) {
        console.log(err);
        res.status(400).json({ error: err.message });
    }
    finally{
        await client.close();
    }

})

app.get('/getLyricByNo', async(req, res) => {
    const client = new MongoClient(databasePath);
    const number = parseInt(req.query.number);

    try{
        console.log(number);

        await client.connect();
        const db = client.db(databaseName);

        const collection = db.collection(collectionName);

        const [result] = await collection.find({ 'Sno' : number }, {'Lyrics': 1, '_id' : 0 , 'Sno' : 0}).limit(1).toArray();

        console.log(result);

        res.json(result);
    }
    catch(err) {
        console.log(err);
        res.status(400).json({ error: err.message });
    }
    finally{
        await client.close();
    }

})


app.get('/getSongBySongName', async(req, res) => {
    const client = new MongoClient(databasePath);
    const SongName = req.query.songName;

    try{
        console.log(SongName);

        await client.connect();
        const db = client.db(databaseName);

        const collection = db.collection(collectionName);

        const [result] = await collection.find({ 'Song Name' : SongName }, { "_id" : -1 }).toArray();


        res.json(result);
    }
    catch(err) {
        console.log(err);
        res.status(400).json({ error: err.message });
    }
    finally{
        await client.close();
    }

})


app.get('/getSongsByMovieName', async(req, res) => {
    const client = new MongoClient(databasePath);
    const MovieName = req.query.movieName;

    try{
        console.log(MovieName);
        
        await client.connect();
        const db = client.db(databaseName);

        const collection = db.collection(collectionName);
        

        const result = await collection.find({ 'Movie Name' : MovieName }).project({"Song Name" : 1 }).toArray();
        console.log(result);

        res.json(result);
    }
    catch(err) {
        console.log(err);
        res.status(400).json({ error: err.message });
    }
    finally{
        await client.close();
    }

})


app.get('/getMovieNames', async(req, res) => {
    const client = new MongoClient(databasePath);
    const MovieName = req.query.movieName;

    try{
        console.log(MovieName);

        await client.connect();
        const db = client.db(databaseName);

        const collection = db.collection(collectionName);

        const regex = new RegExp('^' + MovieName , 'i' );


        const result = await collection.distinct('Movie Name' , { 'Movie Name' : {$regex : regex} });


        res.json(result);
    }
    catch(err) {
        console.log(err);
        res.status(400).json({ error: err.message });
    }
    finally{
        await client.close();
    }

})



app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
