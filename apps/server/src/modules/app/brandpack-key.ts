/**
 * The public half of the brandpack signing key, built into the server on purpose.
 *
 * It is not configurable: a key an operator could set would let anyone sign their own
 * pack with the public script and switch off the paid restrictions while still running
 * the official images and receiving updates. A fork that wants its own key changes this
 * constant, which the Apache-2.0 licence allows.
 */
export const BRANDPACK_PUBLIC_KEY = "a329bd6b2d08bb001a5f5cd9f1aa7559efe82ae594416a4cfc16a69f501ca756";
