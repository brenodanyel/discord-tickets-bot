import { Client, Events, GatewayIntentBits } from 'discord.js';
import { Tickets } from './src/tickets';
import { TOKEN } from './settings';

const client = new Client({
  intents: [
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.Guilds,
  ]
});

client.on(Events.ClientReady, (bot) => {
  new Tickets(bot);
  console.log(`Bot iniciado ${bot.user.tag}.`);
});

client.login(TOKEN);

// process.on('unhandledRejection', console.error);
