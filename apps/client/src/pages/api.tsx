import DefaultLayout from "@/layouts/default";
import { OpenAPI } from "@/components/openapi";

export default function ApiPage() {
  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <OpenAPI />
      </section>
    </DefaultLayout>
  );
}
