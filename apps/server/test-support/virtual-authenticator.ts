import { createHash, generateKeyPairSync, randomBytes, sign, type KeyObject } from "node:crypto";

// A software authenticator (ES256, user verified, discoverable) that answers the way a browser
// hands the answer to the server, so the passkey routes can be tested without a browser.

const sha256 = (data: Buffer | string) => createHash("sha256").update(data).digest();

function head(major: number, length: number): Buffer {
  if (length < 24) return Buffer.from([(major << 5) | length]);
  if (length < 256) return Buffer.from([(major << 5) | 24, length]);
  return Buffer.from([(major << 5) | 25, length >> 8, length & 255]);
}

type Cbor = number | string | Buffer | Map<Cbor, Cbor>;

function cbor(value: Cbor): Buffer {
  if (typeof value === "number") return value >= 0 ? head(0, value) : head(1, -1 - value);
  if (typeof value === "string") return Buffer.concat([head(3, Buffer.byteLength(value)), Buffer.from(value)]);
  if (Buffer.isBuffer(value)) return Buffer.concat([head(2, value.length), value]);
  const parts: Buffer[] = [head(5, value.size)];
  for (const [k, v] of value) parts.push(cbor(k), cbor(v));
  return Buffer.concat(parts);
}

const UP_UV = 0x05;
const ATTESTED = 0x40;

export interface AssertionOptions {
  /** Defaults to the origin the authenticator was made for. */
  origin?: string;
  rpID?: string;
  counter?: number;
  userHandle?: string | null;
  type?: "webauthn.get" | "webauthn.create";
}

export class VirtualAuthenticator {
  readonly credentialId = randomBytes(16);
  counter = 0;
  private readonly privateKey: KeyObject;
  private readonly x: Buffer;
  private readonly y: Buffer;

  constructor(
    readonly rpID: string,
    readonly origin: string,
    private readonly userHandle: string | null = null
  ) {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    this.privateKey = privateKey;
    const jwk = publicKey.export({ format: "jwk" });
    this.x = Buffer.from(jwk.x as string, "base64url");
    this.y = Buffer.from(jwk.y as string, "base64url");
  }

  get id() {
    return this.credentialId.toString("base64url");
  }

  private clientData(type: string, challenge: string, origin: string) {
    return Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false }));
  }

  /** The answer to navigator.credentials.create(). */
  register(challenge: string, origin = this.origin, rpID = this.rpID) {
    const cose = new Map<Cbor, Cbor>([
      [1, 2],
      [3, -7],
      [-1, 1],
      [-2, this.x],
      [-3, this.y],
    ]);
    const counter = Buffer.alloc(4);
    const idLength = Buffer.alloc(2);
    idLength.writeUInt16BE(this.credentialId.length);
    const authData = Buffer.concat([
      sha256(rpID),
      Buffer.from([UP_UV | ATTESTED]),
      counter,
      Buffer.alloc(16),
      idLength,
      this.credentialId,
      cbor(cose),
    ]);
    const attestation = cbor(
      new Map<Cbor, Cbor>([
        ["fmt", "none"],
        ["attStmt", new Map()],
        ["authData", authData],
      ])
    );
    return {
      id: this.id,
      rawId: this.id,
      type: "public-key" as const,
      response: {
        clientDataJSON: this.clientData("webauthn.create", challenge, origin).toString("base64url"),
        attestationObject: attestation.toString("base64url"),
        transports: ["internal"],
      },
      clientExtensionResults: {},
    };
  }

  /** The answer to navigator.credentials.get(). Each call counts up unless told otherwise. */
  assert(challenge: string, options: AssertionOptions = {}) {
    this.counter = options.counter ?? this.counter + 1;
    const counter = Buffer.alloc(4);
    counter.writeUInt32BE(this.counter);
    const authData = Buffer.concat([sha256(options.rpID ?? this.rpID), Buffer.from([UP_UV]), counter]);
    const clientData = this.clientData(options.type ?? "webauthn.get", challenge, options.origin ?? this.origin);
    const signature = sign("sha256", Buffer.concat([authData, sha256(clientData)]), this.privateKey);
    const handle = options.userHandle === undefined ? this.userHandle : options.userHandle;
    return {
      id: this.id,
      rawId: this.id,
      type: "public-key" as const,
      response: {
        clientDataJSON: clientData.toString("base64url"),
        authenticatorData: authData.toString("base64url"),
        signature: signature.toString("base64url"),
        ...(handle ? { userHandle: Buffer.from(handle).toString("base64url") } : {}),
      },
      clientExtensionResults: {},
    };
  }
}
