import { PRODUCTS } from "../../lib/constants";
import ProductClient from "./client";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ product: p.slug }));
}

export default async function ProductPage({ params }: { params: Promise<{ product: string }> }) {
  const { product } = await params;
  return <ProductClient product={product} />;
}
