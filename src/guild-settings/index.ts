import { APISelectMenuOption } from "discord.js";
import fs from "node:fs";

export interface TicketSettings {
    CHANNEL_IDS: {
        CREATE_NEW: string;
        OPENED_CATEGORY: string;
        CLOSED_CATEGORY: string;
        BACKUP_CHANNEL: string;
    };
    PREDEFINED_MESSAGES: {
        TICKET_CHANNEL_MESSAGE_CONTENT: {
            color: number;
            title: string;
            description: string;
            placeholder: string;
        };
        TICKET_CREATED_MESSAGE_CONTENT: {
            color: number;
            description: string;
        };
        TICKET_CLOSED_MESSAGE_CONTENT: {
            color: number;
            description: string;
            title: string;
        };
        CLOSE_TICKET_MESSAGE_CONTENT: {
            title: string;
            color: number;
            description: string;
        };
        CLOSED_TICKET_MESSAGE_SENT_TO_USER: string;
        TICKET_REOPENED_CONTENT: {
            title: string;
            color: number;
            description: string;
        };
        ALREADY_HAVE_A_TICKET: string;
        TICKET_CREATED_SUCCESSFULLY: string;
    };
    CATEGORIES: APISelectMenuOption[];
}

export interface GuildSettings {
    ID: string;
    TICKET_SETTINGS: { [key: string]: TicketSettings };
}

const GUILD_SETTINGS: { [key: string]: GuildSettings } = {};

export function GetGuildSetting(guildId: string) {
    if (!GUILD_SETTINGS[guildId]) {
        throw new Error(`Guild ${guildId} not found!`);
    }

    return GUILD_SETTINGS[guildId];
}

(async function bootstrap() {
    const guilds = fs.readdirSync(__dirname + "/guilds");

    for (const guild of guilds) {
        const module = await import("./guilds/" + guild);

        if (module.GUILD_SETTINGS.ID) {
            GUILD_SETTINGS[module.GUILD_SETTINGS.ID] = module.GUILD_SETTINGS;
        }
    }

    console.log("Guild settings loaded!");
})();
