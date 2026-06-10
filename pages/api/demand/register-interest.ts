import { createHash } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const customer = await optionalCustomer(req);
    const modelId = clean(req.query.modelId, 100);
    const intent = req.query.intent === "updates" ? "updates" : "interest";
    if (!customer || !modelId) return res.status(200).json({ registered: false });
    const interestId = createHash("sha256").update(`${modelId}:${intent}:${customer.uid}`).digest("hex").slice(0, 40);
    const snapshot = await getAdminDb().collection("demandInterests").doc(interestId).get();
    return res.status(200).json({ registered: snapshot.exists });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const modelId = clean(req.body?.modelId, 100);
    const customerName = clean(req.body?.customerName, 120);
    const customerEmail = clean(req.body?.customerEmail, 160).toLowerCase();
    const customerPhone = clean(req.body?.customerPhone, 30);
    const intent = req.body?.intent === "updates" ? "updates" : "interest";
    const customer = await optionalCustomer(req);

    if (!modelId || !customerName || (!customerEmail && !customerPhone)) {
      return res.status(400).json({ error: "Informe seu nome e pelo menos um meio de contato." });
    }

    const db = getAdminDb();
    const modelRef = db.collection("demandModels").doc(modelId);
    const contactKey = customer?.uid || customerEmail || customerPhone.replace(/\D/g, "");
    const interestId = createHash("sha256").update(`${modelId}:${intent}:${contactKey}`).digest("hex").slice(0, 40);
    const interestRef = db.collection("demandInterests").doc(interestId);
    let created = false;

    await db.runTransaction(async (transaction) => {
      const [modelSnapshot, interestSnapshot] = await Promise.all([
        transaction.get(modelRef),
        transaction.get(interestRef)
      ]);
      if (!modelSnapshot.exists || modelSnapshot.data()?.active === false) throw new Error("MODEL_NOT_FOUND");
      if (interestSnapshot.exists) return;

      created = true;
      transaction.create(interestRef, {
        modelId,
        modelName: String(modelSnapshot.data()?.name || ""),
        intent,
        customerId: customer?.uid || "",
        customerName,
        customerEmail: customerEmail || customer?.email || "",
        customerPhone,
        createdAt: FieldValue.serverTimestamp()
      });
      if (intent === "interest") {
        transaction.update(modelRef, {
          interestCount: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp()
        });
      }
    });

    return res.status(created ? 201 : 200).json({
      created,
      message: created ? "Interesse registrado. A loja poderá entrar em contato quando encontrar uma boa oportunidade." : "Seu interesse neste modelo já estava registrado."
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MODEL_NOT_FOUND") {
      return res.status(404).json({ error: "Este modelo não está mais disponível na lista de interesse." });
    }
    console.error("Failed to register demand interest", error);
    return res.status(500).json({ error: "Não foi possível registrar seu interesse agora." });
  }
}

async function optionalCustomer(req: NextApiRequest) {
  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) return null;
  try {
    return await getAdminAuth().verifyIdToken(authorization.slice(7));
  } catch {
    return null;
  }
}

function clean(value: unknown, max: number) {
  return String(value || "").trim().slice(0, max);
}
