import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, isSupportedLocale, type Locale } from '../lib/locales'

import enCommon from './locales/en-CA/common.json'
import enAuth from './locales/en-CA/auth.json'
import enEnums from './locales/en-CA/enums.json'
import enErrors from './locales/en-CA/errors.json'
import enPolicies from './locales/en-CA/policies.json'
import enRequests from './locales/en-CA/requests.json'
import enProfile from './locales/en-CA/profile.json'
import enAdmin from './locales/en-CA/admin.json'
import enReview from './locales/en-CA/review.json'
import enFinance from './locales/en-CA/finance.json'
import enForms from './locales/en-CA/forms.json'

import frCommon from './locales/fr-CA/common.json'
import frAuth from './locales/fr-CA/auth.json'
import frEnums from './locales/fr-CA/enums.json'
import frErrors from './locales/fr-CA/errors.json'
import frPolicies from './locales/fr-CA/policies.json'
import frRequests from './locales/fr-CA/requests.json'
import frProfile from './locales/fr-CA/profile.json'
import frAdmin from './locales/fr-CA/admin.json'
import frReview from './locales/fr-CA/review.json'
import frFinance from './locales/fr-CA/finance.json'
import frForms from './locales/fr-CA/forms.json'

const resources = {
  'en-CA': {
    common: enCommon, auth: enAuth, enums: enEnums, errors: enErrors,
    policies: enPolicies, requests: enRequests, profile: enProfile,
    admin: enAdmin, review: enReview, finance: enFinance, forms: enForms,
  },
  'fr-CA': {
    common: frCommon, auth: frAuth, enums: frEnums, errors: frErrors,
    policies: frPolicies, requests: frRequests, profile: frProfile,
    admin: frAdmin, review: frReview, finance: frFinance, forms: frForms,
  },
} as const

function normalize(detected: string): Locale {
  if (isSupportedLocale(detected)) return detected
  const primary = detected.split('-')[0].toLowerCase()
  const match = SUPPORTED_LOCALES.find((l) => l.split('-')[0] === primary)
  return match ?? DEFAULT_LOCALE
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    defaultNS: 'common',
    ns: ['common', 'auth', 'enums', 'errors', 'policies', 'requests', 'profile', 'admin', 'review', 'finance', 'forms'],
    load: 'currentOnly',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'app.locale',
      caches: ['localStorage'],
      convertDetectedLanguage: normalize,
    },
    interpolation: { escapeValue: false },
    returnNull: false,
    react: {
      // Resources are statically imported above, so there is never anything to
      // suspend on. Disabling Suspense avoids spurious fallback states.
      useSuspense: false,
      // Explicit: re-render every useTranslation() consumer on languageChanged.
      bindI18n: 'languageChanged',
    },
  })

export default i18n
