class OBSHandler extends Handler {
  /**
   * Create a new OBS handler.
   */
  constructor() {
    super('OBS', ['OnOBSSwitchScenes', 'OnOBSTransitionTo', 'OnOBSStreamStarted', 'OnOBSStreamStopped', 'OnOBSCustomMessage', 'OnOBSSourceVisibility', 'OnOBSSourceFilterVisibility']);
    this.onSwitch = [];
    this.onSwitchTrigger = {};
    this.onTransitionTo = [];
    this.onTransitionToTrigger = {};
    this.onStartTrigger = [];
    this.onStopTrigger = [];
    this.onCustom = [];
    this.onCustomTrigger = {};
    this.onSourceVis = {};
    this.onSourceVisTrigger = {};
    this.onSourceFilterVis = {};
    this.onSourceFilterVisTrigger = {};

    this.init.bind(this);
  }

  /**
   * Initialize the connection to obs with the input settings.
   * @param {string} address obs websocket address
   * @param {string} password obs websocket password
   */
  init(address, password) {
    this.obs = connectOBSWebsocket(
      address, password, this, this.onSwitchScenes.bind(this), this.onTransitionBegin.bind(this), this.onStreamStart.bind(this),
      this.onStreamStop.bind(this), this.onCustomMessage.bind(this), this.onSourceVisibility.bind(this), this.onSourceFilterVisibility.bind(this)
    );
  }

  /**
   * Register trigger from user input.
   * @param {string} trigger name to use for the handler
   * @param {array} triggerLine contents of trigger line
   * @param {number} id of the new trigger
   */
  addTriggerData(trigger, triggerLine, triggerId) {
    trigger = trigger.toLowerCase();
    switch (trigger) {
      case 'onobsswitchscenes':
        var { scenes } = Parser.getInputs(triggerLine, ['scenes'], true);
        // Handle aliases
        scenes.forEach(scene => {
          if (this.onSwitch.indexOf(scene) !== -1) {
            this.onSwitchTrigger[scene].push(triggerId);
          } else {
            this.onSwitchTrigger[scene] = [];
            this.onSwitch.push(scene);
            this.onSwitchTrigger[scene].push(triggerId);
          }
        });
        break;
      case 'onobstransitionto':
        var { scenes } = Parser.getInputs(triggerLine, ['scenes'], true);
        // Handle aliases
        scenes.forEach(scene => {
          if (this.onTransitionTo.indexOf(scene) !== -1) {
            this.onTransitionToTrigger[scene].push(triggerId);
          } else {
            this.onTransitionToTrigger[scene] = [];
            this.onTransitionTo.push(scene);
            this.onTransitionToTrigger[scene].push(triggerId);
          }
        });
        break;
      case 'onobsstreamstarted':
        this.onStartTrigger.push(triggerId);
        break;
      case 'onobsstreamstopped':
        this.onStopTrigger.push(triggerId);
        break;
      case 'onobscustommessage':
        var { messages } = Parser.getInputs(triggerLine, ['messages'], true);
        // Handle aliases
        messages.forEach(message => {
          if (this.onCustom.indexOf(message) !== -1) {
            this.onCustomTrigger[message].push(triggerId);
          } else {
            this.onCustomTrigger[message] = [];
            this.onCustom.push(message);
            this.onCustomTrigger[message].push(triggerId);
          }
        });
        break;
      case 'onobssourcevisibility':
        var { scene, item, status } = Parser.getInputs(triggerLine, ['scene', 'item', 'status']);
        var visibility = 'toggle';
        if (status && status.toLowerCase() === 'on') {
          visibility = true;
        } else if (status && status.toLowerCase() === 'off') {
          visibility = false;
        }
        if (!(scene in this.onSourceVis)) {
          this.onSourceVis[scene] = {};
        }
        if (!(item in this.onSourceVis[scene])) {
          this.onSourceVis[scene][item] = [];
        }
        this.onSourceVis[scene][item].push(visibility);
        if (!(`${scene}|${item}|${String(visibility)}` in this.onSourceVisTrigger)) {
          this.onSourceVisTrigger[`${scene}|${item}|${String(visibility)}`] = [];
        }
        this.onSourceVisTrigger[`${scene}|${item}|${String(visibility)}`].push(triggerId);
        break;
      case 'onobssourcefiltervisibility':
        var { source, filter, status } = Parser.getInputs(triggerLine, ['source', 'filter', 'status']);
        var visibility = 'toggle';
        if (status && status.toLowerCase() === 'on') {
          visibility = true;
        } else if (status && status.toLowerCase() === 'off') {
          visibility = false;
        }
        if (!(source in this.onSourceFilterVis)) {
          this.onSourceFilterVis[source] = {};
        }
        if (!(filter in this.onSourceFilterVis[source])) {
          this.onSourceFilterVis[source][filter] = [];
        }
        this.onSourceFilterVis[source][filter].push(visibility);
        if (!(`${source}|${filter}|${String(visibility)}` in this.onSourceFilterVisTrigger)) {
          this.onSourceFilterVisTrigger[`${source}|${filter}|${String(visibility)}`] = [];
        }
        this.onSourceFilterVisTrigger[`${source}|${filter}|${String(visibility)}`].push(triggerId);
        break;
      default:
        // do nothing
    }
    return;
  }

  /**
   * Handle switch scene messages from obs websocket.
   * @param {Object} data scene information
   */
  async onSwitchScenes(data) {
    if (Debug.All || Debug.OBS) {
      console.error("OBS onSwitchScenes: " + JSON.stringify(data));
    }
    var currentScene = await this.obs.getCurrentScene();
    var sceneTriggers = [];
    if (currentScene === data.sceneName) {
      if (this.onSwitch.indexOf(currentScene) !== -1) {
        sceneTriggers.push(...this.onSwitchTrigger[data.sceneName]);
      }
      if (this.onSwitch.indexOf('*') !== -1) {
        sceneTriggers.push(...this.onSwitchTrigger['*']);
      }
    }
    if (sceneTriggers.length > 0) {
      sceneTriggers.sort((a,b) => a-b);
      sceneTriggers.forEach(triggerId => {
        controller.handleData(triggerId, {
          scene: currentScene
        });
      });
    }
  }

  /**
   * Handle transitions from obs websocket.
   * @param {Object} data scene information
   */
  async onTransitionBegin(data) {
    if (Debug.All || Debug.OBS) {
      console.error("OBS onTransitionBegin: " + JSON.stringify(data));
    }
    var sceneTriggers = [];
    if (this.onTransitionTo.indexOf(data.toScene) !== -1) {
      sceneTriggers.push(...this.onTransitionToTrigger[data.toScene]);
    }
    if (this.onTransitionTo.indexOf('*') !== -1) {
      sceneTriggers.push(...this.onTransitionToTrigger['*']);
    }
    if (sceneTriggers.length > 0) {
      sceneTriggers.sort((a,b) => a-b);
      sceneTriggers.forEach(triggerId => {
        controller.handleData(triggerId, {
          from: data.fromScene,
          scene: data.toScene
        });
      });
    }
  }

  /**
   * Handle stream start messages from obs websocket.
   */
  onStreamStart() {
    if (Debug.All || Debug.OBS) {
      console.error("OBS onStreamStart message received");
    }
    if (this.onStartTrigger.length > 0) {
      this.onStartTrigger.forEach(trigger => {
        controller.handleData(trigger);
      })
    }
  }

  /**
   * Handle stream stop messages from obs websocket.
   */
  onStreamStop() {
    if (Debug.All || Debug.OBS) {
      console.error("OBS onStreamStop message received");
    }
    if (this.onStopTrigger.length > 0) {
      this.onStopTrigger.forEach(trigger => {
        controller.handleData(trigger);
      })
    }
  }

  /**
   * Handle custom messages from obs websocket.
   * @param {Object} broadcast obs custom message
   */
  onCustomMessage(broadcast) {
    if (Debug.All || Debug.OBS) {
      console.error("OBS onCustomMessage: " + JSON.stringify(broadcast));
    }
    var customTriggers = [];
    if (broadcast.realm === 'kruiz-control' && typeof(broadcast.data.message) !== 'undefined' && this.onCustom.indexOf(broadcast.data.message) !== -1) {
      customTriggers.push(...this.onCustomTrigger[broadcast.data.message]);
    }
    if (broadcast.realm === 'kruiz-control' && typeof(broadcast.data.message) !== 'undefined' && this.onCustom.indexOf('*') !== -1) {
      customTriggers.push(...this.onCustomTrigger['*']);
    }
    if (customTriggers.length > 0) {
      customTriggers.sort((a,b) => a-b);
      customTriggers.forEach(triggerId => {
        controller.handleData(triggerId, {
          message: broadcast.data.message,
          data: broadcast.data.data
        });
      });
    }
  }

  /**
   * Handle scene item visibility messages from obs websocket.
   * @param {Object} data scene item information
   */
  async onSourceVisibility(data) {
    if (Debug.All || Debug.OBS) {
      console.error("OBS onSourceVisibility: " + JSON.stringify(data));
    }
    var scene = data['scene-name'];
    var item = data['item-name'];
    var visibility = data['item-visible'];
    var sourceTriggers = [];
    if (scene in this.onSourceVis && item in this.onSourceVis[scene]) {
      if (this.onSourceVis[scene][item].indexOf(visibility) !== -1) {
        sourceTriggers.push(...this.onSourceVisTrigger[`${scene}|${item}|${String(visibility)}`]);
      }
      if (this.onSourceVis[scene][item].indexOf('toggle') !== -1) {
        sourceTriggers.push(...this.onSourceVisTrigger[`${scene}|${item}|toggle`]);
      }
    }
    if (sourceTriggers.length > 0) {
      sourceTriggers.sort((a,b) => a-b);
      sourceTriggers.forEach(triggerId => {
        controller.handleData(triggerId, {
          visible: visibility
        });
      });
    }
  }

  /**
   * Handle source filter visibility messages from obs websocket.
   * @param {Object} data source filter information
   */
  async onSourceFilterVisibility(data) {
    if (Debug.All || Debug.OBS) {
      console.error("OBS onSourceFilterVisibility: " + JSON.stringify(data));
    }
    var source = data['sourceName'];
    var filter = data['filterName'];
    var visibility = data['filterEnabled'];
    var sourceTriggers = [];
    if (source in this.onSourceFilterVis && filter in this.onSourceFilterVis[source]) {
      if (this.onSourceFilterVis[source][filter].indexOf(visibility) !== -1) {
        sourceTriggers.push(...this.onSourceFilterVisTrigger[`${source}|${filter}|${String(visibility)}`]);
      }
      if (this.onSourceFilterVis[source][filter].indexOf('toggle') !== -1) {
        sourceTriggers.push(...this.onSourceFilterVisTrigger[`${source}|${filter}|toggle`]);
      }
    }
    if (sourceTriggers.length > 0) {
      sourceTriggers.sort((a,b) => a-b);
      sourceTriggers.forEach(triggerId => {
        controller.handleData(triggerId, {
          visible: visibility
        });
      });
    }
  }

  /**
   * Handle the input data (take an action).
   * @param {array} triggerData contents of trigger line
   */
  async handleData(triggerData) {
    var action = Parser.getAction(triggerData, 'OBS');
    switch (action) {
      case 'addsceneitem':
        var { sceneName, sourceName, status } = Parser.getInputs(triggerData, ['action', 'sceneName', 'sourceName', 'status'], false, 1);
        status = (status && status.toLowerCase() === 'off') ? false : true;
        await this.obs.addSceneItem(sceneName, sourceName, status)
        break;
      case 'currentscene':
        var currentScene = await this.obs.getCurrentScene();
        return {current_scene: currentScene};
        break;
      case 'isscenesourcevisible':
        var { scene, source } = Parser.getInputs(triggerData, ['action', 'scene', 'source']);
        if (scene === '{current}') {
          var currentScene = await this.obs.getCurrentScene();
          scene = currentScene;
        }
        var visible = await this.obs.getSourceVisibility(scene, source);
        return { is_visible: !!visible };
        break;
      case 'issourceactive':
        var { source } = Parser.getInputs(triggerData, ['action', 'source']);
        var is_active = await this.obs.getSourceActiveStatus(source);
        return { is_active };
        break;
      case 'media':
        var { media, source, path } = Parser.getInputs(triggerData, ['action', 'media', 'source', 'path'], false, 1);
        let mediaAction = '';
        let mediaSettings = {};
        media = media.toLowerCase();
        switch (media) {
          case 'duration':
            // THIS IS NOT GETTING THE DURATION. THIS IS GETTING THE ENTIRE STATUS. MAKE SURE YOU FINISH THIS, TIMB.
            var data = await this.obs.getMediaInputStatus(source);
            return {mediaStatus: data}
            break;
          case 'path':
            mediaSettings = {local_file: path};
            await this.obs.setInputSettings(source, mediaSettings)
            break;
          case 'pause':
            mediaAction = 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE';
            await this.obs.triggerMediaInputAction(source, mediaAction);
            break;
          case 'play':
            mediaAction = 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY';
            await this.obs.triggerMediaInputAction(source, mediaAction);
            break;
          case 'restart':
            mediaAction = 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART';
            await this.obs.triggerMediaInputAction(source, mediaAction);
            break;
          case 'stop':
            mediaAction = 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP';
            await this.obs.triggerMediaInputAction(source, mediaAction);
            break;
        }
        break;
      case 'mute':
        var { source, status } = Parser.getInputs(triggerData, ['action', 'source', 'status']);
        status = status.toLowerCase();
        if (status === 'toggle') {
          await this.obs.toggleMute(source);
        } else {
          status = status === 'on' ? true : false;
          await this.obs.setMute(source, status);
        }
        break;
      case 'position':
        var { scene, item, x, y } = Parser.getInputs(triggerData, ['action', 'scene', 'item', 'x', 'y']);
        if (scene === '{current}') {
          var currentScene = await this.obs.getCurrentScene();
          scene = currentScene;
        }
        var data = await this.obs.getSceneItemProperties(scene, item);
        x = parseFloat(x);
        y = parseFloat(y);
        await this.obs.setSceneItemPosition(scene, item, x, y);
        return {
          init_x: data.position.x,
          init_y: data.position.y
        }
        break;
      case 'refresh':
        var { source } = Parser.getInputs(triggerData, ['action', 'source']);
        var source = triggerData.slice(2).join(' ');
        await this.obs.refreshBrowser(source);
        break;
      case 'savereplaybuffer':
        await this.obs.saveReplayBuffer();
        break;
      case 'scene':
        var { scene } = Parser.getInputs(triggerData, ['action', 'scene']);
        var currentScene = await this.obs.getCurrentScene();
        await this.obs.setCurrentScene(scene);
        return {previous_scene: currentScene};
        break;
      case 'scenesource':
        var { scene, source, status } = Parser.getInputs(triggerData, ['action', 'scene', 'source', 'status']);
        status = status.toLowerCase();
        if (status === 'toggle') {
          var data = await this.obs.getSceneItemProperties(scene, source);
          status = ! data.visible;
        } else {
          status = status === 'on' ? true : false;
        }
        await this.obs.setSourceVisibility(source, status, scene);
        break;
      case 'send':
        var { message, data } = Parser.getInputs(triggerData, ['action', 'message', 'data'], false, 1);
        data = data || '';
        await this.obs.broadcastCustomMessage(message, data);
        break;
      case 'settings':
        var { source } = Parser.getInputs(triggerData, ['action', 'source'], false, 1);
        let settings = await this.obs._getInputSettings(source);
        return { settings: settings };
      case 'size':
        var { scene, item, width, height } = Parser.getInputs(triggerData, ['action', 'scene', 'item', 'width', 'height']);
        if (scene === '{current}') {
          scene = await this.obs.getCurrentScene();
        }
        var data = await this.obs.getSceneItemProperties(scene, item);
        var scaleX = parseFloat(width) / parseFloat(data.sourceWidth);
        var scaleY = parseFloat(height) / parseFloat(data.sourceHeight);
        await this.obs.setSceneItemSize(scene, item, scaleX, scaleY);
        return {
          init_width: data.width,
          init_height: data.height
        }
        break;
      case 'source':
        var { source, subaction, info, status } = Parser.getInputs(triggerData, ['action', 'source', 'subaction', 'info', 'status'], false, 2);
        var sourceSettings = {};
        if (info === undefined) {
          status = subaction.toLowerCase();
          if (status === 'toggle') {
            var data = await this.obs.getSceneItemProperties(undefined, source);
            status = ! data.visible;
          } else {
            status = status === 'on' ? true : false;
          }
          await this.obs.setSourceVisibility(source, status);
        } else if (info !== undefined && subaction.toLowerCase() === 'url') {
          sourceSettings = {url: info};
          await this.obs.setInputSettings(source, sourceSettings);
        } else if (info !== undefined && subaction.toLowerCase() === 'text') {
          sourceSettings = {text: info};
          await this.obs.setInputSettings(source, sourceSettings);
        } else if (status !== undefined) {
          status = status.toLowerCase();
          if (status === 'toggle') {
            var data = await this.obs.getSourceFilters(source);
            var filters = data.filters;
            filters.forEach((item, i) => {
              if (item.name === info) {
                status = !item.enabled;
              }
            });
            if (status === 'toggle') {
              console.error(`Unable to find filter with name: ${info}`);
            }
          } else {
            status = status === 'on' ? true : false;
          }
          await this.obs.setFilterVisibility(source, info, status);
        }
        break;
      case 'startreplaybuffer':
        await this.obs.startReplayBuffer();
        break;
      case 'startstream':
        await this.obs.startStream();
        break;
      case 'stopreplaybuffer':
        await this.obs.stopReplayBuffer();
        break;
      case 'stopstream':
        await this.obs.stopStream();
        break;
      case 'takesourcescreenshot':
        var { source, filePath } = Parser.getInputs(triggerData, ['action', 'source', 'filePath']);
        await this.obs.takeSourceScreenshot(source, filePath);
        break;
      case 'transition':
        var transitionData = await this.obs.getCurrentTransition();
        var currentTransition = transitionData.name;
        var { transition } = Parser.getInputs(triggerData, ['action', 'transition']);
        await this.obs.setCurrentTransition(transition);
        return { previous_transition: currentTransition };
        break;
      case 'version':
        var data = await this.obs.getVersion();
        return { version: data.obsWebSocketVersion };
        break;
      case 'volume':
        var { source, volume, useDecibel } = Parser.getInputs(triggerData, ['action', 'source', 'volume', 'useDecibel'], false, 1);
        useDecibel = (useDecibel && useDecibel.toLowerCase() === 'true') ? true : false;
        var currentAudio = await this.obs.getVolume(source);
        volume = parseFloat(volume);
        if (!isNaN(volume)) {
         //Limit volume to constraints to prevent error returns.
          if (useDecibel === true) {
            if (volume < -100) {
              volume = -100;
            } else if (volume > 26) {
              volume = 26;
            }
          } else {
            if (volume < 0) {
              volume = 0;
            } else if (volume > 20) {
              volume = 20;
            }
          }
          await this.obs.setVolume(source, volume, useDecibel);
        } else {
          console.error('Unable to parse volume value: ' + triggerData[triggerData.length - 1]);
        }
        return { previous_volume: (useDecibel === true) ? currentAudio.inputVolumeDb : currentAudio.inputVolumeMul };
        break;
      default:
        break;
    }
    return;
  }
}

/**
 * Create a handler and read user settings
 */
async function obsHandlerExport() {
  var obsHandler = new OBSHandler();
  var address = await readFile('settings/obs/address.txt');
  var password = await readFile('settings/obs/password.txt');
  obsHandler.init(address.trim(), password.trim());
}
obsHandlerExport();
