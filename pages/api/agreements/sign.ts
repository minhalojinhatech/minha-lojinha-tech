import { createHash } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { FieldValue } from "firebase-admin/firestore";
import { agreementContent, agreementVersions, type AgreementType } from "@/lib/agreementTerms";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";

type SignPayload = {
  type?: AgreementType;
  resourceId?: string;
  fullName?: string;
  cpf?: string;
  signature?: string;
  observations?: string;
  confirmations?: boolean[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(readBearerToken(req));
    const payload = req.body as SignPayload;
    validatePayload(payload);

    const type = payload.type!;
    const resourceId = String(payload.resourceId);
    const fullName = cleanText(payload.fullName, 120);
    const cpf = onlyDigits(payload.cpf);
    const signature = cleanText(payload.signature, 120);
    const observations = cleanText(payload.observations, 1000);
    const expectedConfirmations = agreementContent[type].confirmations.length;

    if (!isValidCpf(cpf)) return res.status(400).json({ error: "Digite um CPF válido." });
    if (normalizeName(fullName) !== normalizeName(signature)) {
      return res.status(400).json({ error: "A assinatura digitada precisa ser igual ao nome completo." });
    }
    if (payload.confirmations?.length !== expectedConfirmations || payload.confirmations.some((value) => value !== true)) {
      return res.status(400).json({ error: "Confirme todas as declarações para assinar." });
    }

    const db = getAdminDb();
    const collectionName = type === "sale" ? "orders" : "repairs";
    const resourceRef = db.collection(collectionName).doc(resourceId);
    const resourceSnapshot = await resourceRef.get();
    if (!resourceSnapshot.exists) return res.status(404).json({ error: type === "sale" ? "Pedido não encontrado." : "Reparo não encontrado." });

    const resource = resourceSnapshot.data() || {};
    if (resource.customerId !== decoded.uid) return res.status(403).json({ error: "Este termo pertence a outra conta." });
    if (resource.agreementStatus === "Assinado") return res.status(409).json({ error: "Este termo já foi assinado." });
    if (type === "repair" && !String(resource.servicePerformed || "").trim()) {
      return res.status(409).json({ error: "A loja ainda precisa registrar o serviço previsto antes da assinatura." });
    }

    const resourceData = type === "sale"
      ? await buildSaleSnapshot(resourceId, resource)
      : buildRepairSnapshot(resourceId, resource);
    const resourceCode = type === "sale"
      ? String(resource.orderCode || resource.code || "")
      : String(resource.code || "");
    const terms = agreementContent[type];
    const version = agreementVersions[type];
    const signedAtIso = new Date().toISOString();
    const canonicalDocument = {
      type,
      version,
      terms,
      resource: resourceData,
      signer: {
        customerId: decoded.uid,
        email: decoded.email || resource.customerEmail || resource.customer?.email || "",
        fullName,
        cpf,
        signature,
        observations
      },
      signedAtIso
    };
    const documentHash = createHash("sha256").update(stableStringify(canonicalDocument)).digest("hex");
    const agreementRef = db.collection("agreements").doc(`${type}_${resourceId}`);
    const ipHash = hashEvidence(readClientIp(req));
    const userAgent = String(req.headers["user-agent"] || "").slice(0, 500);

    await db.runTransaction(async (transaction) => {
      const [freshResource, existingAgreement] = await Promise.all([
        transaction.get(resourceRef),
        transaction.get(agreementRef)
      ]);
      if (!freshResource.exists) throw new Error("RESOURCE_NOT_FOUND");
      if (freshResource.data()?.customerId !== decoded.uid) throw new Error("WRONG_ACCOUNT");
      if (existingAgreement.exists || freshResource.data()?.agreementStatus === "Assinado") throw new Error("ALREADY_SIGNED");

      transaction.create(agreementRef, {
        ...canonicalDocument,
        customerId: decoded.uid,
        resourceId,
        resourceCode,
        title: terms.title,
        confirmations: [...terms.confirmations],
        documentHash,
        evidence: {
          authentication: "Firebase Authentication",
          ipHash,
          userAgent
        },
        signedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp()
      });
      transaction.update(resourceRef, {
        agreementStatus: "Assinado",
        agreementId: agreementRef.id,
        agreementVersion: version,
        agreementDocumentHash: documentHash,
        agreementSignedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    });

    return res.status(201).json({
      agreementId: agreementRef.id,
      documentHash,
      signedAt: signedAtIso
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: string }).code || "") : "";
    if (message === "FIREBASE_ADMIN_NOT_CONFIGURED" || message === "FIREBASE_ADMIN_INVALID_CREDENTIAL") {
      console.error("Firebase Admin configuration error while signing agreement", error);
      return res.status(503).json({
        error: "A assinatura ainda não está conectada ao servidor. Reinicie o servidor local após configurar o Firebase Admin."
      });
    }
    if (message === "INVALID_AUTH_TOKEN" || code.startsWith("auth/")) return res.status(401).json({ error: "Entre novamente na sua conta." });
    if (message === "INVALID_PAYLOAD") return res.status(400).json({ error: "Revise os dados do termo." });
    if (message === "ALREADY_SIGNED") return res.status(409).json({ error: "Este termo já foi assinado." });
    if (message === "WRONG_ACCOUNT") return res.status(403).json({ error: "Este termo pertence a outra conta." });
    if (message === "RESOURCE_NOT_FOUND") return res.status(404).json({ error: "O registro vinculado ao termo não foi encontrado." });
    console.error("Failed to sign agreement", error);
    return res.status(500).json({ error: "Não foi possível registrar a assinatura agora." });
  }
}

async function buildSaleSnapshot(orderId: string, order: FirebaseFirestore.DocumentData) {
  const items = Array.isArray(order.items) ? order.items : [];
  const productRefs = items.filter((item) => item?.productId).map((item) => getAdminDb().collection("products").doc(String(item.productId)));
  const productSnapshots = productRefs.length ? await getAdminDb().getAll(...productRefs) : [];
  const products = new Map(productSnapshots.map((snapshot) => [snapshot.id, snapshot.data() || {}]));

  return {
    orderId,
    orderCode: String(order.orderCode || order.code || ""),
    customer: {
      name: String(order.customer?.name || ""),
      email: String(order.customer?.email || ""),
      phone: String(order.customer?.phone || "")
    },
    items: items.map((item) => {
      const product = products.get(String(item.productId || "")) || {};
      return {
        productId: String(item.productId || ""),
        name: String(item.name || product.name || "Produto"),
        quantity: Number(item.quantity || 1),
        price: Number(item.price || product.price || 0),
        brand: String(product.brand || ""),
        model: String(product.model || product.name || ""),
        condition: String(product.condition || ""),
        storage: String(product.storage || ""),
        color: String(product.color || ""),
        warranty: String(product.warranty || ""),
        conservation: String(product.conservation || ""),
        batteryHealth: String(product.batteryHealth || ""),
        included: Array.isArray(product.included) ? product.included.map(String) : [],
        notes: String(product.notes || "")
      };
    }),
    subtotal: Number(order.subtotal || order.total || 0),
    discount: Number(order.discount || 0),
    total: Number(order.total || 0),
    paymentMethod: String(order.paymentMethod || ""),
    deliveryMethod: String(order.deliveryMethod || ""),
    deliveryAddress: String(order.deliveryAddress || ""),
    createdAt: timestampToIso(order.createdAt)
  };
}

function buildRepairSnapshot(repairId: string, repair: FirebaseFirestore.DocumentData) {
  return {
    repairId,
    repairCode: String(repair.code || ""),
    customer: {
      name: String(repair.customerName || ""),
      email: String(repair.customerEmail || ""),
      phone: String(repair.customerPhone || "")
    },
    device: String(repair.device || ""),
    brand: String(repair.brand || ""),
    model: String(repair.model || ""),
    serialNumber: String(repair.serialNumber || ""),
    issue: String(repair.issue || ""),
    diagnosis: String(repair.diagnosis || ""),
    servicePerformed: String(repair.servicePerformed || ""),
    parts: String(repair.parts || ""),
    status: String(repair.status || ""),
    externalDevice: Boolean(repair.externalDevice),
    warrantyDays: repair.externalDevice ? 90 : null,
    createdAt: timestampToIso(repair.createdAt),
    finishedAt: timestampToIso(repair.finishedAt)
  };
}

function validatePayload(payload: SignPayload) {
  if (
    !["sale", "repair"].includes(String(payload.type)) ||
    !payload.resourceId ||
    !payload.fullName ||
    !payload.cpf ||
    !payload.signature ||
    !Array.isArray(payload.confirmations)
  ) {
    throw new Error("INVALID_PAYLOAD");
  }
}

function readBearerToken(req: NextApiRequest) {
  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) throw new Error("INVALID_AUTH_TOKEN");
  return authorization.slice(7);
}

function readClientIp(req: NextApiRequest) {
  const forwarded = req.headers["x-forwarded-for"];
  if (Array.isArray(forwarded)) return forwarded[0] || "";
  return String(forwarded || req.socket.remoteAddress || "").split(",")[0].trim();
}

function hashEvidence(value: string) {
  return createHash("sha256")
    .update(`${process.env.AGREEMENT_EVIDENCE_SALT || process.env.FIREBASE_ADMIN_PROJECT_ID || "minhalojinhatech"}:${value}`)
    .digest("hex");
}

function cleanText(value: unknown, maxLength: number) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function onlyDigits(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
}

function isValidCpf(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1+$/.test(cpf)) return false;
  const calculate = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) sum += Number(cpf[index]) * (length + 1 - index);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return calculate(9) === Number(cpf[9]) && calculate(10) === Number(cpf[10]);
}

function timestampToIso(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return value ? String(value) : "";
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
