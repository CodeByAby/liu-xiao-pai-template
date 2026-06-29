import {
  ADMIN_USERS_PAGE_SIZE,
  getAdminUsersTotalPages,
  normalizeAdminUsersDirectoryFilters,
} from "@/lib/admin-user-directory";

describe("admin user directory helpers", () => {
  it("normalizes search params into a trimmed query and safe page number", () => {
    expect(
      normalizeAdminUsersDirectoryFilters({
        query: "  alice@example.com  ",
        page: "3",
      })
    ).toEqual({
      currentPage: 3,
      pageSize: ADMIN_USERS_PAGE_SIZE,
      query: "alice@example.com",
    });
  });

  it("falls back to the first page for invalid input and array params", () => {
    expect(
      normalizeAdminUsersDirectoryFilters({
        query: ["  sistine  ", "ignored"],
        page: ["0", "2"],
      })
    ).toEqual({
      currentPage: 1,
      pageSize: ADMIN_USERS_PAGE_SIZE,
      query: "sistine",
    });
  });

  it("keeps pagination stable even when there are no users", () => {
    expect(getAdminUsersTotalPages(0)).toBe(1);
    expect(getAdminUsersTotalPages(41)).toBe(3);
  });
});
