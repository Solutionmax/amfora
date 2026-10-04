import { isIP } from "node:net";
import path from "node:path";
import type { FastifyRequest } from "fastify";
import maxmind, { type CityResponse, type Reader } from "maxmind";

/**
 * Turns the address of a visitor into a place, and forgets the address. The database is one the
 * operator supplies (any MaxMind format city or country database); without it every public
 * address is simply unknown.
 */

export type PlaceMode = "city" | "country" | "off";

/** Where the database is looked for. The data directory survives upgrades. */
const DATABASE_PATH = process.env.GEOIP_DATABASE || path.join(process.cwd(), "geoip", "city.mmdb");

/** Set by Cloudflare. The web process only passes it on when the operator trusts client headers. */
const CLIENT_ADDRESS_HEADER = "cf-connecting-ip";

export const LOCAL_NETWORK = "Local network";

let reader: Reader<CityResponse> | null | undefined;

async function openReader(): Promise<Reader<CityResponse> | null> {
  if (reader !== undefined) return reader;
  try {
    reader = await maxmind.open<CityResponse>(DATABASE_PATH);
  } catch {
    // No database is a supported way to run; places are then left out.
    reader = null;
  }
  return reader;
}

/** For tests, and after the operator replaces the file. */
export function resetPlaceDatabase(): void {
  reader = undefined;
}

/** Name of the database in use, so the interface can give credit where the license asks for it. */
export async function placeSource(): Promise<string | null> {
  return (await openReader())?.metadata.databaseType ?? null;
}

export function isPrivateAddress(address: string): boolean {
  const ip = address.replace(/^::ffff:/i, "");
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)
    );
  }
  const lower = ip.toLowerCase();
  return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80:");
}

/** The address a request came from, as far as this server may believe it. */
export function clientAddress(request: Pick<FastifyRequest, "headers" | "ip">): string {
  const header = request.headers[CLIENT_ADDRESS_HEADER];
  const forwarded = (Array.isArray(header) ? header[0] : header)?.trim();
  return forwarded && isIP(forwarded) ? forwarded : request.ip;
}

export function formatPlace(found: CityResponse | null, mode: PlaceMode): string | null {
  const code = found?.country?.iso_code;
  if (!code) return null;
  if (mode === "country") return found?.country?.names?.en ?? code;
  const city = found?.city?.names?.en;
  return city ? `${city}, ${code}` : (found?.country?.names?.en ?? code);
}

export async function placeOf(address: string | undefined, mode: PlaceMode): Promise<string | null> {
  if (mode === "off" || !address || !isIP(address.replace(/^::ffff:/i, ""))) return null;
  if (isPrivateAddress(address)) return LOCAL_NETWORK;
  const database = await openReader();
  if (!database) return null;
  try {
    return formatPlace(database.get(address.replace(/^::ffff:/i, "")), mode);
  } catch {
    return null;
  }
}
