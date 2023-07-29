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
                if (interaction.customId === "create_ticket") {
                    await this.handleTicketCreation(interaction as StringSelectMenuInteraction);
                }
                if (interaction.customId === "finish_ticket") {
                    await this.handleTicketClose(interaction as ButtonInteraction);
                }
                if (interaction.customId === "reopen_ticket") {
                    await this.handleTicketReopen(interaction as ButtonInteraction);
                }
                if (interaction.customId === "delete_ticket") {
                    await this.handleTicketDelete(interaction as ButtonInteraction);
                }
                if (interaction.customId === "backup_ticket") {
                    await this.handleBackupTicket(interaction as ButtonInteraction);
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

        const existentChannel = await this.findTicketByUserAndReason(interaction.guild, interaction.user.id, reason, variant);

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

        const channel = interaction.channel as TextChannel;

        if (!channel.topic) throw new Error("Topic not found!");

        const { userId, variant } = JSON.parse(channel.topic);

        const { TICKET_SETTINGS } = GetGuildSetting(interaction.guild.id);

        const settings = TICKET_SETTINGS[variant];
        if (!settings) throw new Error(`Settings for variant ${variant} not found!`);

        const parent = await interaction.guild.channels.fetch(settings.CHANNEL_IDS.CLOSED_CATEGORY).catch(() => null);
        if (!parent) throw new Error(`Parent category ${settings.CHANNEL_IDS.CLOSED_CATEGORY} not found!`);

        await channel.setParent(parent.id);

        const owner = await interaction.guild.members.fetch(userId).catch(() => null);

        if (owner) await channel.permissionOverwrites.edit(owner.id, { SendMessages: false, ViewChannel: false });

        await interaction.message.edit(this.getMessageTicketClosedContent(interaction.guild, interaction.user, variant, true));

        await this.handleBackupTicket(interaction);

        await interaction.editReply({ content: "ok" });
    }

    private async handleTicketReopen(interaction: ButtonInteraction) {
        if (!interaction.guild) return;
        if (!interaction.channel) return;

        const channel = interaction.channel as TextChannel;

        if (!channel.topic) throw new Error("Topic not found!");

        const { variant } = JSON.parse(channel.topic);

        const { TICKET_SETTINGS } = GetGuildSetting(interaction.guild.id);

        const settings = TICKET_SETTINGS[variant];
        if (!settings) throw new Error(`Settings for variant ${variant} not found!`);

        const parent = await interaction.guild.channels.fetch(settings.CHANNEL_IDS.OPENED_CATEGORY).catch(() => null);
        if (!parent) throw new Error(`Parent category ${settings.CHANNEL_IDS.OPENED_CATEGORY} not found!`);

        await channel.setParent(parent.id);

        await channel.permissionOverwrites.edit(interaction.user.id, { SendMessages: true, ViewChannel: true });

        await interaction.message.edit(this.getMessageTicketClosedContent(interaction.guild, interaction.user, variant, false));

        await channel.send(this.getMessageTicketReopenedContent(interaction.guild, interaction.user, variant));

        await channel.send(this.getMessageTicketCloseContent(interaction.guild, variant));

        await interaction.editReply({ content: "ok" });
    }

    private async handleTicketDelete(interaction: ButtonInteraction) {
        if (!interaction.guild) return;
        if (!interaction.channel) return;

        const channel = interaction.channel as TextChannel;

        setTimeout(() => {
            channel.delete("Ticket deleted by administrator.");
        }, 500);

        await interaction.editReply({ content: "ok" });
    }

    private async handleBackupTicket(interaction: ButtonInteraction) {
        if (!interaction.guild) return;
        if (!interaction.channel) return;

        const channel = interaction.channel as TextChannel;

        if (!channel.topic) throw new Error("Topic not found!");

        const { variant, userId } = JSON.parse(channel.topic);

        const { TICKET_SETTINGS } = GetGuildSetting(interaction.guild.id);

        const settings = TICKET_SETTINGS[variant];
        if (!settings) throw new Error(`Settings for variant ${variant} not found!`);

        const messages = await channel.messages.fetch({ limit: 100 });

        const output: string[] = [];

        messages.reverse().forEach((message) => {
            const attachments = message.attachments.map((attachment) => attachment.url).join("\n");

            const embeds = message.embeds
                .map((embed) => {
                    const fields = embed.fields.map((field) => `**${field.name}**\n${field.value}`).join("\n");
                    const infos: string[] = [];

                    if (embed.title) infos.push(embed.title);
                    if (embed.description) infos.push(embed.description);
                    if (fields) infos.push(fields);

                    return infos.join("\n\t");
                })
                .join("\n");

            const infos: string[] = [];

            const time = message.createdAt.toLocaleString("pt-BR");

            infos.push(`[${time}] ${message.author.tag} (${message.author.id}):`);

            if (message.content) infos.push("\t" + message.content);

            if (attachments) infos.push("\t" + attachments);

            if (embeds) infos.push("\t" + embeds);

            output.push(infos.join("\n"));
        });

        const buffer = Buffer.from(output.join("\n\n"));

        const owner = await interaction.guild.members.fetch(userId).catch(() => null);

        if (owner) {
            await owner
                .send({
                    content: settings.PREDEFINED_MESSAGES.CLOSED_TICKET_MESSAGE_SENT_TO_USER,
                    files: [
                        {
                            attachment: buffer,
                            name: new Date().toLocaleString("pt-BR") + ".txt",
                        },
                    ],
                })
                .catch(() => null);
        }

        const backupChannel = await interaction.guild.channels
            .fetch(settings.CHANNEL_IDS.BACKUP_CHANNEL)
            .then((channel) => channel as TextChannel)
            .catch(() => null);

        if (!backupChannel) throw new Error(`Backup channel ${settings.CHANNEL_IDS.BACKUP_CHANNEL} not found!`);

        await backupChannel
            .send({
                content: `O ticket "${channel.name}" (${channel.toString()}) foi fechado por ${interaction.user.toString()}, segue o backup:`,
                files: [
                    {
                        attachment: buffer,
                        name: new Date().toLocaleString("pt-BR") + ".txt",
                    },
                ],
            })
            .catch(() => null);

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
            name: `${category.emoji?.name}-${user.username}`,
            parent: parent.id,
            topic: JSON.stringify(topic),
        });

        const msg = await channel.send("@everyone");
        if (msg?.deletable) await msg.delete().catch(() => null);

        await channel.permissionOverwrites.edit(guild.id, { SendMessages: false, ViewChannel: false });
        await channel.permissionOverwrites.edit(user.id, { SendMessages: true, ViewChannel: true });

        await channel.send(this.getMessageTicketCreatedContent(guild, user, category.label, variant));
        await channel.send(this.getMessageTicketCloseContent(guild, variant));

        return channel;
    }

    private async findTicketByUserAndReason(guild: Guild, userId: string, reason: string, variant: string) {
        const channels = await guild.channels.fetch();

        const { TICKET_SETTINGS } = GetGuildSetting(guild.id);

        const settings = TICKET_SETTINGS[variant];
        if (!settings) throw new Error(`Settings for variant ${variant} not found!`);

        const channel = channels.find((channel) => {
            if (!channel) return false;
            if (channel.type !== 0) return false;
            if (!channel.topic) return false;

            if (channel.parentId !== settings.CHANNEL_IDS.OPENED_CATEGORY) return false;

            const topic = JSON.parse(channel.topic);
            if (topic.userId !== userId) return false;
            if (topic.reason !== reason) return false;

            return true;
        });

        return channel;
    }

    private async setupTicketCreationChannel(guild: OAuth2Guild) {
        try {
            const { TICKET_SETTINGS } = GetGuildSetting(guild.id);

            for (const [variant, settings] of Object.entries(TICKET_SETTINGS)) {
                try {
                    const channelID = settings.CHANNEL_IDS.CREATE_NEW;

                    const channel = await this.bot.channels
                        .fetch(channelID)
                        .then((channel) => channel as TextChannel)
                        .catch(() => null);

                    if (!channel) throw new Error('Canal de tickets ("CREATE_NEW") não encontrado!');

                    await channel.permissionOverwrites.edit(guild.id, { SendMessages: false, AddReactions: false });

                    channel.setTopic(JSON.stringify({ variant }));

                    await channel.bulkDelete(100).catch(() => null);

                    await channel.send(this.getTicketMessageCreationContent(guild.id, variant));
                } catch (e: any) {
                    console.log(`Erro ao configurar ticket '${variant}' da guild '${guild.name}' ('${guild.id}')!`);
                    console.log(e.message || "Erro desconhecido!");
                }
            }
        } catch (e: any) {
            console.log(`Erro ao configurar tickets da guild '${guild.name}' ('${guild.id}')!`);
            console.log(e.message || "Erro desconhecido!");
        }
    }

    private getTicketMessageCreationContent(guildId: string, variant: string) {
        const { TICKET_SETTINGS } = GetGuildSetting(guildId);

        const settings = TICKET_SETTINGS[variant];
        if (!settings) throw new Error(`Ticket variant '${variant}' not found!`);

        const embed = new EmbedBuilder()
            .setColor(settings.PREDEFINED_MESSAGES.TICKET_CHANNEL_MESSAGE_CONTENT.color)
            .setTitle(settings.PREDEFINED_MESSAGES.TICKET_CHANNEL_MESSAGE_CONTENT.title)
            .setDescription(settings.PREDEFINED_MESSAGES.TICKET_CHANNEL_MESSAGE_CONTENT.description);

        const builder = new StringSelectMenuBuilder()
            .setCustomId("create_ticket")
            .setPlaceholder(settings.PREDEFINED_MESSAGES.TICKET_CHANNEL_MESSAGE_CONTENT.placeholder)
            .addOptions(...settings.CATEGORIES);

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(builder);

        return {
            embeds: [embed],
            components: [row],
        };
    }

    private getMessageTicketCreatedContent(guild: Guild, user: User, category: string, variant: string) {
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

    private getMessageTicketReopenedContent(guild: Guild, user: User, variant: string) {
        const { TICKET_SETTINGS } = GetGuildSetting(guild.id);

        const settings = TICKET_SETTINGS[variant];
        if (!settings) throw new Error(`Ticket variant '${variant}' not found!`);

        const embed = new EmbedBuilder()
            .setColor(settings.PREDEFINED_MESSAGES.TICKET_REOPENED_CONTENT.color)
            .setTitle(settings.PREDEFINED_MESSAGES.TICKET_REOPENED_CONTENT.title)
            .setDescription(settings.PREDEFINED_MESSAGES.TICKET_REOPENED_CONTENT.description.replace("__USER__", user.toString()));

        return {
            embeds: [embed],
        };
    }

    private getMessageTicketClosedContent(guild: Guild, user: User, variant: string, includeButtons: boolean) {
        const { TICKET_SETTINGS } = GetGuildSetting(guild.id);

        const settings = TICKET_SETTINGS[variant];
        if (!settings) throw new Error(`Ticket variant '${variant}' not found!`);

        const embed = new EmbedBuilder()
            .setColor(settings.PREDEFINED_MESSAGES.TICKET_CLOSED_MESSAGE_CONTENT.color)
            .setTitle(settings.PREDEFINED_MESSAGES.TICKET_CLOSED_MESSAGE_CONTENT.title)
            .setDescription(settings.PREDEFINED_MESSAGES.TICKET_CLOSED_MESSAGE_CONTENT.description.replace("__USER__", user.toString()));

        const result = {
            embeds: [embed],
            components: [],
        } as any;

        if (includeButtons) {
            const reopenButton = new ButtonBuilder()
                .setCustomId("reopen_ticket") //
                .setLabel("Reabrir ticket")
                .setEmoji("🔓")
                .setStyle(ButtonStyle.Success);

            const deleteButton = new ButtonBuilder()
                .setCustomId("delete_ticket") //
                .setLabel("Excluir ticket")
                .setEmoji("🗑️")
                .setStyle(ButtonStyle.Danger);

            const backupButton = new ButtonBuilder()
                .setCustomId("backup_ticket") //
                .setLabel("Backup ticket")
                .setEmoji("📥")
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder<ButtonBuilder>();
            row.addComponents(reopenButton).addComponents(deleteButton).addComponents(backupButton);

            result.components.push(row);
        }

        return result;
    }

    private getMessageTicketCloseContent(guild: Guild, variant: string) {
        const { TICKET_SETTINGS } = GetGuildSetting(guild.id);

        const settings = TICKET_SETTINGS[variant];
        if (!settings) throw new Error(`Ticket variant '${variant}' not found!`);

        const embed = new EmbedBuilder()
            .setColor(settings.PREDEFINED_MESSAGES.CLOSE_TICKET_MESSAGE_CONTENT.color)
            .setTitle(settings.PREDEFINED_MESSAGES.CLOSE_TICKET_MESSAGE_CONTENT.title)
            .setDescription(settings.PREDEFINED_MESSAGES.CLOSE_TICKET_MESSAGE_CONTENT.description);

        const finishButton = new ButtonBuilder()
            .setCustomId("finish_ticket")
            .setLabel(settings.PREDEFINED_MESSAGES.CLOSE_TICKET_MESSAGE_CONTENT.title)
            .setEmoji("🔒")
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(finishButton);

        return {
            embeds: [embed],
            components: [row],
        };
    }
}
