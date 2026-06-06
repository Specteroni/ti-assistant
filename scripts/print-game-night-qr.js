const QRCode = require("qrcode");

const url = process.argv[2];

if (!url) {
  process.exit(0);
}

QRCode.toString(
  url,
  {
    type: "terminal",
    small: true,
  },
  (error, qrCode) => {
    if (error) {
      console.log("Could not generate QR code.");
      return;
    }

    console.log("Scan this QR code to join:");
    console.log("");
    console.log(qrCode);
  },
);
