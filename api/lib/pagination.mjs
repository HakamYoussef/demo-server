export function pagination(query) {
  const limit = query.limit === undefined ? 1000 : Number(query.limit);
  const page = query.page === undefined ? 1 : Number(query.page);
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000 || !Number.isInteger(page) || page < 1 || page > 10000) throw Object.assign(new Error("Invalid pagination"), { status: 400 });
  return { limit, skip: (page - 1) * limit };
}
