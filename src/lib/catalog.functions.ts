import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import { getAiAssistant, type ServiceHint } from "@/lib/services/ai";

export type CatalogService = {
  id: string;
  slug: string;
  name: string;
  description: string;
  processingTimeDays: number;
  slaDays: number;
  feeCents: number;
  requiredDocuments: string[];
  icon: string;
  department: { slug: string; name: string; description: string };
};

function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

async function loadCatalog(): Promise<CatalogService[]> {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("services")
    .select(
      "id, slug, name, description, processing_time_days, sla_days, fee_cents, required_documents, icon, departments(slug, name, description)",
    )
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    processingTimeDays: row.processing_time_days,
    slaDays: row.sla_days,
    feeCents: row.fee_cents,
    requiredDocuments: row.required_documents ?? [],
    icon: row.icon,
    department: {
      slug: row.departments?.slug ?? "",
      name: row.departments?.name ?? "Government Department",
      description: row.departments?.description ?? "",
    },
  }));
}

export const getServiceCatalog = createServerFn({ method: "GET" }).handler(async () => loadCatalog());

export const askPublicaAi = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ question: z.string().trim().min(3).max(500) }).parse(input),
  )
  .handler(async ({ data }) => {
    const catalog = await loadCatalog();
    const hints: ServiceHint[] = catalog.map((service) => ({
      slug: service.slug,
      name: service.name,
      description: service.description,
      department: service.department.name,
      keywords: [service.slug.replace(/-/g, " "), ...service.requiredDocuments],
      processingTimeDays: service.processingTimeDays,
      slaDays: service.slaDays,
      feeCents: service.feeCents,
      requiredDocuments: service.requiredDocuments,
    }));
    return getAiAssistant().ask(data.question, hints);
  });
