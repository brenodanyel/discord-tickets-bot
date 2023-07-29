import { Client, Events, GatewayIntentBits } from "discord.js";
import "dotenv/config";
import "./src/guild-settings";
import { Tickets } from "./src/tickets";

const client = new Client({
    intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.Guilds],
});

client.on(Events.ClientReady, (bot) => {
    new Tickets(bot);
    console.log(`Bot iniciado ${bot.user.tag}.`);
});

client.login(process.env.BOT_TOKEN);

process.on("unhandledRejection", console.error);
