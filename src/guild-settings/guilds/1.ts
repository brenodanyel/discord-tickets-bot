import { GuildSettings } from "..";

export const GUILD_SETTINGS: GuildSettings = {
    ID: "1040336401142648842",
    TICKET_SETTINGS: {
        "PT-BR": {
            CHANNEL_IDS: {
                CREATE_NEW: "1134591969574785084", // Canal onde o usuário irá clicar para criar um novo ticket
                OPENED_CATEGORY: "1134592285741424793", // Categoria onde os tickets abertos serão criados
                CLOSED_CATEGORY: "1134592310580084917", // Categoria onde os tickets são movidos e trancados após serem fechados
                BACKUP_CHANNEL: "1134671541674725488", // Canal onde é feito o backup dos tickets fechados
            },
            PREDEFINED_MESSAGES: {
                TICKET_CHANNEL_MESSAGE_CONTENT: {
                    color: 0x0099ff,
                    title: "SUPORTE",
                    description: "Seja bem vindo ao suporte, selecione um assunto abaixo para que possamos te ajudar!",
                    placeholder: "Selecione um assunto",
                },
                CLOSE_TICKET_MESSAGE_CONTENT: {
                    color: 0xff0000,
                    title: "Encerrar Ticket",
                    description: "Caso já esteja satisfeito, você pode clicar no botão abaixo para finalizar o seu atendimento.",
                },
                TICKET_CREATED_MESSAGE_CONTENT: {
                    color: 0x0099ff,
                    description:
                        "Olá __USER__! este é o seu ticket, faça uma breve descrição sobre o assunto que deseja tratar e aguarde por um membro da equipe.",
                },
                TICKET_CLOSED_MESSAGE_CONTENT: {
                    title: "Ticket Encerrado",
                    color: 0xff0000,
                    description: "Este ticket foi encerrado por __USER__!",
                },
                TICKET_REOPENED_CONTENT: {
                    title: "Ticket Reaberto",
                    color: 0x0099ff,
                    description: "Este ticket foi reaberto por __USER__!",
                },
                CLOSED_TICKET_MESSAGE_SENT_TO_USER: "O seu ticket foi encerrado! Caso precise de mais ajuda, abra um novo ticket.",
                ALREADY_HAVE_A_TICKET: "Você já possui um ticket aberto sobre este assunto.",
                TICKET_CREATED_SUCCESSFULLY: "O seu ticket foi criado com sucesso!",
            },
            CATEGORIES: [
                {
                    label: "SUPORTE TÉCNICO",
                    description: "Selecione para receber suporte técnico",
                    value: "ticket_suporte_tecnico",
                    emoji: { name: "😂" },
                },
                {
                    label: "DENÚNCIA",
                    description: "Selecione para fazer denúncias",
                    value: "ticket_denuncia",
                    emoji: { name: "🥰" },
                },
                {
                    label: "DÚVIDAS",
                    description: "Selecione para tirar dúvidas",
                    value: "ticket_duvidas",
                    emoji: { name: "🫡" },
                },
                {
                    label: "CONTRIBUIÇÃO",
                    description: "Selecione para fazer contribuições",
                    value: "ticket_contribuicao",
                    emoji: { name: "🥶" },
                },
                {
                    label: "OUTROS",
                    description: "Falar sobre outros assuntos",
                    value: "ticket_outros",
                    emoji: { name: "🤬" },
                },
            ],
        },
    },
};
