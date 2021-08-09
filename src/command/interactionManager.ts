import { Interaction, TextChannel, Message } from "discord.js";
import { ServerConfig } from "../guild/guildConfigs";
import {
  raidMessage,
  findRaidByLocation,
  RaidMap,
  editRaidMessage,
  Raid,
} from "../raid/raidUtils";

/**
 * Handles replying to interactions
 * @param interaction interaction from a user
 * @param server config for the server this instance is being run on
 * @param raids Reference to a raids map
 * @returns
 */
const interactionManager = async (
  interaction: Interaction,
  server: ServerConfig,
  raids: RaidMap
) => {
  if (!interaction.isCommand()) return;
  await interaction.defer({ ephemeral: true });
  // handle raid command
  if (interaction.commandName === "raid") {
    console.log(new Date(), "Raid command!");
    // get options
    const locationOption = interaction.options.get("paikka");
    const timeOption = interaction.options.get("aika");
    const bossOption = interaction.options.get("pomo");
    // validate values
    if (
      locationOption?.value !== undefined &&
      typeof locationOption.value === "string" &&
      timeOption?.value !== undefined &&
      typeof timeOption.value === "string" &&
      bossOption?.value !== undefined &&
      typeof bossOption.value === "string"
    ) {
      // construct raid
      const raid: Raid = {
        time: timeOption.value.trim(),
        location: locationOption.value.trim(),
        boss: bossOption.value.trim(),
        raiders: [],
        message: null,
      };
      // send raid message
      raidMessage(raid, interaction.channel as TextChannel, server).then(
        async (raidMessage: Message) => {
          // set message to the raid
          raid.message = raidMessage;
          // find out if raids contains a raid with this boss already
          const oldMessage = findRaidByLocation(raids, raid.location);
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
            // set raid to raids
            raids[raidMessage.id] = raid;
            // reply
            await interaction.editReply("Ok!").catch((error) => {
              console.log("Error while replying", error);
            });
          } else {
            // set raid to raids
            raids[raidMessage.id] = raid;
            //reply
            await interaction.editReply("Ok!").catch((error) => {
              console.log("Error while replying", error);
            });
          }
        }
      );
    } else {
      // error reply
      await interaction.editReply("Jokin meni pieleen :(").catch((error) => {
        console.log("Error while replying", error);
      });
    }
  }
  // handle time command
  if (interaction.commandName === "aika") {
    console.log(new Date(), "Time command!");
    // get options
    const locationOption = interaction.options.get("paikka");
    const timeOption = interaction.options.get("aika");
    // validate values
    if (
      locationOption?.value !== undefined &&
      typeof locationOption.value === "string" &&
      timeOption?.value !== undefined &&
      typeof timeOption.value === "string"
    ) {
      const location = locationOption.value;
      const time = timeOption.value.trim();
      // find existing raid to edit
      const oldMessage = findRaidByLocation(raids, location);
      if (oldMessage) {
        // message found, get raid object
        const editedRaid = raids[oldMessage.id];
        // edit time
        editedRaid.time = time;
        // set edited raid to raids
        raids[oldMessage.id] = editedRaid;
        // edit raid message
        await editRaidMessage(editedRaid, oldMessage)
          .then(() => {
            // reply
            interaction.editReply("Muokattu!").catch((error) => {
              console.log("Error while replying", error);
            });
          })
          .catch((error) => {
            // failed to edit raid message
            console.log(new Date(), "Failed to edit raid message", error);
            // remove from raids
            delete raids[oldMessage.id];
            // reply
            interaction
              .editReply(
                "Pieleen meni, ehkä viesti oli jo poistettu? Tee uusi raidi."
              )
              .catch((error) => {
                console.log("Error while replying", error);
              });
          });
      } else {
        // error reply
        await interaction
          .editReply("En löytänyt raidia jota muokata :(")
          .catch((error) => {
            console.log("Error while replying", error);
          });
      }
    } else {
      // values undefined or not string, error reply
      await interaction.editReply("Joku meni pieleen :(").catch((error) => {
        console.log("Error while replying", error);
      });
    }
  }

  // handle boss command
  if (interaction.commandName === "boss") {
    console.log(new Date(), "Boss command!");

    // get options
    const locationOption = interaction.options.get("paikka");
    const bossOption = interaction.options.get("pomo");
    // validate values
    if (
      locationOption?.value !== undefined &&
      typeof locationOption.value === "string" &&
      bossOption?.value !== undefined &&
      typeof bossOption.value === "string"
    ) {
      const location = locationOption.value;
      const boss = bossOption.value.trim();
      // find existing raid to edit
      const oldMessage = findRaidByLocation(raids, location);
      if (oldMessage) {
        // message found, get raid object
        const editedRaid = raids[oldMessage.id];
        // edit boss
        editedRaid.boss = boss;
        // set edited raid to raids
        await editRaidMessage(editedRaid, oldMessage)
          .then(() => {
            // reply
            interaction.editReply("Muokattu!").catch((error) => {
              console.log("Error while replying", error);
            });
          })
          .catch((error) => {
            // failed to edit raid msg
            console.log(new Date(), "Failed to edit raid message", error);
            // remove from raids
            delete raids[oldMessage.id];
            // reply
            interaction
              .editReply(
                "Pieleen meni, ehkä viesti oli jo poistettu? Tee uusi raidi."
              )
              .catch((error) => {
                console.log("Error while replying", error);
              });
          });
      } else {
        // error reply
        await interaction
          .editReply("En löytäny raidia jota muokata :(")
          .catch((error) => {
            console.log("Error while replying", error);
          });
      }
    } else {
      //values undefined or not string, error reply
      await interaction.editReply("Joku meni pieleen :(").catch((error) => {
        console.log("Error while replying", error);
      });
    }
  }
};

export default interactionManager;
