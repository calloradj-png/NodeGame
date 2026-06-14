import * as THREE from "three";
import React from "react";
import { ClientPlaceContext, ClientPlaceScript } from "../PlaceScriptTypes";
import ProximityPromptUI from "../../components/ProximityPromptUI";

export class DefaultPlaceClient implements ClientPlaceScript {
  protected context!: ClientPlaceContext;
  
  // Interactive Button Ref
  protected buttonMesh: THREE.Mesh | null = null;
  protected initialButtonY: number = 0;
  protected isButtonPressed: boolean = false;
  protected buttonPressedUntil: number = 0;

  // Prompt configuration & holding
  protected isPromptVisible: boolean = false;
  protected promptTriggered: boolean = false;
  protected isMobile: boolean = false;
  protected mobileHeld: boolean = false;

  // Listeners list for disposal
  protected cleanupListeners: Array<() => void> = [];

  public init(context: ClientPlaceContext) {
    this.context = context;
    this.isMobile = /Mobi|Android/i.test(navigator.userAgent);

    // Initial state from roomInfo
    if (this.context.roomInfo) {
      this.isButtonPressed = !!this.context.roomInfo.buttonIsPressed;
      this.buttonPressedUntil = this.context.roomInfo.buttonPressedUntil || 0;
    }

    // Try finding the Button mesh
    const foundBtn = this.context.scene.getObjectByName("Button");
    if (foundBtn && foundBtn instanceof THREE.Mesh) {
      this.buttonMesh = foundBtn;
      if (foundBtn.userData.originalY === undefined) {
        if (this.isButtonPressed) {
          // If already pressed upon client join/load, calculate original Y by adding back the previous default offset
          foundBtn.userData.originalY = foundBtn.position.y + 0.12;
        } else {
          foundBtn.userData.originalY = foundBtn.position.y;
        }
      }
      this.initialButtonY = foundBtn.userData.originalY;
    }

    // Bind server state update messages
    const unsubState = this.context.onServerMessage("button_state_changed", (payload) => {
      this.isButtonPressed = !!payload.isPressed;
      this.buttonPressedUntil = payload.pressedUntil || 0;
    });
    this.cleanupListeners.push(unsubState);
  }

  protected tick(dt: number) {
    // Left empty since GameCanvas.tsx owns the button animation and materials rendering to avoid competing state conflicts!
  }

  public getLocalDeathState(): boolean {
    return false;
  }

  public cleanup() {
    this.cleanupListeners.forEach(cb => cb());
    this.cleanupListeners = [];
  }
}
