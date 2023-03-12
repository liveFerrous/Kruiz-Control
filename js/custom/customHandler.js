class CustomHandler extends Handler {
    /**
     * Create a new Actions handler.
     */
    constructor(obs, scene, imageSettings) {
      super('Custom', []);
      this.obs = obs;

      this.obs.on('SceneTransitionStarted', this.onSceneTransition.bind(this));

      this.images = imageSettings.images;
      this.rootImageFolder = imageSettings.rootImageFolder;
      this.rootSoundFolder = imageSettings.rootSoundFolder;
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.typeSounds = imageSettings.typeSounds;

      this.setCurrentScene.bind(this);
      this.setCurrentScene(scene);
    }

    getRandomFile(type) {
      const typeImages = this.images[type.toLowerCase()]; 
      const randomImage =  typeImages.images[Math.floor(Math.random()*typeImages.images.length)];
      const sound = this.getSound(randomImage);
      return{
        imagePath: [this.rootImageFolder, typeImages.folder, randomImage.image].join('/'),
        soundPath: sound == undefined ? undefined : [this.rootSoundFolder, this.getSound(randomImage)].join('/'),
        message: randomImage.message == undefined ? `This is a ${randomImage.type}` : randomImage.customMessage
      };
    }

    getSound(imageDef) {    
      if (imageDef.sound != undefined) {
       return imageDef.sound;
      }
      
      if (this.typeSounds[imageDef.type] != undefined) {
        return this.typeSounds[imageDef.type];
      }

      return undefined;
    }

    setCurrentScene(scene) {
      this.currentScene = scene;
    }

    async onSceneTransition() {
      const toScene = await this.obs.getCurrentScene();
      this.setCurrentScene(toScene);
    }

    async playSound(soundPath, duration, volume) {
      var audio = new Audio(soundPath);
      var source = this.audioContext.createMediaElementSource(audio);
      var gainNode = this.audioContext.createGain();
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      volume = parseInt(volume);
      if (!isNaN(volume)) {
        audio.volume = 1;
        gainNode.gain.value = volume / 100;
      }
      audio.onended = () => {
        gainNode.disconnect();
      }
      audio.play();     
      await timeout(duration)
      audio.pause();
    }
  
    /**
     * Handle the input data (take an action).
     * @param {array} triggerData contents of trigger line
     */
    async handleData(triggerData) {
      var action = Parser.getAction(triggerData, 'Custom');
  
      switch (action) {
        case "randomphoto":
          // example: Custom RandomPhoto MyScene Bird RandomImage RandomSound 5000
          const { type, obsImageSource, duration, volume } 
            = Parser.getInputs(triggerData, ['action', 'type', 'obsImageSource', 'duration', 'volume']);

          const randomFile = this.getRandomFile(type);
          await this.obs.setInputSettings(obsImageSource, {
            file: randomFile.imagePath
          })
          this.obs.setSourceVisibility(obsImageSource, true, this.currentScene);
          if (randomFile.soundPath != undefined) {
            this.playSound(randomFile.soundPath, duration, volume);
          }
          ComfyJS.Say(randomFile.message);
          await timeout(duration);
          this.obs.setSourceVisibility(obsImageSource, false, this.currentScene);

          break;
      }
    }
  }
  