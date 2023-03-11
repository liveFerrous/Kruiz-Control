// Do stuff if the document is fully loaded
(async function () {
  const controller = new Controller();

  const settingsFolder = `settings`

  const obsAddress = await readFile(`${settingsFolder}/obs/address.txt`);
  const obsPassword = await readFile(`${settingsFolder}/obs/password.txt`);
  const { obs, connecPromise } = connectOBSWebsocket(obsAddress.trim(), obsPassword.trim());
  await connecPromise;

  const handlers = [];
  handlers.push(new ActionHandler());
  handlers.push(new ApiHandler());

  const user = await readFile(`${settingsFolder}/chat/user.txt`);
  const oauth = await readFile(`${settingsFolder}/chat/oauth.txt`);
  if (user) {
    if (oauth) {
      ComfyJS.Init(user, oauth);
    } else {
      ComfyJS.Init(user);
    }
  }

  handlers.push(new ChatHandler(user));
  handlers.push(new CooldownHandler());

  handlers.push(new Debug());
  handlers.push(new DiscordHandler());
  handlers.push(new ListHandler());
  handlers.push(new MessageHandler());

  const currentScene = await obs.getCurrentScene()
  handlers.push(new OBSHandler(obs, currentScene));

  const images = await readFile('images/images.json');
  handlers.push(new CustomHandler(obs, currentScene, JSON.parse(images)));

  handlers.push(new ParamHandler());
  handlers.push(new RandomHandler());

  const slobsToken = await readFile(`${settingsFolder}/slobs/token.txt`);
  handlers.push(new SLOBSHandler(slobsToken));

  const streamElementsToken = await readFile(`${settingsFolder}/streamelements/jwtToken.txt`);
  handlers.push(new StreamElementsAlertHandler(streamElementsToken));

  const streamLabsToken = await readFile(`${settingsFolder}/streamlabs/socketAPIToken.txt`);
  handlers.push(new StreamlabsHandler(streamLabsToken));

  handlers.push(new TimerHandler());
  handlers.push(new TTSHandler(controller.getParser));

  const twitchUser = await readFile(`${settingsFolder}/twitch/user.txt`);
  const twitchId = await getIdFromUser(twitchUser.trim());
  handlers.push(new TwitchHandler(twitchId.trim()));

  handlers.push(new DiscordHandler());
  handlers.push(new ListHandler());
  handlers.push(new MessageHandler());


  for(const handler of handlers) {
    handler.addDataHandler(controller.handleData);
    controller.addParser(handler);
  }  

  $(document).ready(async function() {
    const version = await readFile("version.txt");
    console.error(`Kruiz Control ${version.trim()} Initialized`);
    const data = await readFile("triggers.txt");
    await readTriggerFile(data);
  });
  
  /**
   * Read all the file triggers
   * @param {string} data list of files to parse
   */
  async function readTriggerFile(data) {
    controller.parseInput(data, false);
    const files = await readFile("fileTriggers.txt");
    await readFileTriggers(files);
  }
  
  /**
   * Read all the file triggers
   * @param {string} data list of files to parse
   */
  async function readFileTriggers(data) {
    data = data.trim();
    const lines = data.split(/\r\n|\n/);
  
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.startsWith(`#`) && line.trim().length > 0) {
        try {
          const input = await readFile(`triggers/` + line);
          controller.parseInput(input, true);
        } catch (error) {
          console.error(`Check that the ${line} file exists in the triggers folder`);
        }
      }
    }
  
    controller.doneParsing();
    setTimeout(function() {
      controller.runInit();
    }, 2000);
  }
})();


