import type { NextApiRequest, NextApiResponse } from "next";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const brand = clean(req.body?.brand, 80);
    const model = clean(req.body?.model, 120);
    const notes = clean(req.body?.notes, 1000);
    const customerName = clean(req.body?.customerName, 120);
    const customerEmail = clean(req.body?.customerEmail, 160).toLowerCase();
    const customerPhone = clean(req.body?.customerPhone, 30);
    const customer = await optionalCustomer(req);

    if (!brand || !model || !customerName || (!customerEmail && !customerPhone)) {
      return res.status(400).json({ error: "Informe marca, modelo, seu nome e pelo menos um meio de contato." });
    }

    await getAdminDb().collection("demandSuggestions").add({
      brand,
      model,
      notes,
      customerId: customer?.uid || "",
      customerName,
      customerEmail: customerEmail || customer?.email || "",
      customerPhone,
      status: "Pendente",
      createdAt: FieldValue.serverTimestamp()
    });

    return res.status(201).json({ message: "Sugestão enviada. Ela ficará disponível para análise da loja." });
  } catch (error) {
    console.error("Failed to create demand suggestion", error);
    return res.status(500).json({ error: "Não foi possível enviar sua sugestão agora." });
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
