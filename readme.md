## Discord tickets bot

Requisitos:

-   Node (v16 >)
-   Bot de discord configurado (https://discordpy.readthedocs.io/en/stable/discord.html)

Como usar:

-   Renomeie o arquivo `sample.env` para `.env`
-   Configure o token da sua aplicação no arquivo `.env`
-   Edite o arquivo `./src/guild-settings/guilds/1.ts` com as configurações do seu servidor e personalize as opções
-   Abra o terminal na raiz do projeto e instale as dependencias do projeto com o comando `npm install`
-   Execute o comando `npm start` para iniciar a aplicação.

Obs:
Caso você queira adicionar novos servidores no seu bot, duplique o arquivo `./src/guild-settings/guilds/1.ts`, coloque qualquer nome e edite as configurações.
