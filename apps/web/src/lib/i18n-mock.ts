const translations = {
  "home.description": "A modern, fast and secure way to manage your palm trees 🌴",
  "home.documentation": "Documentation",
  "home.starOnGithub": "Star on GitHub",
  "home.privacyMessage": "Your palm trees, your privacy. We take both seriously.",
  "home.header.fileSharing": "Simple & Secure",
  "home.header.tagline": "Palm Tree Management",
};

let currentLanguage = "en";

export const useTranslation = () => {
  return {
    t: (key: string) => translations[key as keyof typeof translations] || key,
    i18n: {
      changeLanguage: async (lang?: string) => {
        if (lang) {
          currentLanguage = lang;
        }
        return Promise.resolve();
      },
      language: currentLanguage,
    },
  };
};
