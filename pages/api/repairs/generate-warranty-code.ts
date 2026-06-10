import { randomBytes } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";

const OWNER_EMAIL = "minhalojinhatech@gmail.com";
const WARRANTY_DAYS = 90;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(readBearerToken(req));
    if (decoded.email?.toLowerCase() !== OWNER_EMAIL) {
      return res.status(403).json({ error: "Acesso não autorizado." });
    }

    const repairId = String(req.body?.repairId || "");
    if (!repairId) return res.status(400).json({ error: "Reparo não informado." });

    const db = getAdminDb();
    const repairRef = db.collection("repairs").doc(repairId);
    const repairSnapshot = await repairRef.get();
    if (!repairSnapshot.exists) return res.status(404).json({ error: "Reparo não encontrado." });

    const repair = repairSnapshot.data() || {};
    if (!repair.externalDevice || !repair.warrantyEligible) {
      return res.status(409).json({ error: "Este reparo não usa a garantia de assistência externa." });
    }
    if (!["Entregue", "Finalizado"].includes(String(repair.status || ""))) {
      return res.status(409).json({ error: "Finalize ou entregue o reparo antes de gerar a garantia." });
    }
    if (repair.agreementStatus !== "Assinado") {
      return res.status(409).json({ error: "O cliente precisa assinar o termo deste reparo antes da garantia ser gerada." });
    }
    if (!repair.customerId) return res.status(409).json({ error: "Selecione uma conta de cliente para este reparo." });
    if (repair.warrantyCode) {
      return res.status(200).json({ code: repair.warrantyCode, reused: true });
    }

    const customerSnapshot = await db.collection("users").doc(String(repair.customerId)).get();
    if (!customerSnapshot.exists) return res.status(409).json({ error: "A conta selecionada não existe mais." });
    const customer = customerSnapshot.data() || {};
    const email = normalizeEmail(customer.email);
    const phone = normalizePhone(customer.phone);
    if (!email || phone.length < 10) {
      return res.status(409).json({ error: "O cliente precisa ter e-mail e telefone válidos cadastrados na conta." });
    }

    const code = await createAvailableCode();
    const codeId = normalizeCode(code);
    const finishedAt = repair.finishedAt?.toDate?.() || new Date();
    const expiresAt = new Date(finishedAt.getTime() + WARRANTY_DAYS * 24 * 60 * 60 * 1000);

    await db.runTransaction(async (transaction) => {
      const freshRepair = await transaction.get(repairRef);
      if (freshRepair.data()?.warrantyCode) throw new Error("CODE_ALREADY_CREATED");

      transaction.create(db.collection("repairWarrantyCodes").doc(codeId), {
        code,
        repairId,
        customerId: repair.customerId,
        customerEmailNormalized: email,
        customerPhoneNormalized: phone,
        status: "Disponível",
        warrantyDays: WARRANTY_DAYS,
        startsAt: Timestamp.fromDate(finishedAt),
        expiresAt: Timestamp.fromDate(expiresAt),
        createdAt: FieldValue.serverTimestamp()
      });
      transaction.update(repairRef, {
        warrantyCode: code,
        warrantyCodeStatus: "Disponível",
        finishedAt: repair.finishedAt || Timestamp.fromDate(finishedAt),
        warrantyExpiresAt: Timestamp.fromDate(expiresAt),
        updatedAt: FieldValue.serverTimestamp()
      });
    });

    return res.status(201).json({ code });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "FIREBASE_ADMIN_NOT_CONFIGURED" || message === "FIREBASE_ADMIN_INVALID_CREDENTIAL") {
      console.error("Firebase Admin configuration error while generating warranty", error);
      return res.status(503).json({ error: "A assistência ainda não está conectada ao servidor. Reinicie o servidor após configurar o Firebase Admin." });
    }
    if (error instanceof Error && error.message === "CODE_ALREADY_CREATED") {
      return res.status(409).json({ error: "O código deste reparo acabou de ser gerado. Atualize a página." });
    }
    console.error("Failed to generate repair warranty code", error);
    return res.status(500).json({ error: "Não foi possível gerar o código agora." });
  }
}

async function createAvailableCode() {
  const db = getAdminDb();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const raw = randomBytes(5).toString("hex").toUpperCase();
    const code = `GAR-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
    const snapshot = await db.collection("repairWarrantyCodes").doc(normalizeCode(code)).get();
    if (!snapshot.exists) return code;
  }
  throw new Error("CODE_GENERATION_FAILED");
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
