import { AlertCircle, Check, LoaderCircle } from "lucide-react";

export type ActionButtonState = "idle" | "loading" | "success" | "error";

export function ActionButtonContent({
  state,
  idleLabel,
  loadingLabel,
  successLabel,
  errorLabel = "Tentar novamente",
  idleIcon
}: {
  state: ActionButtonState;
  idleLabel: string;
  loadingLabel: string;
  successLabel: string;
  errorLabel?: string;
  idleIcon?: React.ReactNode;
}) {
  if (state === "loading") return <><LoaderCircle className="action-button__spinner" size={19} />{loadingLabel}</>;
  if (state === "success") return <><span className="action-button__status is-success"><Check size={14} /></span>{successLabel}</>;
  if (state === "error") return <><span className="action-button__status is-error"><AlertCircle size={14} /></span>{errorLabel}</>;
  return <>{idleIcon}{idleLabel}</>;
}
