import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate";
import { logger } from "../utils/logger";

const router = Router();

const applicationSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  location: z.string().optional(),
  yearsExperience: z.string().min(1, "Years of experience is required"),
  specialties: z.string().min(2, "Specialties are required"),
  readingTypes: z.array(z.enum(["chat", "voice", "video"])).min(1, "Select at least one reading type"),
  rateRange: z.string().optional(),
  bio: z.string().min(50, "Bio must be at least 50 characters"),
  whySoulSeer: z.string().min(20, "Please tell us why you want to join"),
  socialLinks: z.string().optional(),
  agreeToTerms: z.boolean().refine((v) => v === true, "Must agree to terms"),
});

// POST /api/reader-applications — public, no auth required
router.post("/", validateBody(applicationSchema), async (req, res, next) => {
  try {
    const data = req.body;

    logger.info(
      {
        applicant: data.fullName,
        email: data.email,
        specialties: data.specialties,
        readingTypes: data.readingTypes,
        yearsExperience: data.yearsExperience,
      },
      "New reader application received"
    );

    // TODO: When an email service (SendGrid, Resend, etc.) is configured,
    // send notification to admin and confirmation to applicant here.

    res.status(201).json({
      message:
        "Application received. Our team will review it and reach out within 3–5 business days.",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
