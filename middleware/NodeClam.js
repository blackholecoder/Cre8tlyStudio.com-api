import NodeClam from "clamscan";
import fs from "fs";

export async function scanUploadedFile(filePath) {
  const clamscan = await new NodeClam().init({
    removeInfected: true, // auto-delete if infected
    quarantineInfected: false,
    clamdscan: { socket: "/var/run/clamav/clamd.ctl" },
  });

  const { isInfected, viruses } = await clamscan.isInfected(filePath);

  if (isInfected) {
    console.warn("⚠️ Infected file detected:", viruses);
    throw new Error("Malicious file detected and deleted");
  }

  // Clean file
  return true;
}
