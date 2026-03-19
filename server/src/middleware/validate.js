function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`);
      return res.status(400).json({ error: "Dados inválidos", details: errors });
    }
    req.validated = result.data;
    next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({ error: "Parâmetros inválidos" });
    }
    req.validatedQuery = result.data;
    next();
  };
}

module.exports = { validate, validateQuery };
