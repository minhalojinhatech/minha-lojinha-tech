import type { NextApiRequest, NextApiResponse } from "next";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";

const ownerEmail = "minhalojinhatech@gmail.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(readBearerToken(req));
    if (decoded.email?.toLowerCase() !== ownerEmail) {
      return res.status(403).json({ error: "Acesso não autorizado." });
    }

    const suggestionId = clean(req.body?.suggestionId, 120);
    const action = req.body?.action === "reject" ? "reject" : "approve";
    if (!suggestionId) return res.status(400).json({ error: "Sugestão não informada." });

    const db = getAdminDb();
    const suggestionRef = db.collection("demandSuggestions").doc(suggestionId);
    const suggestionSnapshot = await suggestionRef.get();
    if (!suggestionSnapshot.exists) return res.status(404).json({ error: "Sugestão não encontrada." });

    const suggestion = suggestionSnapshot.data() || {};
    if (suggestion.status !== "Pendente") {
      return res.status(200).json({
        modelId: String(suggestion.approvedModelId || ""),
        message: suggestion.status === "Aprovada" ? "Esta sugestão já estava aprovada." : "Esta sugestão já estava arquivada."
      });
    }

    if (action === "reject") {
      await suggestionRef.update({
        status: "Rejeitada",
        updatedAt: FieldValue.serverTimestamp()
      });
      return res.status(200).json({ message: "Sugestão arquivada." });
    }

    const brand = clean(suggestion.brand, 80);
    const model = clean(suggestion.model, 120);
    const baseId = slugify(`${brand}-${model}`) || `modelo-${suggestionId.slice(0, 8)}`;
    const baseRef = db.collection("demandModels").doc(baseId);
    const baseSnapshot = await baseRef.get();
    const sameModel = baseSnapshot.exists
      && clean(baseSnapshot.data()?.brand, 80).toLowerCase() === brand.toLowerCase()
      && clean(baseSnapshot.data()?.name, 120).toLowerCase() === model.toLowerCase();
    const modelId = !baseSnapshot.exists || sameModel ? baseId : `${baseId}-${suggestionId.slice(0, 8)}`;
    const modelRef = db.collection("demandModels").doc(modelId);

    await db.runTransaction(async (transaction) => {
      const currentSuggestion = await transaction.get(suggestionRef);
      if (!currentSuggestion.exists || currentSuggestion.data()?.status !== "Pendente") return;
      const currentModel = await transaction.get(modelRef);

      if (!currentModel.exists) {
        transaction.create(modelRef, {
          id: modelId,
          name: model,
          brand,
          summary: clean(suggestion.notes, 1000) || "Modelo sugerido pela comunidade e disponível para demonstrações de interesse.",
          image: "/logo-loja.png",
          gallery: ["/logo-loja.png"],
          screen: "",
          processor: "",
          memory: "",
          storage: "",
          battery: "",
          operatingSystem: "",
          interestCount: 0,
          active: true,
          featured: false,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });
      }

      transaction.update(suggestionRef, {
        status: "Aprovada",
        approvedModelId: modelId,
        updatedAt: FieldValue.serverTimestamp()
      });
    });

    return res.status(200).json({
      modelId,
      message: "Sugestão aprovada. O modelo já aparece na página pública e pode ser editado."
    });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return res.status(401).json({ error: "Entre novamente no painel." });
    }
    console.error("Failed to manage demand suggestion", error);
    return res.status(500).json({ error: "Não foi possível atualizar a sugestão agora." });
  }
}

function readBearerToken(req: NextApiRequest) {
  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) throw new Error("AUTH_REQUIRED");
  return authorization.slice(7);
}

function clean(value: unknown, max: number) {
  return String(value || "").trim().slice(0, max);
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
