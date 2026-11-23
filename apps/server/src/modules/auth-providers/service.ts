import crypto from "crypto";

import { prisma } from "../../shared/prisma";
import { createCredentialProof, newSecret, secretHash, SessionClaims } from "../auth/session";
import {
  detectProviderType,
  DISCOVERY_PATHS,
  getFallbackEndpoints,
  getProviderScopes,
  providersConfig,
  shouldSupportDiscovery,
} from "./providers.config";
import { ProviderConfig, ProviderEndpoints, ProviderUserInfo, RequestContextService, TokenResponse } from "./types";

export function authBaseUrl(): string {
  if (!process.env.APP_URL) throw new Error("APP_URL must be configured for external authentication");
  return new URL(process.env.APP_URL).origin;
}
const STATE_EXPIRY_TIME = 600000; // 10 minutes
const DEFAULT_PROVIDER_TYPE = "oidc";

export function redactAuthProvider(provider: Record<string, any>) {
  const { clientSecret, ...safeProvider } = provider;
  return {
    ...safeProvider,
    hasClientSecret: Boolean(clientSecret),
  };
}

const ERROR_MESSAGES = {
  PROVIDER_NOT_FOUND: "Provider not found or disabled",
  CONFIG_NOT_FOUND: "Configuration not found for provider",
  INVALID_STATE: "Invalid or expired state",
  CLIENT_ID_MISSING: "Client ID not configured for provider",
  TOKEN_EXCHANGE_FAILED: "Token exchange failed",
  NO_ACCESS_TOKEN: "No access token received",
  USERINFO_FAILED: "UserInfo request failed",
  NO_EMAIL_FOUND: "No email address found in account",
  MISSING_USER_INFO: "Missing required user information (email or external ID)",
} as const;

export class AuthProvidersService {
  private buildBaseUrl(_requestContext?: RequestContextService): string {
    return authBaseUrl();
  }

  private generateState(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString("base64url");
  }

  private generateCodeChallenge(codeVerifier: string): string {
    return crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  }

  private validateProvider(provider: any, providerName: string): void {
    if (!provider || !provider.enabled) {
      throw new Error(`${ERROR_MESSAGES.PROVIDER_NOT_FOUND}: ${providerName}`);
    }
  }

  private validateConfig(config: ProviderConfig | null, providerName: string): void {
    if (!config) {
      throw new Error(`${ERROR_MESSAGES.CONFIG_NOT_FOUND}: ${providerName}`);
    }
  }

  private validateClientId(provider: any, providerName: string): void {
    if (!provider.clientId) {
      throw new Error(`${ERROR_MESSAGES.CLIENT_ID_MISSING}: ${providerName}`);
    }
  }

  private isOfficial(providerName: string): boolean {
    return providerName in providersConfig.officialProviders;
  }

  private getProviderConfig(provider: any): ProviderConfig {
    const officialConfig = providersConfig.officialProviders[provider.name];
    if (officialConfig) {
      return { ...officialConfig, name: provider.name };
    }

    const detectedType = detectProviderType(provider.issuerUrl || "");
    const providerType = provider.type || detectedType;

    return {
      ...providersConfig.genericProviderTemplate,
      name: provider.name,
      supportsDiscovery: shouldSupportDiscovery(providerType),
      discoveryEndpoint: "/.well-known/openid_configuration",
      fallbackEndpoints: getFallbackEndpoints(providerType),
      authMethod: "body",
      fieldMappings: providersConfig.genericProviderTemplate.fieldMappings,
      specialHandling: providersConfig.genericProviderTemplate.specialHandling,
    };
  }

  private async resolveEndpoints(provider: any, config: ProviderConfig): Promise<ProviderEndpoints> {
    if (provider.authorizationEndpoint && provider.tokenEndpoint && provider.userInfoEndpoint) {
      return {
        authorizationEndpoint: this.resolveEndpointUrl(provider.authorizationEndpoint, provider.issuerUrl),
        tokenEndpoint: this.resolveEndpointUrl(provider.tokenEndpoint, provider.issuerUrl),
        userInfoEndpoint: this.resolveEndpointUrl(provider.userInfoEndpoint, provider.issuerUrl),
      };
    }

    if (config.supportsDiscovery && provider.issuerUrl) {
      const discoveredEndpoints = await this.attemptDiscovery(provider.issuerUrl);
      if (discoveredEndpoints) {
        return discoveredEndpoints;
      }
    }

    const baseUrl = provider.issuerUrl?.replace(/\/$/, "") || "";
    const detectedType = detectProviderType(provider.issuerUrl || "");
    const fallbackPattern = getFallbackEndpoints(detectedType);

    return {
      authorizationEndpoint: `${baseUrl}${fallbackPattern.authorizationEndpoint}`,
      tokenEndpoint: `${baseUrl}${fallbackPattern.tokenEndpoint}`,
      userInfoEndpoint: `${baseUrl}${fallbackPattern.userInfoEndpoint}`,
    };
  }

  private resolveEndpointUrl(endpoint: string, issuerUrl?: string): string {
    if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
      return endpoint;
    }

    if (!issuerUrl) {
      return endpoint;
    }

    const baseUrl = issuerUrl.replace(/\/$/, "");
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${baseUrl}${path}`;
  }

  private async attemptDiscovery(issuerUrl: string): Promise<ProviderEndpoints | null> {
    for (const discoveryPath of DISCOVERY_PATHS) {
      try {
        const discoveryUrl = `${issuerUrl}${discoveryPath}`;
        const response = await fetch(discoveryUrl, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) continue;

        const discoveryData = (await response.json()) as any;
        const endpoints = {
          authorizationEndpoint: discoveryData.authorization_endpoint || "",
          tokenEndpoint: discoveryData.token_endpoint || "",
          userInfoEndpoint: discoveryData.userinfo_endpoint || "",
        };

        if (endpoints.authorizationEndpoint && endpoints.tokenEndpoint) {
          return endpoints;
        }
      } catch {
        continue;
      }
    }
    return null;
  }

  private getAuthMethod(config: ProviderConfig): "body" | "basic" | "header" {
    return config.authMethod || "body";
  }

  private extractUserInfo(rawUserInfo: any, config: ProviderConfig): ProviderUserInfo {
    const userInfo: ProviderUserInfo = { id: "", email: "" };
    const mappings = config.fieldMappings;

    userInfo.id = this.extractField(rawUserInfo, mappings.id) || "";
    userInfo.email = this.extractField(rawUserInfo, mappings.email) || "";
    userInfo.emailVerified =
      rawUserInfo.email_verified === true || (config.name === "discord" && rawUserInfo.verified === true);
    userInfo.name = this.extractField(rawUserInfo, mappings.name);
    userInfo.firstName = this.extractField(rawUserInfo, mappings.firstName);
    userInfo.lastName = this.extractField(rawUserInfo, mappings.lastName);
    userInfo.avatar = this.extractField(rawUserInfo, mappings.avatar);

    return userInfo;
  }

  private extractField(obj: any, fieldNames: string[]): string | undefined {
    if (!obj || !fieldNames.length) return undefined;

    for (const fieldName of fieldNames) {
      if (obj[fieldName] !== undefined && obj[fieldName] !== null) {
        return String(obj[fieldName]);
      }
    }

    return undefined;
  }

  private requiresEmailFetch(config: ProviderConfig): boolean {
    return config.specialHandling?.emailFetchRequired || false;
  }

  private getEmailEndpoint(config: ProviderConfig): string | null {
    return config.specialHandling?.emailEndpoint || null;
  }

  private async buildAuthorizationUrl(
    provider: any,
    endpoints: any,
    callbackUrl: string,
    state: string,
    codeChallenge?: string,
    providerName?: string
  ): Promise<string> {
    this.validateClientId(provider, providerName || provider.name);

    const authUrl = new URL(endpoints.authorizationEndpoint);
    const scopes = getProviderScopes(provider);
    authUrl.searchParams.set("client_id", provider.clientId);
    authUrl.searchParams.set("redirect_uri", callbackUrl);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scopes.join(" "));
    authUrl.searchParams.set("state", state);

    if (codeChallenge) {
      authUrl.searchParams.set("code_challenge", codeChallenge);
      authUrl.searchParams.set("code_challenge_method", "S256");
    }

    return authUrl.toString();
  }

  async getEnabledProviders(requestContext?: RequestContextService) {
    const providers = await prisma.authProvider.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        displayName: true,
        type: true,
        enabled: true,
        issuerUrl: true,
        icon: true,
        sortOrder: true,
      },
    });

    return providers.map((provider) => {
      const authUrl = this.generateAuthUrl(provider, requestContext);

      return {
        id: provider.id,
        name: provider.name,
        displayName: provider.displayName || provider.name,
        type: provider.type,
        icon: provider.icon || "generic",
        authUrl,
        isOfficial: this.isOfficial(provider.name),
        sortOrder: provider.sortOrder,
      };
    });
  }

  async getAllProviders() {
    const providers = await prisma.authProvider.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return providers.map((provider) =>
      redactAuthProvider({
        ...provider,
        isOfficial: this.isOfficial(provider.name),
      })
    );
  }

  async getProviderByName(name: string) {
    return await prisma.authProvider.findFirst({
      where: { name },
    });
  }

  async getProviderById(id: string) {
    return await prisma.authProvider.findUnique({
      where: { id },
    });
  }

  isOfficialProvider(providerName: string): boolean {
    return this.isOfficial(providerName);
  }

  async createProvider(data: any) {
    const provider = await prisma.authProvider.create({
      data: {
        ...data,
        type: data.type || DEFAULT_PROVIDER_TYPE,
        displayName: data.displayName || data.name,
      },
    });

    return redactAuthProvider(provider);
  }

  async updateProvider(id: string, data: any) {
    const updateData = { ...data };
    if (updateData.clientSecret === "" || updateData.clientSecret === null) {
      delete updateData.clientSecret;
    }

    const provider = await prisma.authProvider.update({
      where: { id },
      data: updateData,
    });

    return redactAuthProvider(provider);
  }

  async deleteProvider(id: string) {
    return await prisma.authProvider.delete({
      where: { id },
    });
  }

  private generateAuthUrl(provider: any, requestContext?: RequestContextService) {
    const baseUrl = this.buildBaseUrl(requestContext);
    return `${baseUrl}/api/auth/providers/${provider.name}/authorize`;
  }

  async getAuthorizationUrl(
    providerName: string,
    state?: string,
    redirectUri?: string,
    _requestContext?: RequestContextService,
    browserBinding?: string,
    reauthentication?: SessionClaims
  ) {
    if (state || redirectUri) throw new Error("Caller-supplied state or redirect URI is not allowed");
    if (!browserBinding) throw new Error("Browser binding required");
    const provider = await this.getProviderByName(providerName);
    this.validateProvider(provider, providerName);
    const config = this.getProviderConfig(provider);
    const baseUrl = authBaseUrl();
    const callbackUrl = `${baseUrl}/api/auth/providers/${providerName}/callback`;
    if (provider!.redirectUri && provider!.redirectUri !== callbackUrl)
      throw new Error("Provider redirect URI must match APP_URL callback");
    if (
      reauthentication &&
      !(await prisma.userAuthProvider.findFirst({
        where: { userId: reauthentication.userId, providerId: provider!.id },
      }))
    )
      throw new Error("Provider is not linked to this account");
    const finalState = this.generateState();
    const codeVerifier = this.generateCodeVerifier();
    const nonce = newSecret();
    await prisma.oAuthTransaction.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    await prisma.oAuthTransaction.create({
      data: {
        id: secretHash(finalState),
        bindingHash: secretHash(browserBinding),
        providerId: provider!.id,
        codeVerifier,
        callbackUrl,
        nonce,
        expiresAt: new Date(Date.now() + STATE_EXPIRY_TIME),
        sessionId: reauthentication?.sid,
        userId: reauthentication?.userId,
        sessionVersion: reauthentication?.version,
      },
    });
    const endpoints = await this.resolveEndpoints(provider, config);
    const url = new URL(
      await this.buildAuthorizationUrl(
        provider,
        endpoints,
        callbackUrl,
        finalState,
        this.generateCodeChallenge(codeVerifier),
        providerName
      )
    );
    if (provider!.type === "oidc" || getProviderScopes(provider).includes("openid"))
      url.searchParams.set("nonce", nonce);
    if (reauthentication) {
      url.searchParams.set("prompt", "login");
      url.searchParams.set("max_age", "0");
    }
    return url.toString();
  }

  async handleCallback(
    providerName: string,
    code: string,
    state: string,
    _requestContext?: RequestContextService,
    browserBinding?: string,
    currentSession?: SessionClaims
  ) {
    const provider = await this.getProviderByName(providerName);
    this.validateProvider(provider, providerName);
    if (!browserBinding) throw new Error(ERROR_MESSAGES.INVALID_STATE);
    const transaction = await prisma.oAuthTransaction.findUnique({ where: { id: secretHash(state) } });
    if (
      !transaction ||
      transaction.bindingHash !== secretHash(browserBinding) ||
      transaction.providerId !== provider!.id ||
      transaction.expiresAt.getTime() <= Date.now()
    )
      throw new Error(ERROR_MESSAGES.INVALID_STATE);
    const consumed = await prisma.oAuthTransaction.deleteMany({
      where: {
        id: transaction.id,
        bindingHash: secretHash(browserBinding),
        providerId: provider!.id,
        expiresAt: { gt: new Date(Date.now()) },
      },
    });
    if (consumed.count !== 1) throw new Error(ERROR_MESSAGES.INVALID_STATE);
    const config = this.getProviderConfig(provider);
    let tokens: TokenResponse;
    let rawUserInfo: any;
    if (provider!.type === "oidc" || getProviderScopes(provider).includes("openid")) {
      if (!provider!.issuerUrl) throw new Error("OIDC issuer URL is required");
      const oidc = await import("openid-client");
      const configuration = await oidc.discovery(
        new URL(provider!.issuerUrl),
        provider!.clientId!,
        provider!.clientSecret ?? undefined,
        !provider!.clientSecret
          ? oidc.None()
          : this.getAuthMethod(config) === "basic"
            ? oidc.ClientSecretBasic(provider!.clientSecret)
            : oidc.ClientSecretPost(provider!.clientSecret)
      );
      oidc.enableNonRepudiationChecks(configuration);
      const callback = new URL(transaction.callbackUrl);
      callback.searchParams.set("code", code);
      callback.searchParams.set("state", state);
      const verified = await oidc.authorizationCodeGrant(configuration, callback, {
        expectedState: state,
        pkceCodeVerifier: transaction.codeVerifier,
        expectedNonce: transaction.nonce,
        idTokenExpected: true,
        ...(transaction.sessionId ? { maxAge: 0 } : {}),
      });
      const claims = verified.claims();
      if (!claims?.sub) throw new Error("OIDC subject is required");
      tokens = verified as TokenResponse;
      rawUserInfo = await oidc.fetchUserInfo(configuration, verified.access_token, claims.sub);
      rawUserInfo.sub = claims.sub;
    } else {
      const endpoints = await this.resolveEndpoints(provider, config);
      tokens = await this.executeTokenRequest(
        provider,
        code,
        transaction.callbackUrl,
        transaction.codeVerifier,
        this.getAuthMethod(config),
        endpoints
      );
      rawUserInfo = await this.fetchUserInfo(tokens, endpoints);
    }
    const userInfo = await this.processUserInfo(rawUserInfo, tokens, config);
    if (provider!.type === "oidc" || getProviderScopes(provider).includes("openid")) userInfo.id = rawUserInfo.sub;
    if (transaction.sessionId) {
      const session = await prisma.session.findUnique({
        where: { id: transaction.sessionId },
        include: { user: true },
      });
      const association = await this.findExistingAuthProvider(provider!.id, userInfo.id);
      if (
        !currentSession ||
        currentSession.sid !== transaction.sessionId ||
        currentSession.version !== transaction.sessionVersion ||
        !session ||
        session.userId !== transaction.userId ||
        !session.user.isActive ||
        session.expiresAt.getTime() <= Date.now() ||
        session.version !== transaction.sessionVersion ||
        session.user.sessionVersion !== transaction.sessionVersion ||
        association?.userId !== session.userId
      )
        throw new Error("Credential verification failed");
      await this.findOrCreateUser(userInfo, provider);
      return {
        user: session.user,
        redirectUrl: `${authBaseUrl()}/profile`,
        credentialProof: await createCredentialProof({
          userId: session.userId,
          sid: session.id,
          version: session.version,
          isAdmin: session.user.isAdmin,
        }),
      };
    }
    return { user: await this.findOrCreateUser(userInfo, provider), redirectUrl: `${authBaseUrl()}/dashboard` };
  }

  private async executeTokenRequest(
    provider: any,
    code: string,
    callbackUrl: string,
    codeVerifier: string,
    authMethod: string,
    endpoints: any
  ): Promise<TokenResponse> {
    const body = new URLSearchParams();
    body.append("client_id", provider.clientId);
    body.append("code", code);
    body.append("redirect_uri", callbackUrl);
    body.append("grant_type", "authorization_code");

    if (authMethod === "body" && provider.clientSecret) {
      body.append("client_secret", provider.clientSecret);
    }

    if (codeVerifier) {
      body.append("code_verifier", codeVerifier);
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    };

    if (authMethod === "basic" && provider.clientSecret) {
      const auth = Buffer.from(`${provider.clientId}:${provider.clientSecret}`).toString("base64");
      headers["Authorization"] = `Basic ${auth}`;
    }

    const tokenResponse = await fetch(endpoints.tokenEndpoint, {
      method: "POST",
      headers,
      body,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`${ERROR_MESSAGES.TOKEN_EXCHANGE_FAILED}: ${tokenResponse.status} - ${errorText}`);
    }

    const tokens = (await tokenResponse.json()) as TokenResponse;

    if (!tokens.access_token) {
      throw new Error(ERROR_MESSAGES.NO_ACCESS_TOKEN);
    }

    return tokens;
  }

  private async fetchUserInfo(tokens: TokenResponse, endpoints: any): Promise<any> {
    const userInfoResponse = await fetch(endpoints.userInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: "application/json",
      },
    });

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      throw new Error(`${ERROR_MESSAGES.USERINFO_FAILED}: ${userInfoResponse.status} - ${errorText}`);
    }

    return await userInfoResponse.json();
  }

  private async processUserInfo(
    rawUserInfo: any,
    tokens: TokenResponse,
    config: ProviderConfig
  ): Promise<ProviderUserInfo> {
    const userInfo = this.extractUserInfo(rawUserInfo, config);

    if (this.requiresEmailFetch(config)) {
      const emailEndpoint = this.getEmailEndpoint(config);
      if (emailEndpoint) {
        const email = await this.fetchEmailFromEndpoint(emailEndpoint, tokens.access_token);
        if (email) {
          userInfo.email = email;
          userInfo.emailVerified = true;
        }
      }
    }

    if (!userInfo.email) {
      throw new Error(`${ERROR_MESSAGES.NO_EMAIL_FOUND} in ${config.name} account`);
    }

    return userInfo;
  }

  private async fetchEmailFromEndpoint(endpoint: string, accessToken: string): Promise<string | null> {
    try {
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const data: any = await response.json();

        if (Array.isArray(data)) {
          const primaryEmail = data.find((e: any) => e.primary && e.verified);
          if (primaryEmail) return primaryEmail.email;

          const verifiedEmail = data.find((e: any) => e.verified);
          if (verifiedEmail) return verifiedEmail.email;
        }

        if (data.email && data.email_verified === true) return data.email;
      }
    } catch (error) {
      console.error("Error fetching email from endpoint:", error);
    }

    return null;
  }

  private async findOrCreateUser(userInfo: ProviderUserInfo, provider: any) {
    const externalId = userInfo.id;

    if (!userInfo.email || !externalId) {
      throw new Error(ERROR_MESSAGES.MISSING_USER_INFO);
    }

    const issuer = provider.issuerUrl || new URL(provider.tokenEndpoint).origin;
    const existingAuthProvider = await this.findExistingAuthProvider(provider.id, String(externalId));
    if (existingAuthProvider) {
      let pinnedIssuer: unknown;
      try {
        pinnedIssuer = JSON.parse(existingAuthProvider.metadata || "{}").issuer;
      } catch {
        /* Legacy malformed metadata fails closed. */
      }
      if (pinnedIssuer !== issuer)
        throw new Error("Provider issuer does not match the linked account; check the migrated provider configuration");
      return await this.updateExistingUserFromProvider(existingAuthProvider.user, userInfo);
    }

    const existingUser = await this.findExistingUserByEmail(userInfo.email);
    if (existingUser)
      throw new Error(
        "An account with this email already exists. Sign in with its existing method; implicit provider linking is disabled."
      );

    // Check if auto-registration is disabled
    if (provider.autoRegister === false) {
      throw new Error(`User registration via ${provider.displayName || provider.name} is disabled`);
    }

    if (!userInfo.emailVerified) throw new Error("A verified email is required for registration");
    return await this.createNewUserWithProvider(userInfo, provider.id, String(externalId), issuer);
  }

  private async findExistingAuthProvider(providerId: string, externalId: string) {
    return await prisma.userAuthProvider.findUnique({
      where: {
        providerId_externalId: {
          providerId,
          externalId,
        },
      },
      include: {
        user: true,
      },
    });
  }

  private async findExistingUserByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  private buildUserUpdateData(existingUser: any, userInfo: ProviderUserInfo): any {
    const updateData: any = {};

    if (!existingUser.firstName && userInfo.firstName) {
      updateData.firstName = userInfo.firstName;
    }

    if (!existingUser.lastName && userInfo.lastName) {
      updateData.lastName = userInfo.lastName;
    }

    if (!existingUser.image && userInfo.avatar) {
      updateData.image = userInfo.avatar;
    }

    return updateData;
  }

  private async updateExistingUserFromProvider(existingUser: any, userInfo: ProviderUserInfo) {
    if (!existingUser.isActive) throw new Error("Account is inactive");
    const updateData = this.buildUserUpdateData(existingUser, userInfo);

    if (Object.keys(updateData).length > 0) {
      const updated = await prisma.user.update({ where: { id: existingUser.id }, data: updateData });
      return { ...updated, sessionVersion: existingUser.sessionVersion };
    }

    return existingUser;
  }

  private generateUserNames(userInfo: ProviderUserInfo) {
    const displayName = userInfo.name || userInfo.email.split("@")[0];
    const firstName = userInfo.firstName || displayName.split(" ")[0] || userInfo.email.split("@")[0];
    const lastName =
      userInfo.lastName || (displayName.split(" ").length > 1 ? displayName.split(" ").slice(1).join(" ") : "");

    return { firstName, lastName };
  }

  private async createNewUserWithProvider(
    userInfo: ProviderUserInfo,
    providerId: string,
    externalId: string,
    issuer: string
  ) {
    const { firstName, lastName } = this.generateUserNames(userInfo);

    return await prisma.user.create({
      data: {
        email: userInfo.email,
        username: userInfo.email.split("@")[0],
        firstName,
        lastName,
        image: userInfo.avatar || null,
        isAdmin: false,
        authProviders: {
          create: {
            providerId,
            externalId,
            metadata: JSON.stringify({ issuer }),
          },
        },
      },
    });
  }

  async updateProvidersOrder(providersOrder: { id: string; sortOrder: number }[]) {
    const updatePromises = providersOrder.map((provider) =>
      prisma.authProvider.update({
        where: { id: provider.id },
        data: { sortOrder: provider.sortOrder },
      })
    );

    await prisma.$transaction(updatePromises);
    return { success: true };
  }
}
