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
      <h1 className="font-display text-4xl text-text sm:text-5xl">{title}</h1>
      <p className="mt-2 text-base text-text-muted">Última actualización: {LEGAL_LAST_UPDATE}</p>
      <div className="mt-10 flex flex-col gap-10">{children}</div>
    </article>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 text-lg leading-relaxed text-text-muted">
      <h2 className="font-display text-2xl text-text">{title}</h2>
      {children}
    </section>
  );
}
