import { ServerPlaceContext, ServerPlaceScript } from "../PlaceScriptTypes";

export class DefaultPlaceServer implements ServerPlaceScript {
  protected context!: ServerPlaceContext;
  private buttonTimer: NodeJS.Timeout | null = null;

  public async init(context: ServerPlaceContext) {
    this.context = context;

    // Standard button press event handler
    this.context.onMessage("button_press", (playerId) => {
      this.handleButtonPress(playerId);
    });

    // Handle initial state setup
    this.context.room.buttonIsPressed = false;
    this.context.room.buttonPressedUntil = 0;
  }

  protected handleButtonPress(playerId: string) {
    const { room } = this.context;

    if (!room.buttonIsPressed) {
      room.buttonIsPressed = true;
      room.buttonPressedUntil = Date.now() + 5000;

      console.log(`[Script:Default] Button pressed in room ${this.context.roomId} by ${playerId}. Locking for 5s.`);

      this.context.broadcast({
        type: "button_state_changed",
        payload: {
          isPressed: true,
          pressedUntil: room.buttonPressedUntil
        }
      });

      if (this.buttonTimer) {
        clearTimeout(this.buttonTimer);
      }

      this.buttonTimer = setTimeout(() => {
        room.buttonIsPressed = false;
        room.buttonPressedUntil = 0;
        this.buttonTimer = null;

        console.log(`[Script:Default] Button unlocked in room ${this.context.roomId}.`);

        this.context.broadcast({
          type: "button_state_changed",
          payload: {
            isPressed: false,
            pressedUntil: 0
          }
        });
      }, 5000);
    }
  }

  public cleanup() {
    if (this.buttonTimer) {
      clearTimeout(this.buttonTimer);
      this.buttonTimer = null;
    }
  }
}
