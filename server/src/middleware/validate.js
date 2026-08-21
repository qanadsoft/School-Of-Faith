export function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const flattened = result.error.flatten();
      const firstFieldErr = Object.entries(flattened.fieldErrors)[0];
      const errorMsg = firstFieldErr
        ? `${firstFieldErr[0]}: ${firstFieldErr[1].join(", ")}`
        : result.error.issues?.[0]?.message || "Validation failed.";

      return res.status(400).json({
        message: errorMsg,
        errors: flattened,
      });
    }
    req[source] = result.data;
    next();
  };
}
