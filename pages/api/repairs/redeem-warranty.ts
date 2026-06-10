import type { NextApiRequest, NextApiResponse } from "next";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(readBearerToken(req));
    const normalizedCode = normalizeCode(String(req.body?.code || ""));
    if (normalizedCode.length < 10) return res.status(400).json({ error: "Digite um código de garantia válido." });

    const db = getAdminDb();
    const customerRef = db.collection("users").doc(decoded.uid);
    const codeRef = db.collection("repairWarrantyCodes").doc(normalizedCode);

    const warrantyId = await db.runTransaction(async (transaction) => {
      const [customerSnapshot, codeSnapshot] = await Promise.all([
        transaction.get(customerRef),
        transaction.get(codeRef)
      ]);

      if (!customerSnapshot.exists) throw new Error("PROFILE_NOT_FOUND");
      if (!codeSnapshot.exists) throw new Error("CODE_NOT_FOUND");

      const customer = customerSnapshot.data() || {};
      const code = codeSnapshot.data() || {};
      if (code.status !== "Disponível") throw new Error("CODE_USED");
      if (code.customerId !== decoded.uid) throw new Error("WRONG_ACCOUNT");
      if (normalizeEmail(customer.email || decoded.email) !== code.customerEmailNormalized) throw new Error("ACCOUNT_MISMATCH");
      if (normalizePhone(customer.phone).length < 10) throw new Error("PHONE_REQUIRED");
      if (normalizePhone(customer.phone) !== code.customerPhoneNormalized) throw new Error("ACCOUNT_MISMATCH");

      const repairRef = db.collection("repairs").doc(String(code.repairId || ""));
      const repairSnapshot = await transaction.get(repairRef);
      if (!repairSnapshot.exists) throw new Error("REPAIR_NOT_FOUND");
      const repair = repairSnapshot.data() || {};

      const warrantyRef = db.collection("repairWarranties").doc(repairSnapshot.id);
      const existingWarranty = await transaction.get(warrantyRef);
      if (existingWarranty.exists) throw new Error("CODE_USED");

      transaction.create(warrantyRef, {
        repairId: repairSnapshot.id,
        repairCode: repair.code || `REP-${repairSnapshot.id.slice(0, 6).toUpperCase()}`,
        customerId: decoded.uid,
        customerName: repair.customerName || customer.fullName || customer.displayName || "",
        device: repair.device || "Dispositivo não informado",
        brand: repair.brand || "",
        model: repair.model || "",
        serialNumber: repair.serialNumber || "",
        deviceKey: repair.deviceKey || buildDeviceKey(repair),
        issue: repair.issue || "",
        diagnosis: repair.diagnosis || "",
        servicePerformed: repair.servicePerformed || "Serviço realizado",
        parts: repair.parts || "",
        startsAt: code.startsAt,
        expiresAt: code.expiresAt,
        activatedAt: FieldValue.serverTimestamp(),
        status: "Ativa"
      });
      transaction.update(codeRef, {
        status: "Utilizado",
        redeemedAt: FieldValue.serverTimestamp(),
        redeemedByUid: decoded.uid
      });
      transaction.update(repairRef, {
        warrantyCodeStatus: "Utilizado",
        warrantyActivatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      return warrantyRef.id;
    });

    return res.status(201).json({ warrantyId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "FIREBASE_ADMIN_NOT_CONFIGURED" || message === "FIREBASE_ADMIN_INVALID_CREDENTIAL") {
      console.error("Firebase Admin configuration error while redeeming warranty", error);
      return res.status(503).json({ error: "A garantia ainda não está conectada ao servidor. Reinicie o servidor após configurar o Firebase Admin." });
    }
    if (message === "PROFILE_NOT_FOUND") return res.status(409).json({ error: "Complete seu perfil antes de ativar a garantia." });
    if (message === "PHONE_REQUIRED") return res.status(409).json({ error: "Cadastre seu telefone na conta antes de ativar a garantia." });
    if (message === "CODE_NOT_FOUND") return res.status(404).json({ error: "Código não encontrado. Confira e tente novamente." });
    if (message === "CODE_USED") return res.status(409).json({ error: "Este código já foi utilizado." });
    if (message === "WRONG_ACCOUNT" || message === "ACCOUNT_MISMATCH") {
      return res.status(403).json({ error: "Este código pertence a outra conta ou os dados de contato não correspondem." });
    }
    if (message === "REPAIR_NOT_FOUND") return res.status(404).json({ error: "O reparo vinculado a este código não foi encontrado." });
    console.error("Failed to redeem repair warranty", error);
    return res.status(500).json({ error: "Não foi possível ativar a garantia agora." });
  }
}

function readBearerToken(req: NextApiRequest) {
  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) throw new Error("INVALID_AUTH_TOKEN");
  return authorization.slice(7);
}

function normalizeCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function buildDeviceKey(repair: Record<string, unknown>) {
  const serial = String(repair.serialNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (serial) return `serial:${serial}`;
  return `device:${[repair.brand, repair.model, repair.device].filter(Boolean).join(" ").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}
