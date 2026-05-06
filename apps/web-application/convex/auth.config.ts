function getEnv(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

export default {
  providers: [
    {
      domain: getEnv("CONVEX_SITE_URL"),
      applicationID: "convex",
    },
  ],
};
