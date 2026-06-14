import { translations, Language } from "../translations";

export class GameLocalization {
  private static customDict: Record<Language, Record<string, string>> = {
    ru: {
      alertLasers: "Берегись лазеров!",
      alertBomb: "Берегись бомбы! {time} сек",
      boom: "БУМ!",
      survivors: "Остались",
      nobody: "Никого",
      proximityPress: "НАЖАТЬ",
      proximityButton: "Кнопка",
    },
    en: {
      alertLasers: "Watch out for lasers!",
      alertBomb: "Watch out for the bomb! {time} sec",
      boom: "BOOM!",
      survivors: "Remaining",
      nobody: "Nobody",
      proximityPress: "PRESS",
      proximityButton: "Button",
    }
  };

  /**
   * Detects the current active locale dynamically
   */
  public static getLanguage(): Language {
    if (typeof document !== "undefined") {
      if (document.documentElement.classList.contains("lang-ru")) {
        return "ru";
      }
    }
    return "en";
  }

  /**
   * Core localization translation function with support for template replacements and central fallbacks
   */
  public static t(key: string, replacements?: Record<string, string | number>): string {
    const lang = this.getLanguage();
    
    // Check local custom dictionary first
    let text = this.customDict[lang]?.[key];
    
    // If missing, seek in the central translations map
    if (!text) {
      const central = translations[lang];
      if (central) {
        text = (central as any)[key];
      }
    }
    
    // Fall back to English custom dict then key itself if missing completely
    if (!text) {
      text = this.customDict.en?.[key] || key;
    }
    
    // Process templated strings like {username}
    if (replacements) {
      Object.entries(replacements).forEach(([k, val]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(val));
      });
    }
    
    return text;
  }
}
