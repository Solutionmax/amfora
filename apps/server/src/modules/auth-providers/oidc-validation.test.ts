import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { exportJWK, generateKeyPair, SignJWT } from "jose";

import { useTestDatabase } from "../../../test-support/test-db";

const database = useTestDatabase();
process.env.APP_URL = "http://localhost:3400";
let app: Awaited<ReturnType<typeof import("../../app").buildApp>>;
let prisma: typeof import("../../shared/prisma").prisma;
let keys: Awaited<ReturnType<typeof generateKeyPair>>;
let alternate: Awaited<ReturnType<typeof generateKeyPair>>;
let nonce = "",
  defect = "";
const issuer = "https://idp-oidc.test";
const oldFetch = global.fetch;
before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  const { buildApp } = await import("../../app");
  const { registerRoutes } = await import("../../routes");
  app = await buildApp();
  registerRoutes(app);
  await app.ready();
  keys = await generateKeyPair("RS256");
  alternate = await generateKeyPair("RS256");
  await prisma.authProvider.create({
    data: {
      id: "oidc",
      name: "oidc-test",
      displayName: "OIDC",
      type: "oidc",
      issuerUrl: issuer,
      clientId: "amfora",
      clientSecret: "secret",
      enabled: true,
      autoRegister: true,
      authorizationEndpoint: `${issuer}/authorize`,
      tokenEndpoint: `${issuer}/token`,
      userInfoEndpoint: `${issuer}/userinfo`,
    },
  });
  global.fetch = (async (input: any) => {
    const url = String(input);
    let data: unknown;
    if (url.includes(".well-known"))
      data = {
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        userinfo_endpoint: `${issuer}/userinfo`,
        jwks_uri: `${issuer}/jwks`,
        id_token_signing_alg_values_supported: ["RS256"],
        response_types_supported: ["code"],
      };
    else if (url.endsWith("/jwks"))
      data = { keys: [{ ...(await exportJWK(keys.publicKey)), kid: "test", alg: "RS256", use: "sig" }] };
    else if (url.endsWith("/token")) {
      const id_token = await new SignJWT({
        nonce: defect === "nonce" ? "wrong" : nonce,
        email: "oidc-member@example.test",
        email_verified: true,
      })
        .setProtectedHeader({ alg: "RS256", kid: "test" })
        .setIssuer(defect === "issuer" ? "https://evil.test" : issuer)
        .setAudience(defect === "audience" ? "other-client" : "amfora")
        .setSubject("oidc-subject")
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(defect === "signature" ? alternate.privateKey : keys.privateKey);
      data = { access_token: "access", token_type: "Bearer", expires_in: 300, id_token };
    } else
      data = {
        sub: defect === "userinfo-subject" ? "other-subject" : "oidc-subject",
        email: "oidc-member@example.test",
        email_verified: true,
      };
    return new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
  }) as typeof fetch;
});
after(async () => {
  global.fetch = oldFetch;
  await app.close();
  await prisma.$disconnect();
  database.cleanup();
});
async function flow(bad: string) {
  defect = bad;
  const authorization = await app.inject({ url: "/auth/providers/oidc-test/authorize" });
  assert.equal(authorization.statusCode, 302, authorization.body);
  const url = new URL(authorization.headers.location!);
  nonce = url.searchParams.get("nonce") || "";
  const binding = authorization.cookies.find((c) => c.name === "oauth-binding")?.value;
  return app.inject({
    url: `/auth/providers/oidc-test/callback?code=code&state=${url.searchParams.get("state")}`,
    cookies: binding ? { "oauth-binding": binding } : undefined,
  });
}
test("valid OIDC signature/issuer/audience/nonce and subject allows verified new registration", async () => {
  const res = await flow("");
  assert.equal(
    res.cookies.some((c) => c.name === "token"),
    true,
    res.headers.location
  );
  assert.equal(await prisma.user.count({ where: { email: "oidc-member@example.test" } }), 1);
});
for (const defect of ["signature", "issuer", "audience", "nonce", "userinfo-subject"])
  test(`OIDC ${defect} mismatch cannot establish session`, async () => {
    const res = await flow(defect);
    assert.equal(
      res.cookies.some((c) => c.name === "token"),
      false,
      res.headers.location
    );
  });
test("OIDC public PKCE client without a client secret remains supported", async () => {
  await prisma.authProvider.update({ where: { id: "oidc" }, data: { clientSecret: null } });
  const res = await flow("");
  assert.equal(
    res.cookies.some((c) => c.name === "token"),
    true,
    res.headers.location
  );
});
