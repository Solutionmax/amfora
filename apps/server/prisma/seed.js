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
    value: "Veilig bestanden delen, zonder tracking",
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
