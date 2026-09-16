const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

const defaultConfigs = [
  // General Configurations
  {
    key: "appName",
    value: "Amfora",
    type: "string",
    group: "general",
  },
  {
    key: "showHomePage",
    value: "true",
    type: "boolean",
    group: "general",
  },
  {
    key: "appPrimaryColor",
    value: "oklch(0.5686 0.1630 250.47)",
    type: "string",
    group: "general",
  },
  {
    key: "appFontFamily",
    value: "var(--font-jakarta)",
    type: "string",
    group: "general",
  },
  {
    key: "appRadius",
    value: "1rem",
    type: "string",
    group: "general",
  },
  {
    key: "hideVersion",
    value: "false",
    type: "boolean",
    group: "general",
  },
  {
    key: "appDescription",
    value: "Secure file sharing, without tracking",
    type: "string",
    group: "general",
  },
  {
    key: "appLogo",
    value: "data:image/webp;base64,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",
    type: "string",
    group: "general",
  },
  {
    key: "firstUserAccess",
    value: "true",
    type: "boolean",
    group: "general",
  },
  // Storage Configurations
  {
    key: "maxFileSize",
    value: "1073741824", // default 1GiB in bytes
    type: "bigint",
    group: "storage",
  },
  {
    key: "maxTotalStoragePerUser",
    value: "10737418240", // 10GB in bytes
    type: "bigint",
    group: "storage",
  },
  // Security Configurations
  {
    key: "jwtSecret",
    value: crypto.randomBytes(64).toString("hex"),
    type: "string",
    group: "security",
  },
  {
    key: "maxLoginAttempts",
    value: "5",
    type: "number",
    group: "security",
  },
  {
    key: "loginBlockDuration",
    value: "600", // 10 minutes in seconds
    type: "number",
    group: "security",
  },
  {
    key: "passwordMinLength",
    value: "8",
    type: "number",
    group: "security",
  },
  // Email Configurations
  {
    key: "smtpEnabled",
    value: "false",
    type: "boolean",
    group: "email",
  },
  {
    key: "smtpHost",
    value: "smtp.gmail.com",
    type: "string",
    group: "email",
  },
  {
    key: "smtpPort",
    value: "587",
    type: "number",
    group: "email",
  },
  {
    key: "smtpUser",
    value: "your-email@gmail.com",
    type: "string",
    group: "email",
  },
  {
    key: "smtpPass",
    value: "your-app-specific-password",
    type: "string",
    group: "email",
  },
  {
    key: "smtpFromName",
    value: "Palmr",
    type: "string",
    group: "email",
  },
  {
    key: "smtpFromEmail",
    value: "noreply@palmr.app",
    type: "string",
    group: "email",
  },
  {
    key: "smtpSecure",
    value: "auto",
    type: "string",
    group: "email",
  },
  {
    key: "smtpNoAuth",
    value: "false",
    type: "boolean",
    group: "email",
  },
  {
    key: "smtpTrustSelfSigned",
    value: "false",
    type: "boolean",
    group: "email",
  },
  {
    key: "passwordResetTokenExpiration",
    value: "3600",
    type: "number",
    group: "security",
  },
  // Auth Providers Global Configuration
  {
    key: "authProvidersEnabled",
    value: "true",
    type: "boolean",
    group: "auth-providers",
  },
  {
    key: "passwordAuthEnabled",
    value: "true",
    type: "boolean",
    group: "security",
  },
  {
    key: "serverUrl",
    value: "http://localhost:3333",
    type: "string",
    group: "general",
  },
];

const defaultAuthProviders = [
  {
    name: "google",
    displayName: "Google",
    type: "oauth2",
    icon: "FcGoogle",
    enabled: false,
    issuerUrl: "https://accounts.google.com",
    authorizationEndpoint: "/o/oauth2/v2/auth",
    tokenEndpoint: "/o/oauth2/token",
    userInfoEndpoint: "https://www.googleapis.com/oauth2/v3/userinfo",
    scope: "openid profile email",
    sortOrder: 1,
    metadata: JSON.stringify({
      description: "Sign in with your Google account",
      docs: "https://developers.google.com/identity/protocols/oauth2",
      supportsDiscovery: true,
      authMethod: "body",
    }),
  },
  {
    name: "discord",
    displayName: "Discord",
    type: "oauth2",
    icon: "FaDiscord",
    enabled: false,
    issuerUrl: "https://discord.com",
    authorizationEndpoint: "/oauth2/authorize",
    tokenEndpoint: "/api/oauth2/token",
    userInfoEndpoint: "/api/users/@me",
    scope: "identify email",
    sortOrder: 2,
    metadata: JSON.stringify({
      description: "Sign in with your Discord account",
      docs: "https://discord.com/developers/docs/topics/oauth2",
      supportsDiscovery: false,
      authMethod: "body",
    }),
  },
  {
    name: "github",
    displayName: "GitHub",
    type: "oauth2",
    icon: "SiGithub",
    enabled: false,
    issuerUrl: "https://github.com/login/oauth", // URL fixa do GitHub
    authorizationEndpoint: "/authorize",
    tokenEndpoint: "/access_token",
    userInfoEndpoint: "https://api.github.com/user", // GitHub usa URL absoluta para userInfo
    scope: "user:email",
    sortOrder: 3,
    metadata: JSON.stringify({
      description: "Sign in with your GitHub account",
      docs: "https://docs.github.com/en/developers/apps/building-oauth-apps",
      specialHandling: "email_fetch_required",
    }),
  },
  {
    name: "auth0",
    displayName: "Auth0",
    type: "oidc",
    icon: "SiAuth0",
    enabled: false,
    issuerUrl: "https://your-tenant.auth0.com", // Placeholder - usuário deve configurar
    authorizationEndpoint: "/authorize",
    tokenEndpoint: "/oauth/token",
    userInfoEndpoint: "/userinfo",
    scope: "openid profile email",
    sortOrder: 4,
    metadata: JSON.stringify({
      description: "Sign in with Auth0 - Replace 'your-tenant' with your Auth0 domain",
      docs: "https://auth0.com/docs/get-started/authentication-and-authorization-flow",
      supportsDiscovery: true,
    }),
  },
  {
    name: "kinde",
    displayName: "Kinde Auth",
    type: "oidc",
    icon: "FaKey",
    enabled: false,
    issuerUrl: "https://your-tenant.kinde.com", // Placeholder - usuário deve configurar
    authorizationEndpoint: "/oauth2/auth",
    tokenEndpoint: "/oauth2/token",
    userInfoEndpoint: "/oauth2/user_profile",
    scope: "openid profile email",
    sortOrder: 5,
    metadata: JSON.stringify({
      description: "Sign in with Kinde - Replace 'your-tenant' with your Kinde domain",
      docs: "https://kinde.com/docs/developer-tools/about/",
      supportsDiscovery: true,
    }),
  },
  {
    name: "zitadel",
    displayName: "Zitadel",
    type: "oidc",
    icon: "FaShield",
    enabled: false,
    issuerUrl: "https://your-instance.zitadel.cloud", // Placeholder - usuário deve configurar
    authorizationEndpoint: "/oauth/v2/authorize",
    tokenEndpoint: "/oauth/v2/token",
    userInfoEndpoint: "/oidc/v1/userinfo",
    scope: "openid profile email",
    sortOrder: 6,
    metadata: JSON.stringify({
      description: "Sign in with Zitadel - Replace with your Zitadel instance URL",
      docs: "https://zitadel.com/docs/guides/integrate/login/oidc",
      supportsDiscovery: true,
      authMethod: "basic",
    }),
  },
  {
    name: "authentik",
    displayName: "Authentik",
    type: "oidc",
    icon: "FaShieldAlt",
    enabled: false,
    issuerUrl: "https://your-authentik.domain.com", // Placeholder - usuário deve configurar
    authorizationEndpoint: "/application/o/authorize/",
    tokenEndpoint: "/application/o/token/",
    userInfoEndpoint: "/application/o/userinfo/",
    scope: "openid profile email",
    sortOrder: 7,
    metadata: JSON.stringify({
      description: "Sign in with Authentik - Replace with your Authentik instance URL",
      docs: "https://goauthentik.io/docs/providers/oauth2",
      supportsDiscovery: true,
    }),
  },
  {
    name: "frontegg",
    displayName: "Frontegg",
    type: "oidc",
    icon: "FaEgg",
    enabled: false,
    issuerUrl: "https://your-tenant.frontegg.com", // Placeholder - usuário deve configurar
    authorizationEndpoint: "/oauth/authorize",
    tokenEndpoint: "/oauth/token",
    userInfoEndpoint: "/identity/resources/users/v2/me",
    scope: "openid profile email",
    sortOrder: 8,
    metadata: JSON.stringify({
      description: "Sign in with Frontegg - Replace 'your-tenant' with your Frontegg tenant",
      docs: "https://docs.frontegg.com",
      supportsDiscovery: true,
    }),
  },
  {
    name: "pocketid",
    displayName: "Pocket ID",
    type: "oidc",
    icon: "BsFillPSquareFill",
    enabled: false,
    issuerUrl: "https://your-pocket-id.domain.com",
    authorizationEndpoint: "/authorize",
    tokenEndpoint: "/api/oidc/token",
    userInfoEndpoint: "/api/oidc/userinfo",
    scope: "openid profile email",
    sortOrder: 9,
    metadata: JSON.stringify({
      description: "Sign in with Pocket ID - Replace with your Pocket ID instance URL",
      docs: "https://docs.pocket-id.org",
      supportsDiscovery: true,
    }),
  },
];

async function main() {
  console.log("🌱 Starting app configurations seed...");
  console.log("🛡️  Protected mode: Only creates missing configurations");

  let createdCount = 0;
  let skippedCount = 0;

  for (const config of defaultConfigs) {
    const existingConfig = await prisma.appConfig.findUnique({
      where: { key: config.key },
    });

    if (existingConfig) {
      console.log(`⏭️  Configuration '${config.key}' already exists, skipping...`);
      skippedCount++;
      continue;
    }

    await prisma.appConfig.create({
      data: config,
    });

    console.log(`✅ Created configuration: ${config.key}`);
    createdCount++;
  }

  console.log("\n📊 Seed Summary:");
  console.log(`   ✅ Created: ${createdCount} configurations`);
  console.log(`   ⏭️  Skipped: ${skippedCount} configurations`);
  console.log("🎉 App configurations seeded successfully!");

  // Seed Auth Providers
  console.log("\n🔐 Starting auth providers seed...");
  console.log("🛡️  Protected mode: Only creates missing providers");

  let providersCreatedCount = 0;
  let providersSkippedCount = 0;

  for (const provider of defaultAuthProviders) {
    const existingProvider = await prisma.authProvider.findUnique({
      where: { name: provider.name },
    });

    if (existingProvider) {
      console.log(`⏭️  Auth provider '${provider.name}' already exists, skipping...`);
      providersSkippedCount++;
      continue;
    }

    await prisma.authProvider.create({
      data: provider,
    });

    console.log(`✅ Created auth provider: ${provider.displayName} (${provider.name})`);
    providersCreatedCount++;
  }

  console.log("\n📊 Auth Providers Summary:");
  console.log(`   ✅ Created: ${providersCreatedCount} providers`);
  console.log(`   ⏭️  Skipped: ${providersSkippedCount} providers`);
  console.log("🎉 Auth providers seeded successfully!");
}

main()
  .catch((error) => {
    console.error("Error during seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
