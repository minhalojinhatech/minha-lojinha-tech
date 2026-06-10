import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { useAuthUser } from "@/lib/useAuthUser";

export function CustomerAuthGate({ children, message = "Entre na sua conta para continuar." }: { children: ReactNode; message?: string }) {
  const { user, loading } = useAuthUser();

  if (loading) {
    return (
      <div className="auth-gate">
        <p className="text-sm text-gray-600">Verificando sua sessão...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-gate">
        <div className="auth-gate__content">
          <div className="auth-gate__heading">
            <span><LockKeyhole size={25} /></span>
            <p className="retail-eyebrow"><i /> Área protegida</p>
          </div>
          <h1>Entre na sua conta</h1>
          <p>{message}</p>
          <div className="auth-gate__actions"><Link href="/login">Entrar ou criar conta <ArrowRight size={16} /></Link><small><ShieldCheck size={15} /> Acesso protegido</small></div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
