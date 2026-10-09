const crypto = require("crypto");

function newTraceId() {
  return crypto.randomBytes(16).toString("hex");
}

function newSpanId() {
  return crypto.randomBytes(8).toString("hex");
}

function parseTraceparent(header) {
  if (!header || typeof header !== "string") return null;
  const parts = header.trim().split("-");
  if (parts.length !== 4) return null;
  const [version, traceId, parentId, flags] = parts;
  if (version !== "00") return null;
  if (!/^[0-9a-f]{32}$/i.test(traceId) || /^0+$/.test(traceId)) return null;
  if (!/^[0-9a-f]{16}$/i.test(parentId) || /^0+$/.test(parentId)) return null;
  if (!/^[0-9a-f]{2}$/i.test(flags)) return null;
  return {
    version,
    traceId: traceId.toLowerCase(),
    parentId: parentId.toLowerCase(),
    flags: flags.toLowerCase()
  };
}

function formatTraceparent({ version = "00", traceId, spanId, flags = "01" }) {
  return `${version}-${traceId}-${spanId}-${flags}`;
}

function tracingMiddleware(req, res, next) {
  const incoming = parseTraceparent(req.get("traceparent"));
  const traceId = incoming ? incoming.traceId : newTraceId();
  const flags = incoming ? incoming.flags : "01";
  const spanId = newSpanId();

  req.traceContext = {
    version: "00",
    traceId,
    spanId,
    flags,
    parentId: incoming ? incoming.parentId : null
  };

  res.setHeader(
    "traceparent",
    formatTraceparent({
      traceId,
      spanId,
      flags
    })
  );

  next();
}

function outboundTraceparent(req) {
  const ctx = req.traceContext;
  if (!ctx) {
    return formatTraceparent({
      traceId: newTraceId(),
      spanId: newSpanId(),
      flags: "01"
    });
  }
  return formatTraceparent({
    version: ctx.version,
    traceId: ctx.traceId,
    spanId: ctx.spanId,
    flags: ctx.flags
  });
}

module.exports = {
  tracingMiddleware,
  outboundTraceparent,
  formatTraceparent,
  parseTraceparent
};
