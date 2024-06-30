require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const fetch = require('node-fetch');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const PREFIX = '!';  // Define your prefix
const WELCOME_CHANNEL_ID = 'YOUR_WELCOME_CHANNEL_ID';
const LOG_CHANNEL_ID = 'YOUR_LOG_CHANNEL_ID';
const MOD_KEYWORDS = ['badword1', 'badword2'];  // Define keywords for automated moderation

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Welcome Messages
client.on('guildMemberAdd', (member) => {
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (channel) {
        channel.send(`Welcome to the server, ${member}!`);
    }
});

// Logging Function
function logAction(action, details) {
    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
        logChannel.send(`[${action}] ${details}`);
    }
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Automated Moderation
    if (MOD_KEYWORDS.some(keyword => message.content.includes(keyword))) {
        const muteRole = message.guild.roles.cache.find(role => role.name === 'Muted');
        try {
            await message.member.roles.add(muteRole);
            message.channel.send(`${message.author.tag} has been muted for using inappropriate language.`);
            logAction('Auto-Mute', `${message.author.tag} was muted for using inappropriate language.`);
        } catch (err) {
            message.channel.send('Failed to mute the member.');
        }
    }

    // Command Handling
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Ping Command
    if (command === 'ping') {
        message.channel.send('Pong!');
    }

    // Kick Command
    if (command === 'kick') {
        if (!message.member.permissions.has('KICK_MEMBERS')) {
            return message.reply('You do not have permissions to use this command');
        }
        const member = message.mentions.members.first();
        if (member) {
            try {
                await member.kick();
                message.channel.send(`${member.user.tag} was kicked.`);
                logAction('Kick', `${message.author.tag} kicked ${member.user.tag}.`);
            } catch (err) {
                message.channel.send('I do not have permission to kick this member.');
            }
        } else {
            message.channel.send('You need to mention a member to kick.');
        }
    }

    // Ban Command
    if (command === 'ban') {
        if (!message.member.permissions.has('BAN_MEMBERS')) {
            return message.reply('You do not have permissions to use this command');
        }
        const member = message.mentions.members.first();
        const reason = args.slice(1).join(' ') || 'No reason provided';
        if (member) {
            try {
                await member.ban({ reason });
                message.channel.send(`${member.user.tag} was banned. Reason: ${reason}`);
                logAction('Ban', `${message.author.tag} banned ${member.user.tag}. Reason: ${reason}`);
            } catch (err) {
                message.channel.send('I do not have permission to ban this member.');
            }
        } else {
            message.channel.send('You need to mention a member to ban.');
        }
    }

    // Mute Command
    if (command === 'mute') {
        if (!message.member.permissions.has('MANAGE_ROLES')) {
            return message.reply('You do not have permissions to use this command');
        }
        const member = message.mentions.members.first();
        const muteRole = message.guild.roles.cache.find(role => role.name === 'Muted');
        if (member) {
            try {
                await member.roles.add(muteRole);
                message.channel.send(`${member.user.tag} was muted.`);
                logAction('Mute', `${message.author.tag} muted ${member.user.tag}.`);
            } catch (err) {
                message.channel.send('I do not have permission to mute this member.');
            }
        } else {
            message.channel.send('You need to mention a member to mute.');
        }
    }

    // Unmute Command
    if (command === 'unmute') {
        if (!message.member.permissions.has('MANAGE_ROLES')) {
            return message.reply('You do not have permissions to use this command');
        }
        const member = message.mentions.members.first();
        const muteRole = message.guild.roles.cache.find(role => role.name === 'Muted');
        if (member) {
            try {
                await member.roles.remove(muteRole);
                message.channel.send(`${member.user.tag} was unmuted.`);
                logAction('Unmute', `${message.author.tag} unmuted ${member.user.tag}.`);
            } catch (err) {
                message.channel.send('I do not have permission to unmute this member.');
            }
        } else {
            message.channel.send('You need to mention a member to unmute.');
        }
    }

    // Create Role Command
    if (command === 'createrole') {
        if (!message.member.permissions.has('MANAGE_ROLES')) {
            return message.reply('You do not have permissions to use this command');
        }
        const roleName = args.join(' ');
        if (roleName) {
            try {
                const role = await message.guild.roles.create({ name: roleName, color: 'BLUE' });
                message.channel.send(`Role ${role.name} created.`);
                logAction('Create Role', `${message.author.tag} created role ${role.name}.`);
            } catch (err) {
                message.channel.send('I do not have permission to create a role.');
            }
        } else {
            message.channel.send('You need to specify a role name.');
        }
    }

    // Add Role Command
    if (command === 'addrole') {
        if (!message.member.permissions.has('MANAGE_ROLES')) {
            return message.reply('You do not have permissions to use this command');
        }
        const member = message.mentions.members.first();
        const roleName = args.slice(1).join(' ');
        const role = message.guild.roles.cache.find(role => role.name === roleName);
        if (member && role) {
            try {
                await member.roles.add(role);
                message.channel.send(`${role.name} role added to ${member.user.tag}.`);
                logAction('Add Role', `${message.author.tag} added role ${role.name} to ${member.user.tag}.`);
            } catch (err) {
                message.channel.send('I do not have permission to add roles.');
            }
        } else {
            message.channel.send('You need to mention a member and specify a role.');
        }
    }

    // Custom Command Example: Weather
    if (command === 'weather') {
        const location = args.join(' ');
        if (!location) return message.reply('Please specify a location.');
        const apiKey = 'YOUR_OPENWEATHERMAP_API_KEY';
        const url = `http://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.cod === '404') {
                message.channel.send('Location not found.');
            } else {
                const weather = `Weather in ${data.name}, ${data.sys.country}:
                - Temperature: ${data.main.temp}°C
                - Weather: ${data.weather[0].description}
                - Humidity: ${data.main.humidity}%
                - Wind Speed: ${data.wind.speed} m/s`;
                message.channel.send(weather);
            }
        } catch (err) {
            message.channel.send('Failed to fetch weather data.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
