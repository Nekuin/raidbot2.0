type ServerConfig = {
  guildId: string;
  guildName: string;
  raidChannels: Array<string>;
  persistentRaidChannels: Array<string>;
  // extra channels that will be cleaned,
  // raidChannels will be cleaned by default
  cleanChannels: Array<string>;
  signupEmojis: SignupEmoji;
  remoteEmojis: SignupEmoji | null;
};

type SignupEmoji = { [key: number]: string };

// config for test server
const huutisServerConfig: ServerConfig = {
  guildId: "498168048717398016",
  guildName: "HuutisServu",
  raidChannels: [
    // general channel
    "498168048717398019",
    // hemanni channel
    "498171854742355968",
  ],
  persistentRaidChannels: [
    // hilpari channel
    "579704943926050826",
  ],
  cleanChannels: [],
  signupEmojis: {
    1: "503269083953758265",
    2: "503269083731460107",
    3: "503269084075393024",
  },
  remoteEmojis: {
    1: "872465606652338227",
    2: "872465606593609769",
    3: "872465606748799007",
  },
};

// config for POGO espoo server
const pogoEspooServerConfig: ServerConfig = {
  guildId: "483647882587537408",
  guildName: "Pogo Espoo Keskus",
  raidChannels: [
    // testatkaa toimintaa kannu
    "497132570924810261",
    // 5 raids
    "497128671237373959",
    // 4 raids
    "497128696000544768",
    // 1-2-3 raidit
    "497128710097600512",
  ],
  persistentRaidChannels: [
    // ex raids
    "483648699499806720",
    // community day ch (erikoispäivät)
    "487710843639824404",
  ],
  cleanChannels: [
    // raidikutsut
    "735130568433467502",
    // havainnot
    "497129234670813187",
  ],
  signupEmojis: {
    1: "496747453132046357",
    2: "496747481196003331",
    3: "496747490486255635",
  },
  remoteEmojis: {
    1: "705028426188455946",
    2: "705028444907634750",
    3: "705028461042991194",
  },
};

export { huutisServerConfig, pogoEspooServerConfig, ServerConfig, SignupEmoji };
