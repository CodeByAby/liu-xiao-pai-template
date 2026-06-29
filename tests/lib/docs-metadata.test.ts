import { getDocsDescription, getDocsMetadata, getDocsPath } from "@/lib/docs-metadata";

describe("docs metadata helpers", () => {
  it("builds locale-aware docs paths with as-needed default locale urls", () => {
    expect(getDocsPath("en")).toBe("/docs");
    expect(getDocsPath("zh")).toBe("/zh/docs");
    expect(getDocsPath("en", ["quickstart"])).toBe("/docs/quickstart");
    expect(getDocsPath("zh", ["quickstart"])).toBe("/zh/docs/quickstart");
  });

  it("falls back to a localized description when a page omits one", () => {
    expect(getDocsDescription("en", "Quickstart")).toBe(
      "Quickstart documentation from Sistine Docs.",
    );
    expect(getDocsDescription("zh", "快速开始")).toBe(
      "快速开始 的使用文档，来自 Sistine Docs。",
    );
  });

  it("returns canonical and alternate metadata for localized docs pages", () => {
    const metadata = getDocsMetadata({
      locale: "zh",
      slug: ["quickstart"],
      title: "快速开始",
    });

    expect(metadata.title).toBe("快速开始 | Sistine Docs");
    expect(metadata.description).toBe("快速开始 的使用文档，来自 Sistine Docs。");
    expect(metadata.alternates?.canonical).toBe("http://localhost:3000/zh/docs/quickstart");
    expect(metadata.alternates?.languages).toEqual({
      en: "http://localhost:3000/docs/quickstart",
      zh: "http://localhost:3000/zh/docs/quickstart",
    });
    expect(metadata.openGraph).toMatchObject({
      title: "快速开始 | Sistine Docs",
      locale: "zh_CN",
      url: "http://localhost:3000/zh/docs/quickstart",
    });
  });
});
