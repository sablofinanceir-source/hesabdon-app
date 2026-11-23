export const sendOk = (res, data = null, meta, status = 200) =>
  res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });

export const sendCreated = (res, data) => sendOk(res, data, undefined, 201);
