class Debug extends Handler {

  static All = false;
  static OBS = false;
  static Parser = false;
  static SLOBS = false;
  static StreamElements = false;
  static Streamlabs = false;
  static Twitch = false;

  /**
   * Create a new Debug handler.
   */
  constructor() {
    super('Debug', []);
  }

  /**
   * Handle the input data (take an action).
   * @param {array} triggerData contents of trigger line
   */
  async handleData(triggerData) {
    var { handler } = Parser.getInputs(triggerData, ['handler'], false, 1);
    if (handler) {
      handler = handler.toLowerCase();
      switch (handler) {
        case 'obs':
          OBS = true;
          break;
        case 'parser':
          Parser = true;
          break;
        case 'slobs':
          SLOBS = true;
          break;
        case 'sl':
        case 'streamlabs':
          Streamlabs = true;
          break;
        case 'se':
        case 'streamelements':
          StreamElements = true;
          break;
        case 'twitch':
          Twitch = true;
          break;
        default:
          break;
      }
    } else {
      All = true;
    }
  }
}
