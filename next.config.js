const allowedDevOrigins = ["127.0.0.1", "localhost"];

if (process.env.TI_LAN_IP) {
  allowedDevOrigins.push(process.env.TI_LAN_IP);
}

module.exports = {
  allowedDevOrigins,
  distDir: "build",
  // experimental: {
  //   useLightningcss: true,
  //   lightningCssFeatures: {
  //     include: [],
  //     // Never transpile these features, even if targets don't support them
  //     exclude: ["colors"],
  //   },
  // },
};
