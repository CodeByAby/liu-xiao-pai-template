import { docsI18n } from "@/lib/docs-i18n";
import { docsI18nUI, getDocsBaseOptions } from "@/lib/docs-ui";

describe("docs UI config", () => {
  it("supports English and Chinese docs locales", () => {
    expect(docsI18n.defaultLanguage).toBe("en");
    expect(docsI18n.languages).toEqual(["en", "zh"]);
    expect(docsI18n.hideLocale).toBe("default-locale");
  });

  it("builds locale-aware navigation urls", () => {
    expect(getDocsBaseOptions("en").nav?.url).toBe("/docs");
    expect(getDocsBaseOptions("zh").nav?.url).toBe("/zh/docs");
  });

  it("provides localized labels for the docs UI", () => {
    const zhProvider = docsI18nUI.provider("zh");
    const enProvider = docsI18nUI.provider("en");

    expect(zhProvider.locale).toBe("zh");
    expect(zhProvider.translations?.search).toBe("搜索文档");
    expect(enProvider.locale).toBe("en");
    expect(enProvider.translations?.search).toBe("Search docs");
    expect(zhProvider.locales?.map((item) => item.locale)).toEqual(["en", "zh"]);
  });
});
