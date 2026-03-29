import { PRODUCTS, SECTIONS } from "../../../lib/constants";
import SectionEditorClient from "./client";

export function generateStaticParams() {
  const params: { product: string; section: string }[] = [];
  for (const p of PRODUCTS) {
    for (const s of SECTIONS) {
      params.push({ product: p.slug, section: s.slug });
    }
  }
  return params;
}

export default async function SectionEditorPage({
  params,
}: {
  params: Promise<{ product: string; section: string }>;
}) {
  const { product, section } = await params;
  return <SectionEditorClient product={product} section={section} />;
}
