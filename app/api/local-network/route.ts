import { NextResponse } from "next/server";
import { networkInterfaces } from "os";

function getLanIp() {
  if (process.env.TI_LAN_IP) {
    return process.env.TI_LAN_IP;
  }

  const interfaces = networkInterfaces();
  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        return address.address;
      }
    }
  }
  return undefined;
}

export async function GET() {
  return NextResponse.json({ lanIp: getLanIp() });
}
