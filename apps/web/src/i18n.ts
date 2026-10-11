import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import bn from "./locales/bn.json";
import hi from "./locales/hi.json";

const savedLang = localStorage.getItem("agrishield_lang") || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    bn: { translation: bn },
    hi: { translation: hi },
  },
  lng: savedLang,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export const changeLanguage = (lang: string) => {
  localStorage.setItem("agrishield_lang", lang);
  i18n.changeLanguage(lang);
};

export default i18n;
