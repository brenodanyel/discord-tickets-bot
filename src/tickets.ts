import {
  ActionRowBuilder,
  Client,
  EmbedBuilder,
  Events,
  Guild,
  Message,
  MessageCreateOptions,
  SelectMenuBuilder,
  TextChannel,
  SelectMenuInteraction,
  APISelectMenuOption,
  ChannelType,
  CategoryChannel,
  User,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

import {
  TICKET_CHANNEL_ID,
  GUILD_ID,
  TICKET_MESSAGE_ID,
  TICKET_CATEGORIES,
  TICKET_CHANNEL_MESSAGE_CONTENT,
  TICKETS_OPENED_CATEGORY,
  TICKETS_CLOSED_CATEGORY,
} from '../settings';

export class Tickets {
  constructor(
    private bot: Client
  ) {
    this.setup();
  }

  private async setup(): Promise<void> {
    await this.checkMessage();

    this.bot.on(Events.InteractionCreate, (interaction) => {
      if (!interaction.isSelectMenu()) {
        return;
      }

      this.handleInteraction(interaction);
    });
  }

  private async handleInteraction(interaction: SelectMenuInteraction): Promise<boolean> {
    if (interaction.customId === 'ticket_creation') {
      await this.handleTicketCreation(interaction);
      return true;
    }

    return false;
  }

  private async handleTicketCreation(interaction: SelectMenuInteraction): Promise<void> {
    const [reason] = interaction.values;

    const category = this.findCategoryByReason(reason);

    if (!category) {
      return;
    }

    if (!interaction.guild) {
      return;
    }

    const existentChannel = await this.findTicketByUserAndReason(interaction.guild, interaction.user.id, category.label);

    if (existentChannel) {
      interaction.reply({
        content: `Você já possui um ticket aberto sobre este assunto (${existentChannel})`,
        ephemeral: true,
      });
      return;
    }

    const channel = await this.createTicket(interaction.guild, interaction.user, category);

    interaction.reply({
      content: `O seu ticket acabou de ser criado (${channel})`,
      ephemeral: true,
    });
  }

  private async createTicket(guild: Guild, user: User, category: APISelectMenuOption) {
    const parent = await this.getTicketCategoryChannel(guild, 'OPENED');

    const topic = {
      userId: user.id,
      reason: category.label,
    };

    const channel = await guild.channels.create({
      type: ChannelType.GuildText,
      name: `${category.emoji?.name}-${user.tag}`,
      parent,
      topic: JSON.stringify(topic),
      permissionOverwrites: [],
    }) as TextChannel;

    const content = this.getMessageTicketCreatedContent(user, category.label);

    await channel.send(content);

    await this.sendTicketCloseMessage(channel);

    return channel;
  }

  private async sendTicketCloseMessage(channel: TextChannel) {
    const content = this.getMessageTicketCloseContent();
    await channel.send(content);
  }

  private async getTicketCategoryChannel(guild: Guild, method: 'OPENED' | 'CLOSED'): Promise<CategoryChannel> {
    const id = method === 'OPENED'
      ? TICKETS_OPENED_CATEGORY
      : TICKETS_CLOSED_CATEGORY;

    const name = method === 'OPENED'
      ? 'Tickets Abertos'
      : 'Tickets Fechados';

    try {
      const existentChannel = await guild.channels.fetch(id);

      if (existentChannel?.type !== 4) {
        throw new Error();
      }

      return existentChannel;
    }
    catch {
      const channel = await guild.channels.create({ type: ChannelType.GuildCategory, name });
      return channel;
    }
  }

  private async findTicketByUserAndReason(guild: Guild, userId: string, reason: string): Promise<TextChannel | null> {
    const channels = await guild.channels.fetch();
    const channel = channels.find((channel) => {
      if (channel?.type !== 0) {
        return false;
      };

      const topic = JSON.parse(channel.topic || '{}');

      if (topic.userId !== userId) {
        return false;
      }

      if (topic.reason !== reason) {
        return false;
      }

      return true;
    });

    return channel as TextChannel;
  }

  private findCategoryByReason(reason: string) {
    return TICKET_CATEGORIES.find((category) => category.value === reason);
  }

  private async checkMessage(): Promise<void> {
    try {
      const guild = await this.bot.guilds.fetch(GUILD_ID).catch(() => { }) as Guild;

      if (!guild) {
        console.log('Erro: Guild não encontrada!');
        return;
      }

      const channel = await guild.channels.fetch(TICKET_CHANNEL_ID).catch(() => { }) as TextChannel;

      if (!channel) {
        console.log('Erro: Canal de tickets não encontrado!');
        return;
      }

      const message = await channel.messages.fetch(TICKET_MESSAGE_ID).catch(() => { }) as Message;

      const content = this.getTicketMessageCreationContent();

      if (message) {
        await message.edit(content);
      } else {
        await channel.send(content);
      }

      console.log('Ticket configurado com sucesso!');
    }
    catch (e) {
      console.log(e);
    }
  }

  private getTicketMessageCreationContent(): MessageCreateOptions {
    const embed = new EmbedBuilder();
    embed.setColor(TICKET_CHANNEL_MESSAGE_CONTENT.color);
    embed.setTitle(TICKET_CHANNEL_MESSAGE_CONTENT.title);
    embed.setDescription(TICKET_CHANNEL_MESSAGE_CONTENT.description);

    const builder = new SelectMenuBuilder();
    builder.setCustomId('ticket_creation');
    builder.setPlaceholder('Selecione um assunto');
    builder.addOptions(...TICKET_CATEGORIES);

    const row = new ActionRowBuilder<SelectMenuBuilder>();
    row.addComponents(builder);

    return {
      embeds: [embed],
      components: [row],
    };
  }

  private getMessageTicketCreatedContent(user: User, category: string): MessageCreateOptions {
    const embed = new EmbedBuilder();
    embed.setColor(0x0099FF);
    embed.setTitle(`Ticket (${category})`);
    embed.setDescription(`Olá ${user}! este é o seu ticket, faça uma breve descrição sobre o assunto que deseja tratar e aguarde por um membro da equipe.`);

    return {
      embeds: [embed],
    };
  }

  private getMessageTicketCloseContent(): MessageCreateOptions {
    const embed = new EmbedBuilder();
    embed.setColor(0xFF0000);
    embed.setTitle('Encerrar Ticket');
    embed.setDescription('Caso já esteja satisfeito, você pode clicar no botão abaixo para finalizar o seu atendimento.');

    const builder = new ButtonBuilder();
    builder.setCustomId('finish_ticket');
    builder.setLabel('Encerrar ticket');
    builder.setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>();
    row.addComponents(builder);

    return {
      embeds: [embed],
      components: [row],
    };
  }
}
