import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Seo } from "@/components/seo/Seo";

export const LEGAL_LAST_UPDATE = "20 de octubre de 2026";

export function LegalPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const { pathname } = useLocation();
  return (
    <article className="mx-auto max-w-3xl py-6">
      <Seo title={title} description={description} path={pathname} />
      <h1 className="font-display text-3xl text-text">{title}</h1>
      <p className="mt-1 text-xs text-text-muted">Última actualización: {LEGAL_LAST_UPDATE}</p>
      <div className="mt-8 flex flex-col gap-8">{children}</div>
    </article>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 text-sm leading-relaxed text-text-muted">
      <h2 className="font-display text-lg text-text">{title}</h2>
      {children}
    </section>
  );
}
