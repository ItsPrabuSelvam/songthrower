const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId , MongoClient} = require('mongodb');
const router = express.Router();
require('dotenv').config();

const {isTokenAboutToExpire } = require('../util/util');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
//const databasePath = "mongodb+srv://songuser:songuser@prabu.fiuigwk.mongodb.net/";

const databasePath = process.env.MONGO_URI_ADMIN;
const databaseName = "User";

// Register route
router.post('/signup', async (req, res) => {
    const { username, password , dob , email } = req.body;
    const client = new MongoClient(databasePath);

    try {
        await client.connect();
        const db = client.db(databaseName);
        let user = await db.collection('users').findOne({ username });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await db.collection('users').insertOne({
            username,
            password: hashedPassword,
            dob,
            email,
            refreshToken: ''
        });

        res.status(201).json({ msg: 'User registered successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Login route
router.post('/signin', async (req, res) => {
    const { username, password } = req.body;
    const client = new MongoClient(databasePath);
   

    try {
        await client.connect();
        const db = client.db(databaseName);
        const user = await db.collection('users').findOne({ username });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const payload = {
            user: {
                id: user._id
            }
        };

        const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '1m' });

        await db.collection('users').updateOne(
            { _id: user._id },
            { $set: { refreshToken: refreshToken } }
        );

        res.json({ accessToken, refreshToken });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Token refresh route
/* router.post('/token', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(401).json({ msg: 'No token provided' });
    }

    const client = new MongoClient(databasePath);

    try {
        await client.connect();
        const db = client.db(databaseName);
        const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
        const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.user.id) });

        if (!user || user.refreshToken !== token) {
            return res.status(403).json({ msg: 'Invalid token' });
        }

        const payload = {
            user: {
                id: user._id
            }
        };

        const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
        const newRefreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

        await db.collection('users').updateOne(
            { _id: user._id },
            { $set: { refreshToken: newRefreshToken } }
        );

        res.json({ accessToken, refreshToken: newRefreshToken });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
}); */

router.post('/token', async (req, res) => {
    const { token } = req.body;
    
    if (!token) {
        return res.status(401).json({ msg: 'No token provided' });
    }

    const client = new MongoClient(databasePath);

    try {
        await client.connect();
        const db = client.db(databaseName);
        const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
        const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.user.id) });

        if (!user || user.refreshToken !== token) {
            return res.status(403).json({ msg: 'Invalid token' });
        }

        const payload = {
            user: {
                id: user._id
            }
        };

        const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });

        let newRefreshToken = token;
        if (isTokenAboutToExpire(token)) {
            newRefreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
            await db.collection('users').updateOne(
                { _id: user._id },
                { $set: { refreshToken: newRefreshToken } }
            );

            res.json({ accessToken, refreshToken: newRefreshToken });
            return;
        }

        res.json({ accessToken });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
