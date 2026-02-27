export class HealthController {
  async check() {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
    };
  }
}
