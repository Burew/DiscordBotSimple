const Discord = require("discord.js");
const YouTube = require("youtube-node");
const fs = require("fs");

const client = new Discord.Client();

//load settings from file or env vars
client.customSettings = {};
try {
  client.customSettings = require("./settings.json");
} catch(e){
  let settingFields = ["YOUTUBE_API_KEY", "IMGUR_CLIENT_ID", "prefix", "token"];
  settingFields.forEach(
    field => {client.customSettings[field] = process.env[field]}
  );
}
client.customData = {};
client.customData.cache = {};
client.customData.youTube = new YouTube();
client.customData.youTube.setKey(client.customSettings.YOUTUBE_API_KEY);

fs.readdir("./events/", (err, files) => {
  if (err) return console.error(err);
  files.forEach(file => {
    let eventFunction = require(`./events/${file}`);
    let eventName = file.split(".")[0]; //grab file name
    // super-secret recipe to call events with all their proper arguments *after* the `client` var.
    client.on(eventName, (...args) => eventFunction.run(client, ...args));
  });
});

client.on("message", message => {
  if (message.author.bot) return;
  if(message.content.indexOf(client.customSettings.prefix) !== 0) return;

  // This is the best way to define args. Trust me.
  const args = message.content.slice(client.customSettings.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  if (command.startsWith(".")){  //filter out hacky responses
    return;
  }

  // The list of if/else is replaced with those simple 2 lines:
  try {
    let commandFile = require(`./commands/${command}.js`);
    commandFile.run(client, message, args);
  } catch (err) {
    console.error(err);
  }
});

client.login(client.customSettings.token);
