import {
    APISelectMenuOption,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChannelType,
    Client,
    EmbedBuilder,
    Guild,
    MessageCreateOptions,
    MessageEditOptions,
    OAuth2Guild,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    TextChannel,
    User,
} from "discord.js";
import { GetGuildSetting } from "./guild-settings";

export class Tickets {
    constructor(private bot: Client) {
        this.setup();
    }

    private async setup() {
        const guilds = await this.bot.guilds.fetch().catch(() => []);
        guilds.forEach((guild) => this.setupTicketCreationChannel(guild));

        this.bot.on("interactionCreate", async (interaction) => {
            if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

            await interaction.deferReply({ ephemeral: true });

            try {
                if (interaction.customId === "ticket_creation") {
                    await this.handleTicketCreation(interaction as StringSelectMenuInteraction);
                }
                if (interaction.customId === "finish_ticket") {
                    await this.handleTicketClose(interaction as ButtonInteraction);
                }
            } catch (e) {
                console.error(e);
                await interaction.editReply({ content: "An error has occurred!" });
            }
        });
    }

    private async handleTicketCreation(interaction: StringSelectMenuInteraction) {
        const [reason] = interaction.values;

        if (!interaction.guild) return;
        if (!interaction.channel) return;

        const topic = (interaction.channel as TextChannel).topic;
        if (!topic) throw new Error("Topic not found!");

        const { variant } = JSON.parse(topic);

        const { TICKET_SETTINGS } = GetGuildSetting(interaction.guild.id);

        const settings = TICKET_SETTINGS[variant];
        if (!settings) throw new Error(`Settings for variant ${variant} not found!`);

        const category = settings.CATEGORIES.find((category) => category.value === reason);
        if (!category) throw new Error(`Category ${reason} not found!`);

        const existentChannel = await this.findTicketByUserAndReason(interaction.guild, interaction.user.id, reason);

        if (existentChannel) {
            interaction.editReply({ content: settings.PREDEFINED_MESSAGES.ALREADY_HAVE_A_TICKET + " (" + existentChannel.toString() + ")" });
            return;
        }

        const channel = await this.createTicket(interaction.guild, interaction.user, category, variant);

        interaction.editReply({ content: settings.PREDEFINED_MESSAGES.TICKET_CREATED_SUCCESSFULLY + " (" + channel.toString() + ")" });
    }

    private async handleTicketClose(interaction: ButtonInteraction) {
        if (!interaction.guild) return;
        if (!interaction.channel) return;

        const topic = (interaction.channel as TextChannel).topic;
        if (!topic) throw new Error("Topic not found!");

        const { variant } = JSON.parse(topic);

        const { TICKET_SETTINGS } = GetGuildSetting(interaction.guild.id);

        const settings = TICKET_SETTINGS[variant];
        if (!settings) throw new Error(`Settings for variant ${variant} not found!`);

        const parent = await interaction.guild.channels.fetch(settings.CHANNEL_IDS.CLOSED_CATEGORY).catch(() => null);
        if (!parent) throw new Error(`Parent category ${settings.CHANNEL_IDS.CLOSED_CATEGORY} not found!`);

        const channel = interaction.channel as TextChannel;

        await channel.setParent(parent.id);

        await channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: null });

        await interaction.message.edit(this.getMessageTicketClosedContent(interaction.guild, interaction.user, variant));

        await interaction.editReply({ content: "ok" });
    }

    private async createTicket(guild: Guild, user: User, category: APISelectMenuOption, variant: string) {
        const { TICKET_SETTINGS } = GetGuildSetting(guild.id);

        const settings = TICKET_SETTINGS[variant];
        if (!settings) throw new Error(`Settings for variant ${variant} not found!`);

        const parent = await guild.channels.fetch(settings.CHANNEL_IDS.OPENED_CATEGORY).catch(() => null);
        if (!parent) throw new Error(`Parent category ${settings.CHANNEL_IDS.OPENED_CATEGORY} not found!`);

        const topic = {
            userId: user.id,
            reason: category.value,
            variant,
        };

        const channel: TextChannel = await guild.channels.create({
            type: ChannelType.GuildText,
            name: `${category.emoji?.name}-${user.tag}`,
            parent: parent.id,
            topic: JSON.stringify(topic),
        });

        await channel.permissionOverwrites.edit(guild.id, { ViewChannel: false });
        await channel.permissionOverwrites.edit(user.id, { ViewChannel: true });

        await channel.send(this.getMessageTicketCreatedContent(guild, user, category.label, variant));
        await channel.send(this.getMessageTicketCloseContent(guild, variant));

        return channel;
    }

    private async findTicketByUserAndReason(guild: Guild, userId: string, reason: string) {
        const channels = await guild.channels.fetch();

        const channel = channels.find((channel) => {
            // todo: verificar se o ticket está aberto ou fechado, se está fechado retorna false

            if (!channel) return false;
            if (channel.type !== 0) return false;
            if (!channel.topic) return false;

            const topic = JSON.parse(channel.topic);
            if (topic.userId !== userId) return false;
            if (topic.reason !== reason) return false;

            return true;
        });

        return channel;
    }

    private async setupTicketCreationChannel(guild: OAuth2Guild) {
        const { TICKET_SETTINGS } = GetGuildSetting(guild.id);

        for (const [variant, settings] of Object.entries(TICKET_SETTINGS)) {
            try {
                const channelID = settings.CHANNEL_IDS.CREATE_NEW;

                const channel = await this.bot.channels
                    .fetch(channelID)
                    .then((channel) => channel as TextChannel)
                    .catch(() => null);

                if (!channel) throw new Error('Canal de tickets ("CREATE_NEW") não encontrado!');

                await channel.permissionOverwrites.edit(guild.id, {
                    SendMessages: false,
                    AddReactions: false,
                });

                channel.setTopic(JSON.stringify({ variant }));

                await channel.bulkDelete(100).catch(() => null);

                await channel.send(this.getTicketMessageCreationContent(guild.id, variant));
            } catch (e: any) {
                console.log(`Erro ao configurar ticket '${variant}' da guild '${guild.name}' ('${guild.id}')!`);
                console.log(e.message || "Erro desconhecido!");
            }
        }
    }

    private getTicketMessageCreationContent(guildId: string, variant: string): MessageCreateOptions {
        const { TICKET_SETTINGS } = GetGuildSetting(guildId);

        const settings = TICKET_SETTINGS[variant];
        if (!settings) throw new Error(`Ticket variant '${variant}' not found!`);

        const embed = new EmbedBuilder()
            .setColor(settings.PREDEFINED_MESSAGES.TICKET_CHANNEL_MESSAGE_CONTENT.color)
            .setTitle(settings.PREDEFINED_MESSAGES.TICKET_CHANNEL_MESSAGE_CONTENT.title)
            .setDescription(settings.PREDEFINED_MESSAGES.TICKET_CHANNEL_MESSAGE_CONTENT.description);

        const builder = new StringSelectMenuBuilder()
            .setCustomId("ticket_creation")
            .setPlaceholder(settings.PREDEFINED_MESSAGES.TICKET_CHANNEL_MESSAGE_CONTENT.placeholder)
            .addOptions(...settings.CATEGORIES);

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(builder);

        return {
            embeds: [embed],
            components: [row],
        };
    }

    private getMessageTicketCreatedContent(guild: Guild, user: User, category: string, variant: string): MessageCreateOptions {
        const { TICKET_SETTINGS } = GetGuildSetting(guild.id);

        const settings = TICKET_SETTINGS[variant];
        if (!settings) throw new Error(`Ticket variant '${variant}' not found!`);

        const embed = new EmbedBuilder()
            .setColor(settings.PREDEFINED_MESSAGES.TICKET_CREATED_MESSAGE_CONTENT.color)
            .setTitle(`Ticket (${category})`)
            .setDescription(settings.PREDEFINED_MESSAGES.TICKET_CREATED_MESSAGE_CONTENT.description.replace("__USER__", user.toString()));

        return {
            embeds: [embed],
        };
    }
    private getMessageTicketClosedContent(guild: Guild, user: User, variant: string): MessageEditOptions {
        const { TICKET_SETTINGS } = GetGuildSetting(guild.id);

        const settings = TICKET_SETTINGS[variant];
        if (!settings) throw new Error(`Ticket variant '${variant}' not found!`);

        const embed = new EmbedBuilder()
            .setColor(settings.PREDEFINED_MESSAGES.TICKET_CLOSED_MESSAGE_CONTENT.color)
            .setTitle(settings.PREDEFINED_MESSAGES.TICKET_CLOSED_MESSAGE_CONTENT.title)
            .setDescription(settings.PREDEFINED_MESSAGES.TICKET_CLOSED_MESSAGE_CONTENT.description.replace("__USER__", user.toString()));

        return {
            embeds: [embed],
            components: [],
        };
    }

    private getMessageTicketCloseContent(guild: Guild, variant: string): MessageCreateOptions {
        const { TICKET_SETTINGS } = GetGuildSetting(guild.id);

        const settings = TICKET_SETTINGS[variant];
        if (!settings) throw new Error(`Ticket variant '${variant}' not found!`);

        const embed = new EmbedBuilder()
            .setColor(settings.PREDEFINED_MESSAGES.CLOSE_TICKET_MESSAGE_CONTENT.color)
            .setTitle(settings.PREDEFINED_MESSAGES.CLOSE_TICKET_MESSAGE_CONTENT.title)
            .setDescription(settings.PREDEFINED_MESSAGES.CLOSE_TICKET_MESSAGE_CONTENT.description);

        const builder = new ButtonBuilder()
            .setCustomId("finish_ticket")
            .setLabel(settings.PREDEFINED_MESSAGES.CLOSE_TICKET_MESSAGE_CONTENT.title)
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(builder);

        return {
            embeds: [embed],
            components: [row],
        };
    }
}
