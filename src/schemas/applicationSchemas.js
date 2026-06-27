const { z } = require('zod');

const uuid = z.string().uuid();
const queryBoolean = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const applicationIdParamsSchema = z.object({
  applicationId: uuid,
});

const createApplicationSchema = z.object({
  name: z.string().trim().min(1).max(150),
  code: z.string().trim().min(1).max(80).toUpperCase(),
  isActive: z.boolean().optional().default(true),
});

const updateApplicationSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    code: z.string().trim().min(1).max(80).toUpperCase().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar.',
  });

const listApplicationsSchema = z.object({
  q: z.string().trim().min(1).max(150).optional(),
  isActive: queryBoolean.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

module.exports = {
  applicationIdParamsSchema,
  createApplicationSchema,
  updateApplicationSchema,
  listApplicationsSchema,
};
