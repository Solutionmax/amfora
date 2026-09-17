import assert from "node:assert/strict";
import { test } from "node:test";
import nodemailer from "nodemailer";

import { ConfigService } from "../modules/config/service";
import { EmailService } from "../modules/email/service";

const originalNodeEnv = process.env.NODE_ENV;
const originalAppUrl = process.env.APP_URL;

const restoreEnvironment = () => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = originalAppUrl;
};

test("password reset email always uses the configured application URL", async () => {
  process.env.NODE_ENV = "production";
  process.env.APP_URL = "https://files.example.test/";

  const sent: { html?: string } = {};
  const restoreTransport = Object.assign(
    () => ({
      sendMail: async (message: { html?: string }) => {
        sent.html = message.html;
      },
    }),
    {}
  );
  const originalCreateTransport = nodemailer.createTransport;
  (nodemailer as any).createTransport = restoreTransport;
  const originalGetValue = ConfigService.prototype.getValue;
  ConfigService.prototype.getValue = async (key: string) =>
    ({
      smtpEnabled: "true",
      smtpPort: "2525",
      smtpHost: "localhost",
      smtpNoAuth: "true",
      smtpFromName: "Amfora",
      smtpFromEmail: "noreply@example.test",
      appName: "Amfora",
    })[key] || "";

  try {
    await new EmailService().sendPasswordResetEmail(
      "user@example.test",
      "synthetic-reset-token",
      "https://attacker.example.invalid"
    );
    assert.match(sent.html || "", /https:\/\/files\.example\.test\/reset-password\?token=/);
    assert.doesNotMatch(sent.html || "", /attacker\.example\.invalid/);
  } finally {
    (nodemailer as any).createTransport = originalCreateTransport;
    ConfigService.prototype.getValue = originalGetValue;
    restoreEnvironment();
  }
});

test("production password reset email rejects a missing application URL", async () => {
  process.env.NODE_ENV = "production";
  delete process.env.APP_URL;

  const originalGetValue = ConfigService.prototype.getValue;
  ConfigService.prototype.getValue = async (key: string) =>
    ({ smtpEnabled: "true", smtpPort: "2525", smtpHost: "localhost", smtpNoAuth: "true" })[key] || "";

  try {
    await assert.rejects(
      () =>
        new EmailService().sendPasswordResetEmail(
          "user@example.test",
          "synthetic-reset-token",
          "https://attacker.example.invalid"
        ),
      /APP_URL/
    );
  } finally {
    ConfigService.prototype.getValue = originalGetValue;
    restoreEnvironment();
  }
});
