export interface SDKUser {
  name: string;
  avatarUrl?: string;
  isGuest: boolean;
}

export type PlatformType = "yandex" | "crazygames" | "local";

class PlatformSDK {
  private platform: PlatformType = "local";
  private isInitialized = false;
  private ysdk: any = null;
  private ysdkPlayer: any = null;
  private crazygamesSdk: any = null;
  private authWarningCallback: ((warning: string | null) => void) | null = null;

  constructor() {
    this.detectPlatform();
  }

  /**
   * Detects the platform the game is running on based on hostname or iframe referrer.
   */
  private detectPlatform() {
    if (typeof window === "undefined") return;

    const hostname = window.location.hostname.toLowerCase();
    const referrer = document.referrer ? document.referrer.toLowerCase() : "";
    const searchParams = window.location.search.toLowerCase();

    if (
      hostname.includes("yandex") || 
      hostname.includes("yaplayground") ||
      referrer.includes("yandex") || 
      referrer.includes("yaplayground") ||
      searchParams.includes("ysdk")
    ) {
      this.platform = "yandex";
    } else if (
      hostname.includes("crazygames") || 
      hostname.includes("crazy.games") ||
      referrer.includes("crazygames") ||
      referrer.includes("crazy.games")
    ) {
      this.platform = "crazygames";
    } else {
      this.platform = "local";
    }
    console.log(`[PlatformSDK] Detected running platform: ${this.platform.toUpperCase()}`);
  }

  /**
   * Safe script injection helper
   */
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Initializes the detected SDK. If running locally, performs no sdk initialization.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (this.platform === "yandex") {
        console.log("[PlatformSDK] Injecting Yandex Games SDK script...");
        await this.loadScript("https://yandex.ru/games/sdk/v3");

        if (typeof (window as any).Ya?.games?.init === "function") {
          console.log("[PlatformSDK] Initializing Ya.games.init...");
          this.ysdk = await (window as any).Ya.games.init();
          (window as any).ysdk = this.ysdk; // exposing globally just in case
          
          await this.initYandexPlayer();
        } else {
          throw new Error("Ya.games.init is not available on window object.");
        }
      } else if (this.platform === "crazygames") {
        console.log("[PlatformSDK] Injecting CrazyGames SDK script...");
        await this.loadScript("https://sdk.crazygames.com/crazygames-sdk-v2.js");

        if ((window as any).CrazyGames?.SDK) {
          console.log("[PlatformSDK] Initializing CrazyGames SDK...");
          this.crazygamesSdk = (window as any).CrazyGames.SDK;
          
          // Trigger loadingStart to notify platform of start process
          if (this.crazygamesSdk?.game?.loadingStart) {
            this.crazygamesSdk.game.loadingStart();
          }
        } else {
          throw new Error("CrazyGames.SDK is not available on window object.");
        }
      } else {
        console.log("[PlatformSDK] Running in local sandbox. Fallback state active.");
      }
    } catch (error) {
      console.error("[PlatformSDK] Initialization failed, falling back to local storage:", error);
      this.platform = "local"; // fallback to local mode
    } finally {
      this.isInitialized = true;
    }
  }

  /**
   * Initializes or refreshes the Yandex Player profile and saves system.
   */
  private async initYandexPlayer(): Promise<void> {
    if (!this.ysdk) return;

    try {
      // Load player without scopes first to prevent rapid intrusive popups on load
      this.ysdkPlayer = await this.ysdk.getPlayer({ scopes: false });
      (window as any).ysdkPlayer = this.ysdkPlayer;

      const isGuest = this.ysdkPlayer.getMode() === "lite";
      if (isGuest) {
        console.log("[PlatformSDK] Yandex player is guest (lite mode)");
        this.notifyAuthWarning();
      } else {
        console.log("[PlatformSDK] Yandex player is authorized. Requesting scopes...");
        try {
          // Request scopes to load profile nickname and picture
          this.ysdkPlayer = await this.ysdk.getPlayer({ scopes: true });
          (window as any).ysdkPlayer = this.ysdkPlayer;
          this.notifyAuthWarning(false);
        } catch (scopeError) {
          console.warn("[PlatformSDK] Scopes request failed or dismissed, using default lite details", scopeError);
        }
      }
    } catch (playerError) {
      console.error("[PlatformSDK] Failed to initialize Yandex player context", playerError);
    }
  }

  /**
   * Prompts the player to log in (Yandex only, where guest has saving consequences).
   */
  public async login(): Promise<SDKUser | null> {
    if (this.platform === "yandex" && this.ysdk) {
      try {
        console.log("[PlatformSDK] Requesting Yandex auth dialog...");
        await this.ysdk.auth.openAuthDialog();
        // After success auth, re-init the player
        await this.initYandexPlayer();
        return this.getUser();
      } catch (e) {
        console.error("[PlatformSDK] Yandex sign-in process dismissed or failed:", e);
        return null;
      }
    } else if (this.platform === "crazygames" && this.crazygamesSdk?.user) {
      return new Promise((resolve) => {
        this.crazygamesSdk.user.showAuthPrompt((err: any, user: any) => {
          if (err || !user) {
            console.error("[PlatformSDK] CrazyGames login failed or closed:", err);
            resolve(null);
          } else {
            console.log("[PlatformSDK] CrazyGames login success!", user);
            resolve({
              name: user.username,
              avatarUrl: user.profilePictureUrl || undefined,
              isGuest: false,
            });
          }
        });
      });
    }
    return null;
  }

  /**
   * Returns warning callback or invokes warning notifications if authorized status is lite.
   */
  public onAuthWarning(callback: (warning: string | null) => void) {
    this.authWarningCallback = callback;
    // Invoke immediately to register state
    if (this.isInitialized) {
      this.notifyAuthWarning();
    }
  }

  private notifyAuthWarning(forceGuestCheck = true) {
    if (!this.authWarningCallback) return;

    if (this.platform === "yandex") {
      const isGuest = this.ysdkPlayer ? this.ysdkPlayer.getMode() === "lite" : forceGuestCheck;
      if (isGuest) {
        this.authWarningCallback(
          "Внимание! Войдите в аккаунт Яндекс Игр, чтобы сохранить ваш игровой прогресс."
        );
        return;
      }
    }
    this.authWarningCallback(null);
  }

  /**
   * Returns current active runtime platform.
   */
  public getPlatform(): PlatformType {
    return this.platform;
  }

  /**
   * Returns the player's language preference straight from the platform.
   */
  public getLanguage(): "en" | "ru" {
    if (this.platform === "yandex" && this.ysdk?.environment?.i18n?.lang) {
      const lang: string = this.ysdk.environment.i18n.lang;
      return lang.startsWith("ru") ? "ru" : "en";
    }
    
    // Default fallback to browser config
    if (typeof navigator !== "undefined") {
      const bLang = navigator.language || (navigator as any).userLanguage || "ru";
      return bLang.startsWith("ru") ? "ru" : "en";
    }
    return "ru";
  }

  /**
   * Loads player profile payload (username and profile icon).
   */
  public async getUser(): Promise<SDKUser | null> {
    if (this.platform === "yandex" && this.ysdkPlayer) {
      try {
        const isGuest = this.ysdkPlayer.getMode() === "lite";
        return {
          name: this.ysdkPlayer.getName() || "Yandex Player",
          avatarUrl: this.ysdkPlayer.getPhoto ? this.ysdkPlayer.getPhoto("medium") : undefined,
          isGuest,
        };
      } catch (e) {
        console.error("[PlatformSDK] Yandex getUser profile details failed", e);
      }
    } else if (this.platform === "crazygames" && this.crazygamesSdk?.user) {
      return new Promise((resolve) => {
        this.crazygamesSdk.user.getUser((err: any, user: any) => {
          if (err || !user) {
            resolve({
              name: `CrazyPlayer-${Math.floor(100 + Math.random() * 900)}`,
              isGuest: true,
            });
          } else {
            resolve({
              name: user.username,
              avatarUrl: user.profilePictureUrl || undefined,
              isGuest: false,
            });
          }
        });
      });
    }

    return null;
  }

  /**
   * Informs platforms that asset/engine loading completes. Very critical for Yandex Games rules.
   */
  public ready() {
    if (!this.isInitialized) return;

    if (this.platform === "yandex") {
      if (this.ysdk?.features?.LoadingProgress) {
        console.log("[PlatformSDK] Calling Yandex LoadingProgress.ready()...");
        this.ysdk.features.LoadingProgress.ready();
      } else {
        console.log("[PlatformSDK] Calling Yandex fallback ready()...");
        this.ysdk?.ready?.();
      }
    } else if (this.platform === "crazygames") {
      if (this.crazygamesSdk?.game?.loadingComplete) {
        console.log("[PlatformSDK] Calling CrazyGames loadingComplete()...");
        this.crazygamesSdk.game.loadingComplete();
      }
    }
  }

  /**
   * Unified saves system. Uses Server storage for Yandex Games platform, warns anonymous users.
   */
  public async saveData(data: Record<string, any>): Promise<boolean> {
    // Mirror synchronously to localStorage first to guarantee immediate local cache preservation
    this.saveToLocalStorage(data);

    if (this.platform === "yandex" && this.ysdkPlayer) {
      if (this.ysdkPlayer.getMode() === "lite") {
        console.warn("[PlatformSDK] Yandex player is in lite/anonymous mode. Progress backed up to LocalStorage only.");
        this.notifyAuthWarning(true);
        return false;
      }

      try {
        console.log("[PlatformSDK] Saving progress safely on Yandex servers...", data);
        await this.ysdkPlayer.setData(data);
        this.notifyAuthWarning(false);
        return true;
      } catch (e) {
        console.error("[PlatformSDK] Server save failed on Yandex database, backup already cached locally:", e);
        return false;
      }
    } else {
      // CrazyGames and standard local environments use localStorage matching guidelines
      return true;
    }
  }

  /**
   * Unified loader. Pulls from server state on cloud-persisted platforms, local storage otherwise.
   */
  public async loadData(keys: string[]): Promise<Record<string, any> | null> {
    if (this.platform === "yandex" && this.ysdkPlayer) {
      if (this.ysdkPlayer.getMode() === "lite") {
        console.log("[PlatformSDK] Guest mode on Yandex, reading local localStorage saves.");
        return this.loadFromLocalStorage(keys);
      }

      try {
        console.log("[PlatformSDK] Fetching authorized data from Yandex Server database for keys:", keys);
        const serverData = await this.ysdkPlayer.getData(keys);
        const localData = this.loadFromLocalStorage(keys);
        
        // Merge cloud and local dataset, prioritizing cloud values if they exist
        return { ...localData, ...serverData };
      } catch (e) {
        console.error("[PlatformSDK] Yandex cloud load failed, falling back to LocalStorage:", e);
        return this.loadFromLocalStorage(keys);
      }
    } else {
      return this.loadFromLocalStorage(keys);
    }
  }

  private saveToLocalStorage(data: Record<string, any>) {
    try {
      for (const key of Object.keys(data)) {
        const val = typeof data[key] === "object" ? JSON.stringify(data[key]) : String(data[key]);
        localStorage.setItem(key, val);
      }
    } catch (e) {
      console.error("[PlatformSDK] LocalStorage write error:", e);
    }
  }

  private loadFromLocalStorage(keys: string[]): Record<string, any> {
    const data: Record<string, any> = {};
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try {
          data[key] = JSON.parse(raw);
        } catch {
          data[key] = raw; // raw string fallback
        }
      }
    }
    return data;
  }

  /**
   * Fullscreen (midroll) ad presentation.
   */
  public showFullscreenAd(callbacks?: {
    onOpen?: () => void;
    onClose?: (wasShown: boolean) => void;
    onError?: (error: any) => void;
  }) {
    console.log("[PlatformSDK] Fullscreen Ad requested...");

    if (this.platform === "yandex" && this.ysdk) {
      this.ysdk.adv.showFullscreenAdv({
        callbacks: {
          onOpen: () => {
            console.log("[PlatformSDK] Yandex Fullscreen Ad open.");
            callbacks?.onOpen?.();
          },
          onClose: (wasShown: boolean) => {
            console.log(`[PlatformSDK] Yandex Fullscreen Ad closed. wasShown: ${wasShown}`);
            callbacks?.onClose?.(wasShown);
          },
          onError: (err: any) => {
            console.error("[PlatformSDK] Yandex Fullscreen Ad error:", err);
            callbacks?.onError?.(err);
            callbacks?.onClose?.(false);
          },
          onOffline: () => {
            console.warn("[PlatformSDK] Yandex Fullscreen Ad offline.");
            callbacks?.onClose?.(false);
          }
        },
      });
    } else if (this.platform === "crazygames" && this.crazygamesSdk?.ad) {
      this.crazygamesSdk.ad.requestAd("midroll", {
        adStarted: () => {
          console.log("[PlatformSDK] CrazyGames Midroll ad started.");
          callbacks?.onOpen?.();
        },
        adFinished: () => {
          console.log("[PlatformSDK] CrazyGames Midroll ad finished.");
          callbacks?.onClose?.(true);
        },
        adError: (err: any) => {
          console.error("[PlatformSDK] CrazyGames Midroll ad error:", err);
          callbacks?.onError?.(err);
          callbacks?.onClose?.(false);
        },
      });
    } else {
      console.log("[PlatformSDK] No platform SDK active. Executing fallback mock ad workflow...");
      callbacks?.onOpen?.();
      setTimeout(() => {
        callbacks?.onClose?.(true);
      }, 1000);
    }
  }

  /**
   * Rewarded video ad request. Give coins or other items inside this reward callback.
   */
  public showRewardedAd(callbacks: {
    onOpen?: () => void;
    onReward: () => void;
    onClose: () => void;
    onError?: (error: any) => void;
  }) {
    console.log("[PlatformSDK] Rewarded Ad requested...");

    if (this.platform === "yandex" && this.ysdk) {
      this.ysdk.adv.showRewardedVideo({
        callbacks: {
          onOpen: () => {
            console.log("[PlatformSDK] Yandex Rewarded ad open.");
            callbacks.onOpen?.();
          },
          onRewarded: () => {
            console.log("[PlatformSDK] Yandex Rewarded core success callback invoked!");
            callbacks.onReward();
          },
          onClose: () => {
            console.log("[PlatformSDK] Yandex Rewarded ad closed.");
            callbacks.onClose();
          },
          onError: (err: any) => {
            console.error("[PlatformSDK] Yandex Rewarded ad error:", err);
            callbacks.onError?.(err);
            callbacks.onClose();
          },
        },
      });
    } else if (this.platform === "crazygames" && this.crazygamesSdk?.ad) {
      let isRewarded = false;
      this.crazygamesSdk.ad.requestAd("rewarded", {
        adStarted: () => {
          console.log("[PlatformSDK] CrazyGames Rewarded ad started.");
          callbacks.onOpen?.();
        },
        adFinished: () => {
          console.log("[PlatformSDK] CrazyGames Rewarded ad finished.");
          isRewarded = true;
          callbacks.onReward();
          callbacks.onClose();
        },
        adError: (err: any) => {
          console.error("[PlatformSDK] CrazyGames Rewarded ad error:", err);
          callbacks.onError?.(err);
          callbacks.onClose();
        },
      });
    } else {
      console.log("[PlatformSDK] No platform SDK active. Executing fallback mock rewarded ad...");
      callbacks.onOpen?.();
      setTimeout(() => {
        callbacks.onReward();
        callbacks.onClose();
      }, 2000);
    }
  }

  /**
   * Registers a game space / room ID with the CrazyGames SDK so that the native CrazyGames invite button
   * distributed by the portal can reference the correct room and let friends join in.
   */
  public showInviteButton(roomId: string) {
    if (this.platform === "crazygames" && this.crazygamesSdk?.game) {
      try {
        const params = { roomId: roomId, room: roomId };
        if (typeof this.crazygamesSdk.game.showInviteButton === "function") {
          console.log(`[PlatformSDK] Calling crazygamesSdk.game.showInviteButton:`, params);
          this.crazygamesSdk.game.showInviteButton(params);
        } else if (typeof this.crazygamesSdk.game.inviteButton === "function") {
          console.log(`[PlatformSDK] Calling crazygamesSdk.game.inviteButton:`, params);
          this.crazygamesSdk.game.inviteButton(params);
        } else if (typeof this.crazygamesSdk.game.inviteLink === "function") {
          console.log(`[PlatformSDK] Registering room with inviteLink parameter:`, params);
          this.crazygamesSdk.game.inviteLink(params);
        }
      } catch (err) {
        console.error("[PlatformSDK] Error invoking CrazyGames invite integration:", err);
      }
    }
  }

  /**
   * Hides the native CrazyGames invite button / cleans up registration when leaving the room.
   */
  public hideInviteButton() {
    if (this.platform === "crazygames" && this.crazygamesSdk?.game) {
      try {
        if (typeof this.crazygamesSdk.game.hideInviteButton === "function") {
          console.log("[PlatformSDK] Calling crazygamesSdk.game.hideInviteButton");
          this.crazygamesSdk.game.hideInviteButton();
        }
      } catch (err) {
        console.error("[PlatformSDK] Error hiding CrazyGames invite button:", err);
      }
    }
  }
}

export const platformSdk = new PlatformSDK();
export default platformSdk;
