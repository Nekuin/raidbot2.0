import { Client, Collection, Message, TextChannel } from "discord.js";
import { ServerConfig } from "../guild/guildConfigs";
// @ts-ignore
import schedule from "node-schedule";

/**
 * Handles channel cleaning
 * @param client Discord Client
 * @param server current servers config
 * @param clearRaids A function to clear the raid map
 */
const CleanerHandler = (
  client: Client,
  server: ServerConfig,
  clearRaids: () => void
) => {
  const channels = [...server.raidChannels, ...server.cleanChannels];
  console.log(server.guildName, "Scheduling cleaning");
  // schedule job, every day at 01:00 am
  schedule.scheduleJob("0 1 * * *", async () => {
    // promise to resolve TextChannels
    const chPromises: Array<Promise<TextChannel>> = [];
    for (const channelId of channels) {
      chPromises.push(
        new Promise((resolve, reject) => {
          client.channels
            .fetch(channelId)
            .then((resolvedChannel) => {
              if (resolvedChannel && resolvedChannel.type === "GUILD_TEXT") {
                resolve(resolvedChannel as TextChannel);
              }
            })
            .catch((err) => reject(err));
        })
      );
    }
    // handle resolved text channels
    Promise.all(chPromises)
      .then((textChannels) => {
        try {
          const cleanerPromises = [];
          for (const textChannel of textChannels) {
            // new cleaning task
            cleanerPromises.push(
              new Promise(async (resolve, reject) => {
                console.log(
                  new Date(),
                  server.guildName,
                  "Started cleaning in channel",
                  textChannel.name
                );
                let filtered: Collection<string, Message>;
                // when bulkDelete throws an error, we'll increment the retry count
                // and we won't allow more than 10
                let retries = 0;
                // fetch messages, filter them and delete the filtered ones
                let retryEscape = false;
                do {
                  // if we have more than 10 retries, change retryEscape to true
                  // so the while loop will exit after this round.
                  if (retries >= 10) {
                    retryEscape = true;
                  }
                  let fetched = await textChannel.messages.fetch(
                    { limit: 100 },
                    { cache: false, force: true }
                  );
                  // filter pinned and old messages (more than 2 weeks old)
                  filtered = new Collection<string, Message>();
                  fetched.forEach((message, key) => {
                    let time = Date.now() - message.createdTimestamp;
                    // 2 weeks in milliseconds, milliseconds because Date.now() and message.createdTimestamp are both in ms
                    let limit = 1209600000;
                    // filter out pinned messages and messages older than 2 weeks
                    if (!message.pinned && time < limit) {
                      filtered.set(key, message);
                    }
                  });
                  // delete filtered messages
                  try {
                    await textChannel.bulkDelete(filtered, false);
                  } catch (err) {
                    retries++;
                    console.log(
                      "Error while bulk deleting in channel, continuing as normal",
                      err
                    );
                  }
                } while (filtered.size > 0 && retryEscape === false);
                // log success
                console.log(
                  new Date(),
                  server.guildName,
                  "Finished cleaning in channel",
                  textChannel.name
                );
                resolve({
                  name: server.guildName + "." + textChannel.name,
                  success: true,
                });
              })
            );
          }
          // wait for all cleaners to finish their jobs
          Promise.all(cleanerPromises)
            .then((resolves) => {
              console.log(new Date(), "Resolves", resolves);
              // empty raid map
              clearRaids();
            })
            .catch((err) => {
              // error in 1 of the cleaner promises
              console.log(
                new Date(),
                server.guildName,
                "error while cleaing a channel",
                err
              );
            });
        } catch (error) {
          // error surrounding cleaner promise loop
          console.log(
            new Date(),
            server.guildName,
            "Error while cleaning a channel",
            error
          );
        }
      })
      .catch((err) => {
        // error in channel promise
        console.log(new Date(), server.guildName, "Cleaner error", err);
      });
  });
};

export default CleanerHandler;
