import { Client } from "discord.js";
import {
  NewRaid,
  newRaid,
  findRaidByLocation,
  RaidMap,
  signCountFromEmoji,
  signUserToRaid,
  editRaidMessage,
  removeUserFromRaid,
  commands,
  editRaidTime,
  editRaidBoss,
  sendBossInstructionMessage,
  sendTimeInstructionMessage,
  sendHelpMessage,
} from "./raid/raidUtils";
import _ from "lodash";
import { ServerConfig } from "./guild/guildConfigs";
import interactionManager from "./command/interactionManager";
import CleanerHandler from "./cleaning/CleanerHandler";

// command prefixes
const PREFIXES = ["!"];

/**
 * Handles client events after it's ready
 * @param client
 * @param server
 */
const ClientHandler = (client: Client, server: ServerConfig) => {
  //map of raids, message ID of the raid is mapped to the raid object
  let raids: RaidMap = {};
  let persistenRaids: RaidMap = {};

  // start cleaner handler
  CleanerHandler(client, server, () => {
    raids = {};
  });

  /**
   * Listen for new messages
   */
  client.on("messageCreate", async (message) => {
    if (message.partial) {
      try {
        await message.fetch();
      } catch (error) {
        console.error("Something went wrong when fetching the message", error);
        return;
      }
    }
    // return early if message isn't for this guild
    if (message.guild?.id !== server.guildId) return;
    // return early if message wasn't on a raid channel
    if (
      !_.includes(server.raidChannels, message.channel.id) &&
      !_.includes(server.persistentRaidChannels, message.channel.id)
    ) {
      return;
    }
    // figure out if sent to persistent channel
    const persistent = _.includes(
      server.persistentRaidChannels,
      message.channel.id
    );
    // choose correct raid map to work with, based on persistent or not
    let raidMap = persistent ? persistenRaids : raids;
    // get the command
    const firstWord = message.content.split(" ")[0];
    // handle raid messages
    if (_.includes(commands(PREFIXES, "raid"), firstWord)) {
      console.log(new Date(), "legacy raid command");
      console.log(
        "Raids/persistenr raids length",
        Object.keys(raids).length,
        Object.keys(persistenRaids).length
      );
      newRaid(message, server)
        .then((_newRaid: NewRaid) => {
          // remove creation message
          if (message.deletable) {
            message.delete().catch((error) => {
              console.log(
                new Date(),
                "Failed to remove raid creation message",
                error
              );
            });
          } else {
            console.log(new Date(), "Creation message was not deletable!");
          }

          // find out if raids contains a raid with this boss already
          const oldMessage = findRaidByLocation(
            raidMap,
            _newRaid.raidObject.location
          );
          // if old raid exists, remove it first
          if (oldMessage) {
            if (oldMessage.deletable)
              oldMessage
                .delete()
                .catch((error) =>
                  console.log(
                    new Date(),
                    "Failed to remove old raid message",
                    error
                  )
                );
            raidMap[_newRaid.messageId] = _newRaid.raidObject;
          } else {
            raidMap[_newRaid.messageId] = _newRaid.raidObject;
          }
        })
        .catch((error) => {
          console.log(new Date(), "Error while creating legacy raid", error);
          if (message.deletable) {
            message
              .delete()
              .catch((error) =>
                console.log(
                  new Date(),
                  "Failed to remove raid creation message",
                  error
                )
              );
          } else {
            console.log(new Date(), "Creation message was not deletable!");
          }
        });
    } else if (_.includes(commands(PREFIXES, "aika"), firstWord)) {
      console.log(new Date(), "legacy time command");
      // delete msg
      message.delete().catch((error) => {
        console.log(new Date(), "Error while deleting time command", error);
      });
      const commandString = message.content.split(" ");
      if (commandString.length > 2) {
        const location = commandString[2];
        const time = commandString[1];
        const oldMessage = findRaidByLocation(raidMap, location);
        if (oldMessage) {
          editRaidTime(time, raidMap[oldMessage.id])
            .then((editedRaid) => {
              raidMap[oldMessage.id] = editedRaid;

              editRaidMessage(editedRaid, oldMessage)
                .then(() => {
                  console.log(new Date(), "Success!");
                })
                .catch((error) => {
                  console.log(
                    "Error while editing raid message with legacy time command",
                    error
                  );
                });
            })
            .catch((error) => {
              console.log(new Date(), "Error while editing raid time", error);
            });
        } else {
          console.log(new Date(), "fail to find raid legacy time command");
        }
      } else {
        console.log(new Date(), "fail legacy time command");
        sendTimeInstructionMessage(message);
      }
    } else if (_.includes(commands(PREFIXES, "boss"), firstWord)) {
      console.log(new Date(), "legacy boss command");
      // delete msg
      message.delete().catch((error) => {
        console.log(new Date(), "Error while deleting time command", error);
      });
      const commandString = message.content.split(" ");
      if (commandString.length > 2) {
        const location = commandString[2];
        const boss = commandString[1];
        const oldMsg = findRaidByLocation(raidMap, location);
        if (oldMsg) {
          editRaidBoss(boss, raidMap[oldMsg.id])
            .then((editedRaid) => {
              raidMap[oldMsg.id] = editedRaid;
              editRaidMessage(editedRaid, oldMsg)
                .then(() => {
                  console.log(new Date(), "Success!");
                })
                .catch((error) => {
                  console.log(
                    "Error while editing raid message with legacy boss command",
                    error
                  );
                });
            })
            .catch((error) => {
              console.log(new Date(), "Error while editing raid boss", error);
            });
        } else {
          console.log(new Date(), "fail to find raid legacy boss command");
        }
      } else {
        console.log(new Date(), "fail legacy boss command");
        sendBossInstructionMessage(message);
      }
    } else if (_.includes(commands(PREFIXES, "help"), firstWord)) {
      // delete msg
      message.delete().catch((error) => {
        console.log(new Date(), "Error while deleting time command", error);
      });
      sendHelpMessage(message);
    }
  });

  /**
   * Listen for reaction adds
   */
  client.on("messageReactionAdd", async (reaction, user) => {
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error("Something went wrong when fetching the message", error);
        return;
      }
    }
    // return early if user is a bot
    if (user.bot) return;

    // return early if message isn't for this guild
    if (reaction.message.guild?.id !== server.guildId) return;
    // return early if message wasn't on a raid channel
    if (
      !_.includes(server.raidChannels, reaction.message.channel.id) &&
      !_.includes(server.persistentRaidChannels, reaction.message.channel.id)
    ) {
      return;
    }
    // figure out if sent to persistent channel
    const persistent = _.includes(
      server.persistentRaidChannels,
      reaction.message.channel.id
    );
    // choose correct raid map to work with, based on persistent or not
    let raidMap = persistent ? persistenRaids : raids;
    const emojiKey = reaction.emoji?.id;
    if (emojiKey) {
      // look for reaction emoji in normal signup keys
      if (_.includes(server.signupEmojis, emojiKey)) {
        // get number of signs from reaction emoji

        const numberOfNormalSigns = signCountFromEmoji(
          emojiKey,
          server.signupEmojis
        );
        // get raid
        const raid = raidMap[reaction.message.id];
        // get guild
        const guild = reaction.message.guild;
        // sign user to raid if numberOfSigns, raid and guild exists
        if (raid && numberOfNormalSigns !== null && guild) {
          const editedRaid = signUserToRaid(
            guild,
            raid,
            user,
            numberOfNormalSigns,
            false
          );
          raidMap[reaction.message.id] = editedRaid;
          editRaidMessage(editedRaid, reaction.message);
        } else {
          console.log(
            "Raid, sign count or guild wasn't found",
            !!raid,
            !!numberOfNormalSigns,
            !!guild
          );
        }
      }
      // look for reaction emoji in remote signup keys
      else if (
        server.remoteEmojis &&
        _.includes(server.remoteEmojis, emojiKey)
      ) {
        // get number of signs from reaction emoji
        const numberOfRemoteSigns = signCountFromEmoji(
          emojiKey,
          server.remoteEmojis
        );
        // get raid
        const raid = raidMap[reaction.message.id];
        // get guild
        const guild = reaction.message.guild;
        // sign user to remote raid if numberOfSigns, raid and guild exists
        if (raid && numberOfRemoteSigns !== null && guild) {
          const editedRaid = signUserToRaid(
            guild,
            raid,
            user,
            numberOfRemoteSigns,
            true
          );
          raidMap[reaction.message.id] = editedRaid;
          editRaidMessage(editedRaid, reaction.message);
        } else {
          console.log(
            "Raid, sign count or guild wasn't found",
            !!raid,
            !!numberOfRemoteSigns,
            !!guild
          );
        }
      }
    }
  });

  /**
   * Listen for reaction removes
   */
  client.on("messageReactionRemove", (reaction, user) => {
    // return early if user is a bot
    if (user.bot) return;

    // return early if message isn't for this guild
    if (reaction.message.guild?.id !== server.guildId) return;
    // return early if message wasn't on a raid channel
    if (
      !_.includes(server.raidChannels, reaction.message.channel.id) &&
      !_.includes(server.persistentRaidChannels, reaction.message.channel.id)
    ) {
      return;
    }
    // figure out if sent to persistent channel
    const persistent = _.includes(
      server.persistentRaidChannels,
      reaction.message.channel.id
    );
    // choose correct raid map to work with, based on persistent or not
    let raidMap = persistent ? persistenRaids : raids;

    const emojiKey = reaction.emoji?.id;
    if (emojiKey) {
      // look for reaction emoji in normal signup keys
      if (_.includes(server.signupEmojis, emojiKey)) {
        // get number of signs from reaction emoji
        const numberOfNormalSigns = signCountFromEmoji(
          emojiKey,
          server.signupEmojis
        );
        // get raid
        const raid = raidMap[reaction.message.id];
        // remove user from raid if raid and numberOfSigns exists
        if (raid && numberOfNormalSigns !== null) {
          const editedRaid = removeUserFromRaid(
            raid,
            user,
            numberOfNormalSigns,
            false
          );
          // replace raid with edited raid
          raidMap[reaction.message.id] = editedRaid;
          editRaidMessage(editedRaid, reaction.message);
        }
      }
      // look for reaction emoji in remote signup keys
      else if (
        server.remoteEmojis &&
        _.includes(server.remoteEmojis, emojiKey)
      ) {
        // get number of signs from reaction emoji
        const numberOfRemoteSigns = signCountFromEmoji(
          emojiKey,
          server.remoteEmojis
        );
        // get raid
        const raid = raidMap[reaction.message.id];
        if (raid && numberOfRemoteSigns) {
          const editedRaid = removeUserFromRaid(
            raid,
            user,
            numberOfRemoteSigns,
            true
          );
          // replace raid with edited raid
          raidMap[reaction.message.id] = editedRaid;
          editRaidMessage(editedRaid, reaction.message);
        }
      }
    }
  });

  /**
   * Listen for interactions (slash commands)
   */
  client.on("interactionCreate", async (interaction) => {
    if (interaction.guildId !== server.guildId) return;
    console.log(new Date(), "Interaction in", server.guildName);
    // figure out if sent to persistent channel
    const persistent = _.includes(
      server.persistentRaidChannels,
      interaction.channelId
    );
    // choose correct raid map to work with, based on persistent or not
    let raidMap = persistent ? persistenRaids : raids;
    interactionManager(interaction, server, raidMap);
  });
};

export default ClientHandler;
