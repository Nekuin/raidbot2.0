import {
  Guild,
  Message,
  MessageEmbed,
  PartialUser,
  User,
  PartialMessage,
  TextChannel,
} from "discord.js";
import _ from "lodash";
import { ServerConfig, SignupEmoji } from "../guild/guildConfigs";

type NewRaid = {
  messageId: string;
  raidObject: any;
};

type Raid = {
  time: string;
  location: string;
  boss: string;
  raiders: Array<Raider>;
  message: Message | PartialMessage | null;
};

type Raider = {
  name: string;
  userId: string;
  remote: boolean;
};

type RaidMap = {
  [key: string]: Raid;
};

/**
 * Creates a new raidObject from users message.
 * @param message
 * @returns
 */
const newRaid = (message: Message, server: ServerConfig): Promise<NewRaid> => {
  return new Promise((resolve, reject) => {
    const splitContent: Array<string> = message.content.split(" ");
    // expect length to be more than 2,
    // index 1 = time,
    // index 2 = boss,
    // index 3 to splitContent.length = location
    if (splitContent.length > 3) {
      const time = splitContent[1];
      const boss = splitContent[2];
      const location = splitContent
        .reduce((str, curr, i) => {
          if (i > 2) {
            str += curr + " ";
          }
          return str;
        }, "")
        .trim();
      // validate time, boss and location
      if (_.isEmpty(time) || _.isEmpty(boss) || _.isEmpty(location)) {
        sendInstructionMessage(message);
        reject("Time, boss or location was empty");
        return;
      }
      // construct new raid
      const raidObject: Raid = {
        time: time,
        location: location,
        boss: boss,
        raiders: [],
        message: null,
      };
      // send raidMessage
      raidMessage(raidObject, message.channel as TextChannel, server)
        .then((sentMessage: Message) => {
          const sentId = sentMessage.id;
          console.log(
            new Date().toLocaleString(),
            server.guildName,
            "Created new raid",
            raidObject,
            "in channel",
            message.channel.id
          );
          raidObject.message = sentMessage;
          resolve({ messageId: sentId, raidObject });
        })
        .catch((error) => {
          reject(error);
        });
    } else {
      reject(new Error("Somethings wrong with the message " + message.content));
      // send instruction message to user
      sendInstructionMessage(message);
    }
  });
};

/**
 * Sends a new raid message, which is an embed message
 * with "Aika", "Boss" and "Paikka" fields.
 * Uses the data from a raidObject.
 * Adds +1 +2 +3 reactions to the message, which can be used to sign
 * up for the raid.
 * @param raidObject
 * @param message
 * @returns
 */
const raidMessage = (
  raidObject: Raid,
  channel: TextChannel,
  server: ServerConfig
): Promise<Message> => {
  return new Promise((resolve, reject) => {
    const embed = raidAsEmbed(raidObject);
    channel
      .send({ embeds: [embed] })
      .then((sentMessage: Message) => {
        // add reactions
        Object.values(server.signupEmojis).forEach((emojiKey) =>
          sentMessage.react(emojiKey)
        );
        // add remote reactions
        if (server.remoteEmojis) {
          Object.values(server.remoteEmojis).forEach((remoteKey) =>
            sentMessage.react(remoteKey)
          );
        }
        resolve(sentMessage);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

/**
 * Edits an existing raid message with new embed data.
 * @param raid
 * @param existingMessage
 */
const editRaidMessage = (
  raid: Raid,
  existingMessage: Message | PartialMessage
): Promise<Message> => {
  return new Promise((resolve) => {
    const embed = raidAsEmbed(raid);
    resolve(existingMessage.edit({ embeds: [embed] }));
  });
};

/**
 * Creates a MessageEmbed object from a Raid object.
 * Adds fields for Boss, Time, Location and raider list.
 * @param raid
 * @returns
 */
const raidAsEmbed = (raid: Raid): MessageEmbed => {
  const raiderString = raid.raiders.reduce((str, raider, i) => {
    str +=
      i +
      1 +
      ". " +
      (raider.name + (raider.remote === true ? " (etä)" : "")) +
      "\n";
    return str;
  }, "");
  const signedUpString =
    raiderString.length > 0 ? raiderString.trim() : "Ei ilmoittautuneita";
  return new MessageEmbed()
    .addField("Aika", raid.time, true)
    .addField("Boss", raid.boss, true)
    .addField("Paikka", raid.location)
    .addField("Ilmoittautuneet", signedUpString)
    .setTimestamp()
    .setFooter("Kysy apua: !help");
};

/**
 * Attempts to find a raid by a location name.
 * The location is used as the identifier when editing a raids data
 * after it's been submitted.
 * @param raids
 * @param location
 */
const findRaidByLocation = (
  raids: RaidMap,
  location: string
): Message | PartialMessage | false => {
  const keys = Object.keys(raids);
  for (const key of keys) {
    const raid = raids[key];
    if (raid.location === location && raid.message) {
      return raid.message;
    }
  }
  return false;
};

/**
 * Keys in SignupEmojis are numbers, and should always
 * map to the sign up count of the reaction emoji.
 * @param emojiId
 * @param emojiObject
 */
const signCountFromEmoji = (
  emojiId: string,
  emojiObject: SignupEmoji
): number | null => {
  const keys = Object.keys(emojiObject) as unknown as Array<
    keyof typeof emojiObject
  >;
  for (const emojiKey of keys) {
    const emojiVal = emojiObject[emojiKey];
    if (emojiId === emojiVal) {
      return _.toNumber(emojiKey);
    }
  }
  return null;
};

/**
 * Signs a user count times to a raid, automatically finds their nickname/username from
 * the user data. Returns the edited raid.
 * If remote isn't passed, set remote as false to the raider.
 * @param server
 * @param raid
 * @param user
 * @param count
 * @param remote
 * @returns
 */
const signUserToRaid = (
  server: Guild,
  raid: Raid,
  user: User | PartialUser,
  count: number,
  remote?: boolean
): Raid => {
  const displayName = userDisplayName(user, server);
  const raiders = [...raid.raiders];
  for (let i = 0; i < count; i++) {
    raiders.push({
      name: displayName,
      remote: remote === true,
      userId: user.id,
    });
  }
  return { ...raid, raiders: raiders };
};

/**
 * Removes a user from raid count times, automatically finds their nickname/username from
 * the user data. Returns the edited raid.
 * @param raid
 * @param user
 * @param count
 * @param remote
 */
const removeUserFromRaid = (
  raid: Raid,
  user: User | PartialUser,
  count: number,
  remote: boolean
): Raid => {
  const raiders = [...raid.raiders];
  for (let i = 0; i < count; i++) {
    const foundIndex = raiders.findIndex(
      (raider) => raider.userId === user.id && raider.remote === remote
    );
    if (foundIndex > -1) {
      raiders.splice(foundIndex, 1);
    }
  }
  return { ...raid, raiders: raiders };
};

/**
 * Returns users nickname if set, or their displayName if member was found.
 * If member wasn't found, returns their username if set, otherwise returns "Unknown".
 * @param user
 * @param server
 * @returns
 */
const userDisplayName = (user: User | PartialUser, server: Guild): string => {
  const member = server.members.cache.get(user.id);
  if (member) {
    return member.nickname !== null ? member.nickname : member.displayName;
  }
  return user.username ?? "Unknown";
};

/**
 * Sends instructions to the user on an invalid raid creation message.
 * @param message
 */
const sendInstructionMessage = (message: Message) => {
  message.author.createDM().then((channel) => {
    const instructions =
      "Jotain puuttui !raid komennostasi...\n```" +
      message.content +
      "```\n" +
      "Koita näin:```!raid AIKA BOSS PAIKKA\n!raid 12:00 mew Suvelan Tammi```\n" +
      "Something was missing from your !raid command...\nTry this:\n```!raid TIME BOSS LOCATION```\n\n" +
      "Yleisin syy komennon toimimattomuuteen on extra välilyönti.\n" +
      "The most common problem with the command is an extra space character.";
    channel.send(instructions);
  });
};

/**
 * Sends instructions to a user on an invalid time command
 * @param message
 */
const sendTimeInstructionMessage = (message: Message) => {
  message.author
    .createDM()
    .then((channel) => {
      const instructions =
        "Aika komentosi oli väärin!\n" +
        "```" +
        message.content +
        " ```\n" +
        "Koita näin:\n" +
        "```!aika AIKA PAIKKA```\n" +
        "Try this:\n" +
        "```!aika AIKA PAIKKA ```";
      channel.send(instructions).catch((error) => {
        console.log(new Date(), "Error while sending time instructions", error);
      });
    })
    .catch((error) => {
      console.log(new Date(), "Error creating DM channel (time cmd)", error);
    });
};

/**
 * Sends instructions to a user on an invalid boss command
 * @param message
 */
const sendBossInstructionMessage = (message: Message) => {
  message.author
    .createDM()
    .then((channel) => {
      const instructions =
        "Boss komentosi oli väärin!\n" +
        "```" +
        message.content +
        " ```\n" +
        "Koita näin:\n" +
        "```!boss BOSS PAIKKA```\n" +
        "Try this:\n" +
        "```!boss BOSS PAIKKA ```";
      channel.send(instructions).catch((error) => {
        console.log(new Date(), "Error while sending boss instructions", error);
      });
    })
    .catch((error) => {
      console.log(new Date(), "Error creating DM channel (boss cmd)", error);
    });
};

/**
 * Replies to a !help message
 * @param message
 */
const sendHelpMessage = (message: Message) => {
  message.author
    .createDM()
    .then((channel) => {
      const instructions =
        "**Create a raid**:\n" +
        "```!raid TIME BOSS LOCATION \n" +
        "i.e. !raid 12:00 Mewtwo Suvelan Tammi ```\n" +
        "Join a raid:\n" +
        "```Click on reactions +1, +2 or +3, the number indicates how many devices (or persons) you sign up for the raid\n" +
        "There's also purple +1, +2 or +3 which indicate you sign up remotely```\n" +
        "Fix/change the time on a raid:\n" +
        "```!aika TIME LOCATION\n" +
        "i.e. !aika 13:00 Suvelan Tammi```\n" +
        "Fix/Change boss' name on a raid:\n" +
        "```!boss BOSS LOCATION\n" +
        "i.e. !boss Mew Suvelan Tammi```\n" +
        "Can't see the bot's message? Make sure link preview is enabled. <https://the100io.zendesk.com/hc/en-us/articles/360019030731-Discord-Link-Preview>\n" +
        "Questions or feedback? Contact Nekuin#3936 or other admins on Discord.\n\n" +
        "**Ilmoita uusi raidi**:\n" +
        "```!raid AIKA BOSSI PAIKKA\n" +
        "esim: !raid 12:00 Mewtwo Suvelan Tammi```\n" +
        "Ilmoittaudu raidiin:\n" +
        "```Klikkaa reaktioita +1, +2 tai +3, numero edustaa kuinka monta laitetta tai pelaajaa ilmoitat\n" +
        "Liiloilla +1, +2 ja +3 voit ilmoittaa itsesi etäosallistujaksi```\n" +
        "Korjaa/vaihda aika raidiin:\n" +
        "```!aika AIKA PAIKKA\n" +
        "esim: !aika 13:00 Suvelan Tammi```\n" +
        "Korjaa/vaihda bossi raidiin:\n" +
        "```!boss BOSS PAIKKA\n" +
        "esim: !boss Mew Suvelan Tammi```\n" +
        "Etkö näe botin viestiä? Varmista että linkkien esikatselu on päällä. <https://the100io.zendesk.com/hc/en-us/articles/360019030731-Discord-Link-Preview>\n" +
        "Kysymykset ja palautteet voi laittaa Discordissa Nekuin#3936 tai muulle ylläpidolle.";
      channel.send(instructions).catch((error) => {
        console.log(new Date(), "Error while sending help message", error);
      });
    })
    .catch((error) => {
      console.log(new Date(), "Error creating DM channel (help msg)", error);
    });
};

/**
 * Returns an array of prefixed commands, used in handling
 * client events.
 * @param prefixes
 * @param command
 * @returns
 */
const commands = (prefixes: Array<string>, command: string): Array<string> => {
  return prefixes.reduce((commandArr: string[], prefix: string) => {
    commandArr.push(prefix + command);
    return commandArr;
  }, []);
};

/**
 * Edits a raids boss anme
 * @param boss
 * @param raid
 * @returns
 */
const editRaidBoss = (boss: string, raid: Raid): Promise<Raid> => {
  return new Promise((resolve) => {
    // edit raid
    const editedRaid = { ...raid };
    editedRaid.boss = boss;
    resolve(editedRaid);
  });
};

/**
 * Edits a raids starting time
 * @param time
 * @param raid
 * @returns
 */
const editRaidTime = (time: string, raid: Raid): Promise<Raid> => {
  return new Promise((resolve) => {
    // edit raid
    const editedRaid = { ...raid };
    editedRaid.time = time;
    resolve(editedRaid);
  });
};

export {
  raidMessage,
  newRaid,
  findRaidByLocation,
  signCountFromEmoji,
  signUserToRaid,
  editRaidMessage,
  removeUserFromRaid,
  commands,
  editRaidBoss,
  editRaidTime,
  sendTimeInstructionMessage,
  sendBossInstructionMessage,
  sendHelpMessage,
  NewRaid,
  Raid,
  Raider,
  RaidMap,
};
