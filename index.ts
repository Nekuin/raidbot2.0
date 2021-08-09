import { Client, Intents } from "discord.js";
import dotenv from "dotenv";
dotenv.config();
import ClientHandler from "./src/ClientHandler";
import {
  raidSlashCommand,
  timeSlashCommand,
  bossSlashCommand,
} from "./src/command/commandUtils";
import {
  huutisServerConfig,
  pogoEspooServerConfig,
} from "./src/guild/guildConfigs";

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  ],
  partials: ["MESSAGE", "REACTION"],
});

client.on("ready", () => {
  console.log(new Date(), "Client ready");
  ClientHandler(client, huutisServerConfig);
  ClientHandler(client, pogoEspooServerConfig);
  // deploy slash commands
  deployCommands(client);
});

/**
 * Deploys slash commands to the server
 * @param client
 */
const deployCommands = async (client: Client) => {
  // start time command
  console.log(new Date(), "Deploying/updating commands...");
  const raidCmd = raidSlashCommand();
  const timeCmd = timeSlashCommand();
  const bossCmd = bossSlashCommand();
  try {
    await client.application?.commands.set([raidCmd, timeCmd, bossCmd]);
    console.log(new Date(), "Commands deployed/updated");
  } catch (error) {
    console.log(new Date(), "Error while deploying/updating commands", error);
  }
};

client.login(process.env.TOKEN);
