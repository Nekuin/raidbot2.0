import { ApplicationCommandData, ApplicationCommandOption } from "discord.js";

/**
 * Creates the raid slash command.
 * option names have to be lower case!
 * @returns
 */
const raidSlashCommand = (): ApplicationCommandData => {
  const startTime: ApplicationCommandOption = {
    name: "aika",
    type: "STRING",
    description: "Raidin aika, esim. 12:00",
    required: true,
  };
  const boss: ApplicationCommandOption = {
    name: "pomo",
    type: "STRING",
    description: "Raidin pomo, esim. Mewtwo",
    required: true,
  };

  const location: ApplicationCommandOption = {
    name: "paikka",
    type: "STRING",
    description: "Raidin paikka, esim. Suvelan Tammi",
    required: true,
  };

  const data: ApplicationCommandData = {
    name: "raid",
    description: "Luo uuden raidin",
    options: [startTime, boss, location],
  };
  return data;
};

/**
 * Creates the "time" slash command.
 * option names have to be lower case!
 * @returns
 */
const timeSlashCommand = (): ApplicationCommandData => {
  const location: ApplicationCommandOption = {
    name: "paikka",
    type: "STRING",
    description: "Raidin paikka, esim. Suvelan Tammi",
    required: true,
  };
  const startTime: ApplicationCommandOption = {
    name: "aika",
    type: "STRING",
    description: "Raidin uusi aika, esim. 13:00",
    required: true,
  };
  const data: ApplicationCommandData = {
    name: "aika",
    description: "Muokkaa aikaa olemassa olevaan raidiin",
    options: [startTime, location],
  };
  return data;
};

/**
 * Creates the "boss" slash command.
 * option names have to be lower case!
 * @returns
 */
const bossSlashCommand = (): ApplicationCommandData => {
  const location: ApplicationCommandOption = {
    name: "paikka",
    type: "STRING",
    description: "Raidin paikka, esim. Suvelan Tammi",
    required: true,
  };

  const boss: ApplicationCommandOption = {
    name: "pomo",
    type: "STRING",
    description: "Raidin pomo, esim. Mewtwo",
    required: true,
  };

  const data: ApplicationCommandData = {
    name: "boss",
    description: "Muokkaa pomoa olemassa olevaan raidiin",
    options: [boss, location],
  };
  return data;
};

export { raidSlashCommand, timeSlashCommand, bossSlashCommand };
