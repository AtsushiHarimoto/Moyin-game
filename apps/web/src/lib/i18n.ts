import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from '@/i18n/locales/en.json'
import ja from '@/i18n/locales/ja.json'
import zhCN from '@/i18n/locales/zh-CN.json'
import zhTW from '@/i18n/locales/zh-TW.json'
import zhHK from '@/i18n/locales/zh-HK.json'

const resources = {
  en: { translation: en },
  ja: { translation: ja },
  'zh-CN': { translation: zhCN },
  'zh-TW': { translation: zhTW },
  'zh-HK': { translation: zhHK },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'ja', 'zh-CN', 'zh-TW', 'zh-HK'],

    detection: {
      // Priority: localStorage > browser navigator
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'user-locale',
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already escapes by default
    },

    // Use nested keys: t('message.app_title')
    ns: ['translation'],
    defaultNS: 'translation',
  })

export default i18n
