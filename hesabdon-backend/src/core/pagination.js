export async function paginate(Model, filter, { page = 1, limit = 20, sort = { createdAt: -1 }, populate, select } = {}) {
  const q = Model.find(filter).sort(sort).skip((page - 1) * limit).limit(limit);
  if (select) q.select(select);
  if (populate) q.populate(populate);
  const [items, total] = await Promise.all([q.lean(), Model.countDocuments(filter)]);
  return { items, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
}
